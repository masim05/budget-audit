# Cluster Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable `budget-audit cluster` / `npm run cluster` command that groups external spend transactions by receiver, renders THB cluster totals, supports deterministic and hybrid matching, and persists interactive receiver-to-cluster assignments in `config/clusters.yml`.

**Architecture:** Add a new `src/cluster/` domain package that reuses the existing CSV statement loader, date filtering, and internal-movement exclusion rules from the audit flow, but produces a cluster-specific report model and text renderer. Keep YAML config loading, fuzzy matching, interactive reassignment, and git auto-commit behind focused helpers so `src/cli/main.ts` only translates CLI arguments into the cluster use case and writes stdout/stderr output.

**Tech Stack:** Node.js 22 LTS, TypeScript 5.x, Vitest, existing CLI/file-system adapters, and the `yaml` npm package for tracked cluster mapping files.

## Global Constraints

- All work and commits are on branch `004-spend-categories` inside the worktree at `.worktrees/004-spend-categories`.
- npm script: `cluster` (runs `node dist/cli/main.js cluster` or similar)
- `-sf, --statements-folder <path>`  (default: data/statements)
- `-cf, --checks-folder <path>`      (default: data/checks)
- `-f, --from <date>`                (same format as `audit`)
- `-t, --to <date>`
- `-v, --verbose`                    (show payments per cluster)
- `-co, --cluster-other`             (interactive mode: cluster receivers currently mapped to "Other")
- `-a, --approach <1|2|d|h>`         (1/d = deterministic YAML-only; 2/h = hybrid YAML + fuzzy + interactive)
- Path: `config/clusters.yml` (YAML), tracked in git.
- When assigning, persist to `config/clusters.yml` and auto-commit the file (no remote push).
- Human readable summary grouped by cluster with totals in base currency (THB).
- With `-v`, list each transaction under its cluster as `YYYY-MM-DD HH:MM — <amount> — <receiver> — <statement>`.
- Update `README.md` adding usage examples for `npm run cluster` with exemplar commands and explanation of `config/clusters.yml` location and format.
- Implement CLI help message: `budget-audit cluster --help` to document options and examples.
- Unit tests for normalization, deterministic lookup, and fuzzy matcher.
- Integration test that runs `cluster` against sample statements in `tests/fixtures` and asserts cluster totals and sample output format.
- Create `config/clusters.example.yml` as a template for users.
- Implementation assumption made explicit here to remove ambiguity: when interactive output says “check filename if available”, attach the first file from `checksFolder` whose basename contains the transaction number; if none match, omit the check filename.

---

## File Structure

- `package.json` — add the `cluster` npm script and the `yaml` dependency.
- `src/shared/money.ts` — extend currency support for THB formatting helpers used by cluster output.
- `src/statement/supported-statement-format.ts` — detect `_THB_` statement filenames so the cluster flow can operate on THB statements without changing CSV headers.
- `src/cluster/index.ts` — public barrel for the new cluster package.
- `src/cluster/cluster-config.ts` — load/save `config/clusters.yml`, validate shape, and preserve sorted mappings/clusters.
- `src/cluster/normalize-receiver.ts` — normalize receiver names for exact and fuzzy matching.
- `src/cluster/cluster-match.ts` — deterministic exact/pattern matching plus hybrid fuzzy fallback.
- `src/cluster/cluster-report.ts` — cluster-specific report types.
- `src/cluster/cluster-service.ts` — load statements, exclude internal movements, keep spend transactions in range, assign clusters, and aggregate THB totals.
- `src/cluster/text-cluster-report-writer.ts` — render the human-readable cluster summary and verbose transaction listing.
- `src/cluster/check-file-index.ts` — optional check-file lookup used only by the interactive mode.
- `src/cluster/interactive-clustering.ts` — prompt for “Other” receivers, apply assignments, save config, and auto-commit `config/clusters.yml`.
- `src/cli/main.ts` — dispatch `audit` vs `cluster`, define separate option sets, and extend `CliIo` with a prompt hook for interactive clustering.
- `README.md` — document `cluster`, `config/clusters.yml`, defaults, approach flags, and interactive usage.
- `config/clusters.example.yml` — seed example config aligned with the supported file format.
- `tests/fixtures/cluster/basic/` — deterministic/hybrid sample THB statements.
- `tests/fixtures/cluster/checks/` — sample check files whose basenames include transaction numbers.
- `src/cluster/*.test.ts` and `src/cli/*.test.ts` — focused unit, contract, and CLI integration tests for the new command.

