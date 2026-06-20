# Spend Clustering with OpenAI Check Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `npm run cluster -- ...` with recipient-based clustering, OpenAI-powered check recipient extraction, and interactive `-co/--cluster-other` mapping updates persisted to YAML.

**Architecture:** Keep clustering orchestration in `src/cluster/cluster-service.ts`, add focused ports/adapters for mapping persistence and check parsing, and keep terminal interactivity in CLI adapter code. Check parsing uses OpenAI Responses API through a small HTTP client with explicit env-token loading (`OPENAI_API_KEY`) from process env or `.env`. Mapping remains deterministic and git-tracked as YAML.

**Tech Stack:** Node.js 22 + TypeScript, Vitest, native `fetch`, `dotenv`, `yaml`.

## Global Constraints

- **FR-002**: Cluster command MUST support options: `-sf, --statements-folder` (default `data/statements`), `-cf, --checks-folder` (default `data/checks`), `-f, --from`, `-t, --to`, `-v, --verbose`, and `-co, --cluster-other`.
- **FR-005**: System MUST keep recipient-to-cluster mapping in a git-tracked YAML file.
- **FR-006**: Transactions with unmapped recipients MUST be assigned to cluster `other`.
- **FR-010**: `--cluster-other` mode MUST iterate unique unmapped recipients and prompt for cluster assignment with numbered cluster options.
- **FR-011**: `--cluster-other` prompt MUST show recipient (including English transliteration/translation label) and all related transactions with date-time and THB amount in human-readable format.
- **QA-002**: Cluster command behavior MUST stay in CLI/application adapter layers; parsing, mapping, and clustering logic must remain reusable and independent of terminal IO.
- **QA-003**: YAML mapping schema MUST be validated at load time with explicit errors for invalid content.

---

### Task 1: Add cluster CLI command and option parsing

**Files:**
- Modify: `package.json`
- Modify: `src/cli/main.ts`
- Modify: `src/cli/index.ts`
- Test: `src/cli/cluster-cli.contract.test.ts` (create)

**Interfaces:**
- Consumes: `runCluster(options: ClusterServiceOptions): Promise<ClusterReport>`
- Produces:
  - `runCli(argv: string[], cwd: string, io: CliIo): Promise<number>` handling `cluster`
  - `parseClusterArgs(values): { statementsFolder: string; checksFolder: string; from: string; to: string; verbose: boolean; clusterOther: boolean }`

- [ ] **Step 1: Write the failing cluster CLI contract test**

```ts
it('parses cluster aliases and routes to cluster command', async () => {
  const { code, stdout } = await runClusterCli(['cluster', '-f', '2026-06-01', '-t', '2026-06-15']);
  expect(code).toBe(0);
  expect(stdout).toContain('Cluster report');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/cli/cluster-cli.contract.test.ts -t "parses cluster aliases"`  
Expected: FAIL with `Expected command: audit` or unknown option errors.

- [ ] **Step 3: Implement minimal cluster command parsing**

```ts
const cliOptions = {
  // existing audit options...
  'statements-folder': { type: 'string', short: 'sf' },
  'checks-folder': { type: 'string', short: 'cf' },
  'cluster-other': { type: 'boolean', short: 'co' },
  verbose: { type: 'boolean', short: 'v' },
} as const;

if (command === 'cluster') {
  const clusterArgs = parseClusterArgs(values, cwd);
  const report = await runCluster(buildClusterOptions(clusterArgs, io));
  io.stdout(renderClusterReport(report));
  return 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/cli/cluster-cli.contract.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json src/cli/main.ts src/cli/index.ts src/cli/cluster-cli.contract.test.ts
git commit -m "feat(cluster): add cluster CLI command and options"
```

---

### Task 2: Implement YAML mapping load/save with schema validation

**Files:**
- Modify: `src/cluster/cluster-config.ts`
- Create: `src/cluster/cluster-config.test.ts`
- Create: `data/clusters/mapping.yml` (initial tracked mapping)

**Interfaces:**
- Consumes: mapping file path string
- Produces:
  - `loadClusterConfig(path: string): Promise<ClusterConfig>`
  - `saveClusterMapping(path: string, recipient: string, cluster: string): Promise<void>`
  - `normalizeRecipient(value: string): string`

- [ ] **Step 1: Write failing tests for YAML load/validation/save**

```ts
it('loads mappings from yaml and normalizes recipient keys', async () => {
  const config = await loadClusterConfig(fixturePath);
  expect(config.mappings['VELO CAFE']).toBe('кафе');
});

it('persists new recipient mapping', async () => {
  await saveClusterMapping(tempPath, 'Cafe New', 'кафе');
  const saved = await loadClusterConfig(tempPath);
  expect(saved.mappings['CAFE NEW']).toBe('кафе');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/cluster/cluster-config.test.ts`  
