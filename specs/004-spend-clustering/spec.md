# Feature Specification: Spend Clustering by Recipient

**Feature Branch**: `004-spend-clustering`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "implement new feature: ability to cluster spend, `npm run cluster -- ...` using PDF statements and checks image files; clusterization should happen based on recipient; support cluster mapping updates via interactive `-co` mode."

## Clarifications

### Session 2026-06-20

- Q: How should recipient extracted from a check be linked to a statement transaction for clustering? → A: No synchronous user answer available during autopilot; this spec assumes matching by exact amount and nearest statement timestamp on the same date, with ambiguous matches left unresolved and reported.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cluster Spend with Existing Recipient Mapping (Priority: P1)

As a user, I can run `npm run cluster -- -f <date> -t <date>` and receive spend totals grouped by configured recipient clusters.

**Why this priority**: This is the core feature and the base workflow for monthly categorization.

**Independent Test**: Run cluster command for a known date range with a prepared mapping YAML and verify grouped totals, recipient-to-cluster assignment, and fallback to `other`.

**Acceptance Scenarios**:

1. **Given** a statements folder with supported statement files and a mapping YAML, **When** the user runs `npm run cluster -- -f 2026-06-01 -t 2026-06-15`, **Then** only in-range spend transactions are grouped by mapped recipient cluster and reported with THB totals.
2. **Given** a transaction recipient not present in the mapping YAML, **When** clustering runs without `-co`, **Then** the transaction is assigned to `other`.
3. **Given** the user omits `-sf` and `-cf`, **When** clustering runs, **Then** the command uses `data/statements` and `data/checks` defaults.

---

### User Story 2 - Enrich Recipient from Checks (Priority: P2)

As a user, I want recipient names extracted from check images so that clustering can still classify transactions when statement recipient text is missing, inconsistent, or less useful.

**Why this priority**: Recipient quality drives cluster quality; check data is explicitly available for this purpose.

**Independent Test**: Use fixture checks and statements where check recipient data is needed for correct categorization, then verify recipient enrichment and clustering outcomes.

**Acceptance Scenarios**:

1. **Given** check images in the configured checks folder and a matching statement transaction amount/date, **When** clustering runs, **Then** the extracted check recipient is used as the recipient identity for clustering.
2. **Given** multiple candidate statement transactions match one check amount/date equally, **When** clustering runs, **Then** no automatic recipient assignment is made for that check and the ambiguity is reported.
3. **Given** check OCR parsing fails for a file, **When** clustering runs, **Then** the run completes and reports the file-level parsing warning without silent failure.

---

### User Story 3 - Assign Unmapped Recipients Interactively (Priority: P3)

As a user, I can run `npm run cluster -- ... -co` and assign clusters for unmapped recipients interactively so that future runs classify those recipients automatically.

**Why this priority**: This closes the loop and makes categorization improve over time with user input.

**Independent Test**: Run `-co` mode with known unmapped recipients, assign numbered clusters, rerun without `-co`, and verify those recipients are no longer in `other`.

**Acceptance Scenarios**:

1. **Given** unmapped recipients exist in `other`, **When** user runs `npm run cluster -- -f ... -t ... -co`, **Then** the CLI iterates unique recipients, shows recipient info and transaction list (`YYYY-MM-DD HH:mm, <amount> THB`), and prompts cluster selection with numbered options.
2. **Given** user enters a valid cluster number, **When** prompt completes, **Then** recipient-to-cluster mapping is persisted to the tracked YAML mapping file immediately.
3. **Given** user reruns clustering for a range containing the same recipient, **When** `-co` is not provided, **Then** clustering uses saved mapping and does not place that recipient in `other`.

### Edge Cases