## Task 1: Add cluster config scaffolding and THB-aware parsing

**Files:**
- Create: `src/cluster/index.ts`
- Create: `src/cluster/cluster-config.ts`
- Create: `src/cluster/normalize-receiver.ts`
- Test: `src/cluster/cluster-config.test.ts`
- Test: `src/cluster/normalize-receiver.test.ts`
- Modify: `src/shared/money.ts`
- Modify: `src/shared/money.test.ts`
- Modify: `src/statement/supported-statement-format.ts`
- Modify: `src/statement/csv-supported-formats.contract.test.ts`
- Modify: `package.json`
- Modify: `config/clusters.example.yml`

**Interfaces:**
- Produces: `export type ClusterConfig = { mappings: Record<string, string>; patterns: Array<{ pattern: string; cluster: string }>; clusters: string[] }`
- Produces: `export async function loadClusterConfig(path: string): Promise<ClusterConfig>`
- Produces: `export async function saveClusterConfig(path: string, config: ClusterConfig): Promise<void>`
- Produces: `export function normalizeReceiver(value: string): string`
- Produces: `export function formatMoney(minorUnits: bigint, currency: 'USD' | 'AMD' | 'THB'): string`

- [ ] **Step 1: Write the failing tests**

```ts
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadClusterConfig, saveClusterConfig } from './cluster-config.js';
import { normalizeReceiver } from './normalize-receiver.js';
import { detectStatementCurrency } from '../statement/supported-statement-format.js';
import { formatMoney } from '../shared/money.js';

describe('cluster config', () => {
  it('loads YAML mappings and rewrites them deterministically', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const configPath = join(folder, 'clusters.yml');
    await writeFile(
      configPath,
      'mappings:\n  "Cafe 123": "food"\npatterns:\n  - pattern: "/^LOTUS/i"\n    cluster: "groceries"\nclusters:\n  - "food"\n  - "groceries"\n',
      'utf8',
    );

    const config = await loadClusterConfig(configPath);
    expect(config.mappings['CAFE 123']).toBe('food');
    await saveClusterConfig(configPath, config);
    expect(await readFile(configPath, 'utf8')).toContain('"CAFE 123": food');
  });
});

describe('receiver normalization and THB support', () => {
  it('normalizes case, whitespace, and accents for matching', () => {
    expect(normalizeReceiver('  Café   Market  ')).toBe('CAFE MARKET');
  });

  it('detects THB statements and formats THB totals', () => {
    expect(detectStatementCurrency('TH_THB_1001.csv')).toBe('THB');
    expect(formatMoney(12345n, 'THB')).toBe('123.45');
  });
});
```

- [ ] **Step 2: Run the targeted tests and verify they fail**

Run: `npm test -- src/cluster/cluster-config.test.ts src/cluster/normalize-receiver.test.ts src/shared/money.test.ts src/statement/csv-supported-formats.contract.test.ts`

Expected: FAIL with module resolution errors for `src/cluster/cluster-config.ts` / `src/cluster/normalize-receiver.ts`, `formatMoney` missing from `src/shared/money.ts`, and `_THB_` detection assertions failing.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/cluster/normalize-receiver.ts
export function normalizeReceiver(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// src/cluster/cluster-config.ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parse, stringify } from 'yaml';
import { normalizeReceiver } from './normalize-receiver.js';

export async function loadClusterConfig(path: string): Promise<ClusterConfig> {
  const raw = parse(await readFile(path, 'utf8')) as Partial<ClusterConfig> | null;
  return {
    mappings: Object.fromEntries(
      Object.entries(raw?.mappings ?? {}).map(([receiver, cluster]) => [
        normalizeReceiver(receiver),
        cluster,
      ]),
    ),
    patterns: (raw?.patterns ?? []).map(({ pattern, cluster }) => ({ pattern, cluster })),
    clusters: [...new Set(raw?.clusters ?? [])].sort(),
  };
}

export async function saveClusterConfig(path: string, config: ClusterConfig): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringify(config), 'utf8');
}