Expected: FAIL because loader returns hardcoded defaults.

- [ ] **Step 3: Implement YAML-backed config + schema checks**

```ts
export interface ClusterConfig {
  mappings: Record<string, string>;
  patterns: Array<{ pattern: string; cluster: string }>;
  clusters: string[];
}

export async function loadClusterConfig(path: string): Promise<ClusterConfig> {
  const text = await readFile(path, 'utf8');
  const parsed = yaml.parse(text);
  // validate object shape and required clusters including "other"
  return validatedConfig;
}

export async function saveClusterMapping(path: string, recipient: string, cluster: string): Promise<void> {
  const config = await loadClusterConfig(path);
  config.mappings[normalizeRecipient(recipient)] = cluster;
  await writeFile(path, yaml.stringify(config), 'utf8');
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- src/cluster/cluster-config.test.ts src/cluster/cluster-match.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cluster/cluster-config.ts src/cluster/cluster-config.test.ts data/clusters/mapping.yml package.json
git commit -m "feat(cluster): persist recipient mappings in yaml"
```

---

### Task 3: Add OpenAI check parser and env token loading

**Files:**
- Create: `src/checks/openai-check-parser.ts`
- Create: `src/checks/openai-check-parser.test.ts`
- Create: `src/checks/check-parser.ts`
- Create: `src/checks/index.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: check image file paths, env vars, optional `.env`
- Produces:
  - `interface CheckParser { parseChecks(folder: string): Promise<ParsedCheck[]> }`
  - `class OpenAiCheckParser implements CheckParser`
  - `resolveOpenAiApiKey(env: NodeJS.ProcessEnv, dotEnvPath?: string): Promise<string>`

- [ ] **Step 1: Write failing tests for env token resolution and OpenAI response parsing**

```ts
it('prefers OPENAI_API_KEY from process env', async () => {
  const key = await resolveOpenAiApiKey({ OPENAI_API_KEY: 'env-key' }, '.env.missing');
  expect(key).toBe('env-key');
});

it('loads OPENAI_API_KEY from .env when env var missing', async () => {
  const key = await resolveOpenAiApiKey({}, fixtureDotEnvPath);
  expect(key).toBe('file-key');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/checks/openai-check-parser.test.ts`  
Expected: FAIL because files/functions do not exist.

- [ ] **Step 3: Implement OpenAI client adapter**

```ts
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4.1-mini',
    input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, imagePart] }],
    text: { format: { type: 'json_schema', name: 'check_parse', schema: CHECK_SCHEMA } },
  }),
});
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- src/checks/openai-check-parser.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/checks src/index.ts package.json
git commit -m "feat(checks): add OpenAI parser with env key loading"
```

---

### Task 4: Match parsed checks to transactions and enrich recipients

**Files:**
- Create: `src/cluster/check-recipient-enrichment.ts`
- Create: `src/cluster/check-recipient-enrichment.test.ts`
- Modify: `src/cluster/cluster-service.ts`
- Modify: `src/cluster/cluster-report.ts`

**Interfaces:**
- Consumes: `ParsedCheck[]`, `Transaction[]`
- Produces:
  - `enrichRecipientsFromChecks(transactions: Transaction[], checks: ParsedCheck[]): { transactions: Transaction[]; warnings: string[] }`
  - deterministic match rule: exact amount + same date + nearest time

- [ ] **Step 1: Write failing enrichment tests**

```ts
it('uses check recipient when amount/date match uniquely', () => {
  const result = enrichRecipientsFromChecks([tx], [check]);
  expect(result.transactions[0].remitterOrBeneficiary).toBe('VELO CAFE');
});