- Duplicate cluster names provided by business input are normalized to one canonical cluster entry (`дом` appears once in selectable list and mapping values).
- Recipient comparison is case-insensitive and whitespace-insensitive for mapping lookup and updates.
- If a transaction has no resolvable recipient from either statement or checks, it is assigned to `other`.
- `-co` in non-interactive execution contexts returns a clear CLI error instead of hanging.
- If mapping YAML does not exist, the command creates it with the configured cluster list and empty mappings.
- If mapping YAML has invalid structure, clustering fails with a clear validation diagnostic.
- If no spend transactions exist in range, the command reports an empty clustering result without interactive prompts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a cluster CLI command runnable as `npm run cluster -- ...`.
- **FR-002**: Cluster command MUST support options: `-sf, --statements-folder` (default `data/statements`), `-cf, --checks-folder` (default `data/checks`), `-f, --from`, `-t, --to`, `-v, --verbose`, and `-co, --cluster-other`.
- **FR-003**: System MUST use inclusive date filtering for `--from`/`--to` and process only transactions in range.
- **FR-004**: System MUST cluster spend transactions by recipient identity using persisted recipient-to-cluster mapping.
- **FR-005**: System MUST keep recipient-to-cluster mapping in a git-tracked YAML file.
- **FR-006**: Transactions with unmapped recipients MUST be assigned to cluster `other`.
- **FR-007**: System MUST extract recipient text from check images in the checks folder using the OpenAI Responses API (model `gpt-4.1-mini`); the API key is resolved from `OPENAI_API_KEY` env var or `.env` file. Individual file parse failures MUST NOT abort the run and MUST produce per-file warnings.
- **FR-008**: System MUST attempt to match extracted check recipient to statement transactions by exact amount on the same date; timestamp matching is not performed because transaction timestamps are not available.
- **FR-009**: Ambiguous or failed check-to-transaction matching MUST NOT overwrite transaction recipient identity and MUST produce warnings.
- **FR-010**: `--cluster-other` mode MUST iterate unique unmapped recipients and prompt for cluster assignment with numbered cluster options.
- **FR-011**: `--cluster-other` prompt MUST show recipient (including English transliteration/translation label) and all related transactions with date-time and THB amount in human-readable format.
- **FR-012**: On valid selection in `--cluster-other` mode, system MUST persist mapping update to YAML immediately and apply it in the current run.
- **FR-013**: Cluster list MUST include exactly these user-defined categories plus `other`: `дом`, `склад`, `машина`, `бензин + мойка`, `обязательные лекарства`, `кружки (музыка, муайтай, тайский, зал)`, `уборка`, `коммуналка`, `телефоны, подписки`, `здоровье`, `кафе`, `продукты`, `такси`, `красота`, `товары для детей`, `развлечения`, `животные`, `путешествия`, `other`.
- **FR-014**: System MUST provide `--help` output for the cluster command with option descriptions and usage examples including `-co`.
- **FR-015**: System MUST include automated tests for option parsing, mapping fallback to `other`, check recipient enrichment, interactive cluster assignment behavior, and YAML persistence behavior.

### Quality & Architecture Requirements

- **QA-001**: Application behavior MUST be independently unit-testable with repository coverage standards preserved.
- **QA-002**: Cluster command behavior MUST stay in CLI/application adapter layers; parsing, mapping, and clustering logic must remain reusable and independent of terminal IO.
- **QA-003**: YAML mapping schema MUST be validated at load time with explicit errors for invalid content.
- **QA-004**: Interactive prompts MUST have deterministic input validation and explicit retry messaging for invalid cluster numbers.
- **QA-005**: Feature MUST not introduce MCP server/client/runtime dependency.

### Key Entities *(include if feature involves data)*

- **Cluster Mapping File**: Git-tracked YAML document storing cluster definitions and recipient-to-cluster mappings.
- **Recipient Identity**: Canonical string used to map a transaction to a cluster, derived from statement recipient and optionally enriched from checks.
- **Check Extraction Record**: Parsed representation of one check image containing extracted recipient, amount, date/time evidence, source file, and parse warnings.
- **Clustered Spend Report**: Command output containing date range, clusters with THB totals, grouped transactions, unmapped recipients, and warnings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a fixture range with known mapping coverage, 100% of mapped recipients are assigned to the expected non-`other` clusters.
- **SC-002**: For a fixture range containing unmapped recipients, 100% of unmapped recipient transactions are assigned to `other` when `-co` is not used.
- **SC-003**: In `-co` mode, newly assigned recipients persist to YAML and are classified outside `other` on the next run for the same range.
- **SC-004**: Command help and examples document all supported options and both standard and `-co` workflows.
- **SC-005**: Check parsing/matching failures are visible as warnings and do not silently misassign recipients.

## Assumptions

- Statement inputs for this feature include statement files under the statements folder and are compatible with existing repository statement ingestion expectations.
- All checks in the checks folder share one stable format, enabling deterministic recipient extraction rules.
- YAML mapping file path is repository-local and committed to git as part of normal workflow.
- Recipient translation shown in prompts is provided by the OpenAI API (check image parsing returns an English transliteration alongside the original recipient text); internet access is required for the check enrichment flow.
- Example fixtures available for development and testing are `data/statements/Statement 0106-1506.pdf` and `data/checks/2026-06-01 08-22-54.JPEG`.