// src/statement/supported-statement-format.ts
if (fileName.includes('_THB_')) return 'THB';

// src/shared/money.ts
export type Currency = 'AMD' | 'USD' | 'THB' | 'UNKNOWN';
export function formatMoney(minorUnits: bigint, currency: 'USD' | 'AMD' | 'THB'): string {
  return formatUsd(minorUnits);
}
```

- [ ] **Step 4: Re-run the targeted tests and verify they pass**

Run: `npm test -- src/cluster/cluster-config.test.ts src/cluster/normalize-receiver.test.ts src/shared/money.test.ts src/statement/csv-supported-formats.contract.test.ts`

Expected: PASS for the new config/normalization tests and updated THB currency assertions.

- [ ] **Step 5: Commit**

```bash
git add package.json config/clusters.example.yml src/shared/money.ts src/shared/money.test.ts src/statement/supported-statement-format.ts src/statement/csv-supported-formats.contract.test.ts src/cluster/index.ts src/cluster/cluster-config.ts src/cluster/normalize-receiver.ts src/cluster/cluster-config.test.ts src/cluster/normalize-receiver.test.ts
git commit -m "feat: scaffold cluster config"
```

## Task 2: Build the matcher and cluster aggregation service

**Files:**
- Create: `src/cluster/cluster-match.ts`
- Create: `src/cluster/cluster-report.ts`
- Create: `src/cluster/cluster-service.ts`
- Test: `src/cluster/cluster-match.test.ts`
- Test: `src/cluster/cluster-service.test.ts`
- Modify: `src/cluster/index.ts`

**Interfaces:**
- Consumes: `loadClusterConfig(path: string): Promise<ClusterConfig>`
- Consumes: `normalizeReceiver(value: string): string`
- Produces: `export type ClusterApproach = 'deterministic' | 'hybrid'`
- Produces: `export function matchCluster(receiver: string, config: ClusterConfig, approach: ClusterApproach): { cluster: string; matchedBy: 'mapping' | 'pattern' | 'fuzzy' | 'other'; normalizedReceiver: string }`
- Produces: `export interface ClusterReport { auditedFolder: string; checksFolder: string; dateRange: DateRange; clusters: Array<{ name: string; totalThb: bigint; transactions: ClusteredTransaction[] }>; unmatchedReceivers: string[]; warnings: string[] }`
- Produces: `export async function runCluster(options: ClusterServiceOptions): Promise<ClusterReport>`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { matchCluster } from './cluster-match.js';
import { runCluster } from './cluster-service.js';
import type { ClusterConfig } from './cluster-config.js';
import type { StatementSource } from '../statement/index.js';
import type { Transaction } from '../transaction/index.js';

const config: ClusterConfig = {
  mappings: { 'CAFE MARKET': 'food' },
  patterns: [{ pattern: '/^LOTUS/i', cluster: 'groceries' }],
  clusters: ['food', 'groceries', 'Other'],
};

describe('cluster matcher', () => {
  it('prefers exact mappings and falls back to fuzzy matches only in hybrid mode', () => {
    expect(matchCluster('Cafe Market', config, 'deterministic')).toMatchObject({
      cluster: 'food',
      matchedBy: 'mapping',
    });
    expect(matchCluster('Lotus Rama 9', config, 'deterministic')).toMatchObject({
      cluster: 'groceries',
      matchedBy: 'pattern',
    });
    expect(matchCluster('Cafe Maket', config, 'hybrid')).toMatchObject({
      cluster: 'food',
      matchedBy: 'fuzzy',
    });
  });
});

describe('cluster service', () => {
  it('keeps only in-range external spend and totals THB by cluster', async () => {
    const source: StatementSource = {
      async load() {
        const tx = (overrides: Partial<Transaction>): Transaction => ({
          id: '1',
          date: '2026-05-15',
          transactionType: 'Card',
          transactionNumber: '1001',
          accountNumber: 'ACC',
          currency: 'THB',
          credit: 0n,
          debit: 12345n,
          creditAmd: 0n,
          debitAmd: 0n,
          remitterOrBeneficiary: 'Cafe Market',
          details: 'Lunch',
          directionType: 'Outgoing',
          sourceFile: 'TH_THB_1001.csv',
          classification: 'invalid',
          ...overrides,
        });

        return {
          sourceName: 'test',
          sourceLocation: 'test',
          statementFiles: [],
          transactions: [
            tx({}),
            tx({ id: '2', credit: 1000n, debit: 0n, directionType: 'Incoming' }),
            tx({ id: '3', transactionNumber: 'move', remitterOrBeneficiary: 'Own', debit: 5000n }),
            tx({ id: '4', accountNumber: 'ACC2', transactionNumber: 'move', credit: 0n, debit: 0n, directionType: 'Incoming', creditAmd: 5000n }),
          ],
          warnings: [],
        };
      },
    };

    const report = await runCluster({
      statementsFolder: './data/statements',
      checksFolder: './data/checks',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      approach: 'deterministic',
      statementSource: source,
      config,
    });

    expect(report.clusters).toEqual([
      expect.objectContaining({ name: 'food', totalThb: 12345n }),
    ]);
    expect(report.unmatchedReceivers).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the targeted tests and verify they fail**

Run: `npm test -- src/cluster/cluster-match.test.ts src/cluster/cluster-service.test.ts`

Expected: FAIL because `matchCluster`, `runCluster`, `ClusterReport`, and the new cluster types do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/cluster/cluster-match.ts
import { normalizeReceiver } from './normalize-receiver.js';

export function matchCluster(receiver: string, config: ClusterConfig, approach: ClusterApproach) {
  const normalizedReceiver = normalizeReceiver(receiver);
  const exact = config.mappings[normalizedReceiver];
  if (exact) return { cluster: exact, matchedBy: 'mapping', normalizedReceiver } as const;

  for (const { pattern, cluster } of config.patterns) {
    const [_, body, flags = ''] = /^\/(.+)\/([a-z]*)$/.exec(pattern) ?? [];
    if (body && new RegExp(body, flags).test(receiver)) {
      return { cluster, matchedBy: 'pattern', normalizedReceiver } as const;
    }
  }

  if (approach === 'hybrid') {
    const fuzzy = bestFuzzyCluster(normalizedReceiver, config.mappings);
    if (fuzzy) return { cluster: fuzzy, matchedBy: 'fuzzy', normalizedReceiver } as const;
  }

  return { cluster: 'Other', matchedBy: 'other', normalizedReceiver } as const;
}

// src/cluster/cluster-service.ts
const movementResult = findInternalMovements(loaded.transactions, 'strict');
const spendTransactions = loaded.transactions.filter((transaction) => {
  if (!isWithinDateRange(transaction.date, options.dateRange)) return false;
  if (movementResult.excludedTransactionIds.has(transaction.id)) return false;
  return classifyExternalTransaction(transaction) === 'spend' && transaction.currency === 'THB';
});
```