it('emits warning and keeps original recipient on ambiguous matches', () => {
  const result = enrichRecipientsFromChecks([tx1, tx2], [check]);
  expect(result.warnings[0]).toContain('ambiguous');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/cluster/check-recipient-enrichment.test.ts`  
Expected: FAIL because enrichment module is missing.

- [ ] **Step 3: Implement enrichment module and wire in service**

```ts
const enrichment = enrichRecipientsFromChecks(spendTransactions, parsedChecks);
const enrichedSpend = enrichment.transactions;
// use enrichedSpend instead of spendTransactions for matchCluster
warnings.push(...enrichment.warnings);
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- src/cluster/check-recipient-enrichment.test.ts src/cluster/cluster-service.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cluster/check-recipient-enrichment.ts src/cluster/check-recipient-enrichment.test.ts src/cluster/cluster-service.ts src/cluster/cluster-report.ts
git commit -m "feat(cluster): enrich transaction recipients from parsed checks"
```

---

### Task 5: Implement `--cluster-other` interactive assignment and mapping updates

**Files:**
- Create: `src/cluster/cluster-other-interactive.ts`
- Create: `src/cluster/cluster-other-interactive.test.ts`
- Modify: `src/cli/main.ts`
- Modify: `src/cluster/cluster-service.ts`

**Interfaces:**
- Consumes: `ClusterReport`, `ClusterConfig`, `CliIo`
- Produces:
  - `promptClusterAssignments(params): Promise<Array<{ recipient: string; cluster: string }>>`
  - `applyClusterAssignments(configPath: string, assignments: Array<{ recipient: string; cluster: string }>): Promise<void>`

- [ ] **Step 1: Write failing tests for prompt formatting and valid selection flow**

```ts
it('prints recipient block and numbered clusters', async () => {
  const io = createMockIo(['2']);
  await promptClusterAssignments({ recipients: [recipientGroup], clusters, io });
  expect(io.stdoutText).toContain('recipient: VELO CAFE');
  expect(io.stdoutText).toContain('(1) кафе');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/cluster/cluster-other-interactive.test.ts`  
Expected: FAIL because prompt module is missing.

- [ ] **Step 3: Implement prompt loop and persistence wiring**

```ts
for (const recipient of uniqueOtherRecipients) {
  io.stdout(formatRecipientPrompt(recipient));
  const answer = await io.readLine();
  const cluster = resolveClusterSelection(answer, config.clusters);
  await saveClusterMapping(configPath, recipient.name, cluster);
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- src/cluster/cluster-other-interactive.test.ts src/cli/cluster-cli.contract.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cluster/cluster-other-interactive.ts src/cluster/cluster-other-interactive.test.ts src/cli/main.ts src/cluster/cluster-service.ts
git commit -m "feat(cluster): add interactive other-cluster assignment"
```

---

### Task 6: Add cluster help/docs, fixtures, and end-to-end command coverage

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Create: `src/cli/cluster-help.contract.test.ts`
- Create: `src/cli/cluster-other.contract.test.ts`
- Modify: `src/cluster/index.ts`

**Interfaces:**
- Consumes: CLI command surface
- Produces: documented usage and contract tests for `-sf/-cf/-f/-t/-v/-co`

- [ ] **Step 1: Write failing tests for cluster help output and `-co` flow**

```ts
it('shows cluster command help with options and examples', async () => {
  const result = await runClusterCli(['cluster', '--help']);
  expect(result.stdout).toContain('-sf, --statements-folder');
  expect(result.stdout).toContain('-co, --cluster-other');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/cli/cluster-help.contract.test.ts src/cli/cluster-other.contract.test.ts`  
Expected: FAIL until cluster help and flow are complete.

- [ ] **Step 3: Implement docs and exports**

```json
{
  "scripts": {
    "cluster": "node dist/cli/main.js cluster"
  }
}
```

```md
npm run cluster -- -f 2026-06-01 -t 2026-06-15
npm run cluster -- -f 2026-06-01 -t 2026-06-15 -co
```

- [ ] **Step 4: Run targeted tests to verify pass**

Run: `npm run test -- src/cli/cluster-help.contract.test.ts src/cli/cluster-other.contract.test.ts src/cli/cluster-cli.contract.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md package.json src/cli/cluster-help.contract.test.ts src/cli/cluster-other.contract.test.ts src/cluster/index.ts
git commit -m "docs(cluster): add cluster command help and contracts"
```

---

### Task 7: Full validation and integration commit

**Files:**
- Modify: any touched files from Tasks 1-6 if fixes are needed

**Interfaces:**
- Consumes: completed implementation
- Produces: validated feature branch ready for review

- [ ] **Step 1: Run build**

Run: `npm run build`  
Expected: PASS with no TypeScript errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`  
Expected: PASS with no ESLint violations.

- [ ] **Step 3: Run format check**

Run: `npm run format:check`  
Expected: PASS with no formatting diffs.

- [ ] **Step 4: Run full tests**

Run: `npm run test:coverage`  
Expected: PASS with repository coverage requirements preserved.

- [ ] **Step 5: Final commit (if any post-validation fixes)**

```bash
git add -A
git commit -m "test(cluster): finalize OpenAI recipient clustering integration"
```

## Spec Coverage Self-Review

- FR-002 covered by Tasks 1 and 6 (command options and help).
- FR-005/FR-006 covered by Tasks 2 and 5 (YAML mapping + `other` fallback and updates).
- FR-007/FR-008/FR-009 covered by Tasks 3 and 4 (OpenAI parsing + deterministic matching + warning behavior).
- FR-010/FR-011/FR-012 covered by Task 5 (interactive iteration and persistence).
- FR-014 covered by Task 6 (help output and examples).
- FR-015 covered by Tasks 1-6 tests and Task 7 full validation.
- QA constraints covered by separation of adapters/services in Tasks 2-5 and validation in Task 7.

No spec gaps found for the OpenAI-first scope requested by the user.