- [ ] **Step 4: Re-run the targeted tests and verify they pass**

Run: `npm test -- src/cluster/cluster-match.test.ts src/cluster/cluster-service.test.ts`

Expected: PASS with deterministic, pattern, fuzzy, and THB aggregation behavior covered.

- [ ] **Step 5: Commit**

```bash
git add src/cluster/index.ts src/cluster/cluster-match.ts src/cluster/cluster-report.ts src/cluster/cluster-service.ts src/cluster/cluster-match.test.ts src/cluster/cluster-service.test.ts
git commit -m "feat: add cluster matching service"
```

## Task 3: Render cluster reports and wire the CLI command

**Files:**
- Create: `src/cluster/text-cluster-report-writer.ts`
- Test: `src/cluster/text-cluster-report-writer.test.ts`
- Test: `src/cli/cluster.contract.test.ts`
- Test: `src/cli/cluster-help.contract.test.ts`
- Modify: `src/cli/main.ts`
- Modify: `package.json`
- Modify: `src/cluster/index.ts`

**Interfaces:**
- Consumes: `runCluster(options: ClusterServiceOptions): Promise<ClusterReport>`
- Produces: `export class TextClusterReportWriter { write(report: ClusterReport, verbose: boolean): string }`
- Produces: `runCli(argv: string[], cwd: string, io: CliIo): Promise<number>` support for `command === 'cluster'`
- Produces: `package.json` script `"cluster": "node dist/cli/main.js cluster"`

- [ ] **Step 1: Write the failing tests**

```ts
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('cluster CLI contract', () => {
  it('runs the cluster command with statement and checks folder aliases', async () => {
    const statements = await mkdtemp(join(tmpdir(), 'budget-audit-statements-'));
    const checks = await mkdtemp(join(tmpdir(), 'budget-audit-checks-'));
    await writeFile(
      join(statements, 'TH_THB_1001.csv'),
      `${header}\n2026-05-15,Card,1001,ACC,0.00,123.45,0.00,0.00,Cafe Market,Lunch,Outgoing\n`,
      'utf8',
    );

    let stdout = '';
    const code = await runCli(
      ['cluster', '-sf', statements, '-cf', checks, '-f', '2026-05-01', '-t', '2026-05-31'],
      process.cwd(),
      { stdout: (value) => (stdout += value), stderr: () => undefined, prompt: async () => 'skip' },
    );

    expect(code).toBe(0);
    expect(stdout).toContain('Cluster:');
    expect(stdout).toContain('food');
  });

  it('prints cluster help without loading statements', async () => {
    let stdout = '';
    const code = await runCli(['cluster', '--help'], process.cwd(), {
      stdout: (value) => (stdout += value),
      stderr: () => undefined,
      prompt: async () => 'skip',
    });

    expect(code).toBe(0);
    expect(stdout).toContain('Usage: budget-audit cluster');
    expect(stdout).toContain('--statements-folder');
    expect(stdout).toContain('--checks-folder');
    expect(stdout).toContain('--cluster-other');
    expect(stdout).toContain('--approach');
  });
});
```

- [ ] **Step 2: Run the targeted tests and verify they fail**

Run: `npm test -- src/cluster/text-cluster-report-writer.test.ts src/cli/cluster.contract.test.ts src/cli/cluster-help.contract.test.ts`

Expected: FAIL because there is no cluster writer, no `cluster` script, and `runCli` rejects the `cluster` command.

- [ ] **Step 3: Write the minimal implementation**

```ts
// package.json
"scripts": {
  "audit": "node dist/cli/main.js audit",
  "cluster": "node dist/cli/main.js cluster",
  "build": "tsc -p tsconfig.json"
}

// src/cli/main.ts
export interface CliIo {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
  prompt: (question: string) => Promise<string>;
}

if (command === 'cluster') {
  const dateRange = validateDateRange(values.from ?? defaultRange.from, values.to ?? defaultRange.to);
  const statementsFolder = resolveFromCwd(cwd, values['statements-folder'] ?? './data/statements');
  const checksFolder = resolveFromCwd(cwd, values['checks-folder'] ?? './data/checks');
  const report = await runCluster({
    statementsFolder,
    checksFolder,
    dateRange,
    approach: parseClusterApproach(values.approach),
    statementSource: new CsvStatementSource(statementsFolder),
    config: await loadClusterConfig(resolveFromCwd(cwd, './config/clusters.yml')),
  });
  io.stdout(new TextClusterReportWriter().write(report, values.verbose === true));
  return 0;
}
```

- [ ] **Step 4: Re-run the targeted tests and verify they pass**

Run: `npm test -- src/cluster/text-cluster-report-writer.test.ts src/cli/cluster.contract.test.ts src/cli/cluster-help.contract.test.ts`

Expected: PASS with a working `cluster` command path, help output, and alias parsing.

- [ ] **Step 5: Commit**

```bash
git add package.json src/cluster/index.ts src/cluster/text-cluster-report-writer.ts src/cluster/text-cluster-report-writer.test.ts src/cli/main.ts src/cli/cluster.contract.test.ts src/cli/cluster-help.contract.test.ts
git commit -m "feat: add cluster cli command"
```

## Task 4: Add interactive “cluster-other” persistence and auto-commit

**Files:**
- Create: `src/cluster/check-file-index.ts`
- Create: `src/cluster/interactive-clustering.ts`
- Test: `src/cluster/check-file-index.test.ts`
- Test: `src/cluster/interactive-clustering.test.ts`
- Modify: `src/cluster/cluster-service.ts`
- Modify: `src/cluster/index.ts`
- Modify: `src/cli/main.ts`

**Interfaces:**
- Consumes: `ClusterReport`
- Consumes: `saveClusterConfig(path: string, config: ClusterConfig): Promise<void>`
- Produces: `export async function buildCheckFileIndex(folderPath: string): Promise<Map<string, string[]>>`
- Produces: `export async function clusterOtherReceivers(options: InteractiveClusteringOptions): Promise<ClusterConfig>`
- Produces: `CliIo.prompt(question: string): Promise<string>` usage for assigning / creating / skipping clusters

- [ ] **Step 1: Write the failing tests**

```ts
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { clusterOtherReceivers } from './interactive-clustering.js';

describe('interactive clustering', () => {
  it('persists new assignments and auto-commits config changes', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const configPath = join(folder, 'clusters.yml');
    await writeFile(configPath, 'mappings: {}\npatterns: []\nclusters:\n  - "Other"\n', 'utf8');

    const runGit = vi.fn().mockResolvedValue(undefined);
    const prompt = vi
      .fn<[(question: string)], Promise<string>>()
      .mockResolvedValueOnce('create:food')
      .mockResolvedValueOnce('assign:food');

    const updated = await clusterOtherReceivers({
      configPath,
      config: { mappings: {}, patterns: [], clusters: ['Other'] },
      receivers: [{ normalizedReceiver: 'CAFE MARKET', samples: [{ transactionNumber: '1001', statementFile: 'TH_THB_1001.csv', checkFile: '1001-slip.jpg' }] }],
      prompt,
      runGit,
    });

    expect(updated.mappings['CAFE MARKET']).toBe('food');
    expect(runGit).toHaveBeenCalledWith([
      'git',
      'commit',
      '-m',
      'chore: update cluster mappings',
    ]);
  });
});
```

- [ ] **Step 2: Run the targeted tests and verify they fail**

Run: `npm test -- src/cluster/check-file-index.test.ts src/cluster/interactive-clustering.test.ts`

Expected: FAIL because the interactive helpers and git adapter do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/cluster/check-file-index.ts
export async function buildCheckFileIndex(folderPath: string): Promise<Map<string, string[]>> {
  const index = new Map<string, string[]>();
  for (const fileName of await readdir(folderPath)) {
    const match = /\d+/.exec(fileName);
    if (!match) continue;
    index.set(match[0], [...(index.get(match[0]) ?? []), fileName]);
  }
  return index;
}

// src/cluster/interactive-clustering.ts
export async function clusterOtherReceivers(options: InteractiveClusteringOptions): Promise<ClusterConfig> {
  const next = structuredClone(options.config);
  for (const receiver of options.receivers) {
    const choice = await options.prompt(`Assign ${receiver.normalizedReceiver}`);
    if (choice.startsWith('create:')) next.clusters.push(choice.slice('create:'.length));
    if (choice.startsWith('assign:')) {
      next.mappings[receiver.normalizedReceiver] = choice.slice('assign:'.length);
    }
  }
  await saveClusterConfig(options.configPath, next);
  await options.runGit(['git', 'add', options.configPath]);
  await options.runGit(['git', 'commit', '-m', 'chore: update cluster mappings']);
  return next;
}
```

- [ ] **Step 4: Re-run the targeted tests and verify they pass**

Run: `npm test -- src/cluster/check-file-index.test.ts src/cluster/interactive-clustering.test.ts`

Expected: PASS with deterministic prompt-driven assignments, persisted mappings, and auto-commit behavior covered.

- [ ] **Step 5: Commit**

```bash
git add src/cluster/index.ts src/cluster/check-file-index.ts src/cluster/check-file-index.test.ts src/cluster/interactive-clustering.ts src/cluster/interactive-clustering.test.ts src/cluster/cluster-service.ts src/cli/main.ts
git commit -m "feat: add interactive cluster reassignment"
```

## Task 5: Finish docs, fixtures, and end-to-end coverage

**Files:**
- Create: `tests/fixtures/cluster/basic/TH_THB_1001.csv`
- Create: `tests/fixtures/cluster/basic/TH_THB_1002.csv`
- Create: `tests/fixtures/cluster/checks/1001-slip.jpg`
- Create: `src/cli/cluster-flow.test.ts`
- Modify: `README.md`
- Modify: `config/clusters.example.yml`
- Modify: `src/cli/cli-help.contract.test.ts`
- Modify: `src/cli/budget-audit-cli-flow.test.ts`

**Interfaces:**
- Consumes: `runCli(argv: string[], cwd: string, io: CliIo): Promise<number>`
- Produces: documented examples for `npm run cluster -- --from ...`, `npm run cluster -- -sf ./data/statements -cf ./data/checks -v`, and `npm run cluster -- -a 2 --cluster-other`

- [ ] **Step 1: Write the failing tests**

```ts
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

describe('cluster CLI flow', () => {
  it('clusters fixture statements and renders verbose grouped output', async () => {
    const root = process.cwd();
    let stdout = '';

    const code = await runCli(
      [
        'cluster',
        '--statements-folder',
        join(root, 'tests/fixtures/cluster/basic'),
        '--checks-folder',
        join(root, 'tests/fixtures/cluster/checks'),
        '--from',
        '2026-05-01',
        '--to',
        '2026-05-31',
        '--verbose',
        '--approach',
        '2',
      ],
      root,
      { stdout: (value) => (stdout += value), stderr: () => undefined, prompt: async () => 'skip' },
    );

    expect(code).toBe(0);
    expect(stdout).toContain('food');
    expect(stdout).toContain('groceries');
    expect(stdout).toContain('2026-05-15');
    expect(stdout).toContain('TH_THB_1001.csv');
  });
});
```

- [ ] **Step 2: Run the targeted tests and verify they fail**

Run: `npm test -- src/cli/cluster-flow.test.ts src/cli/cluster-help.contract.test.ts`

Expected: FAIL until fixture files, README examples, and the final CLI/report integration behavior are in place.

- [ ] **Step 3: Write the minimal implementation**

```md
## Cluster command

Examples:

    npm run cluster -- --from 2026-05-01 --to 2026-05-31
    npm run cluster -- -sf ./data/statements -cf ./data/checks -v
    npm run cluster -- -a 2 --cluster-other

`config/clusters.yml` stores normalized receiver mappings, regex patterns, and the set of supported cluster names. Copy `config/clusters.example.yml` to `config/clusters.yml` before the first run.
```

```csv
Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type
2026-05-15,Card,1001,ACC,0.00,123.45,0.00,0.00,Cafe Market,Lunch,Outgoing
2026-05-16,Card,1002,ACC,0.00,456.78,0.00,0.00,Lotus Rama 9,Groceries,Outgoing
```

- [ ] **Step 4: Run the full validation set and verify it passes**

Run: `npm run build && npm run lint && npm run format:check && npm run test:coverage`

Expected: PASS with the new `cluster` code path covered and no regressions in the existing `audit` command.

- [ ] **Step 5: Commit**

```bash
git add README.md config/clusters.example.yml tests/fixtures/cluster/basic/TH_THB_1001.csv tests/fixtures/cluster/basic/TH_THB_1002.csv tests/fixtures/cluster/checks/1001-slip.jpg src/cli/cluster-flow.test.ts src/cli/cluster-help.contract.test.ts src/cli/budget-audit-cli-flow.test.ts
git commit -m "docs: finish cluster command rollout"
```

## Self-Review

- **Spec coverage:** The plan covers CLI wiring, the `cluster` npm script, YAML config load/save, deterministic and hybrid matching, interactive `--cluster-other`, README/help updates, tracked `config/clusters.yml`, and automated tests including fixture-based CLI coverage.
- **Placeholder scan:** No `TODO`, `TBD`, “similar to”, or generic “handle errors later” instructions remain; each task names exact files, interfaces, commands, and example code.
- **Type consistency:** The same `ClusterConfig`, `ClusterApproach`, `ClusterReport`, `CliIo.prompt`, and `runCluster()` names are used consistently across tasks.
