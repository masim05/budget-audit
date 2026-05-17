# Tasks: Budget Audit

**Input**: Design documents from `specs/001-budget-audit/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Unit tests are mandatory for every behavior-bearing module and must preserve 100% branch coverage. Contract tests cover the CLI, CSV statement input, and audit report output.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and demonstrated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because the task touches different files and has no dependency on incomplete tasks
- **[Story]**: User story label, used only in user story phases
- Every task includes exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the Node.js/TypeScript project, package layout, and test/tooling scaffolding.

- [X] T001 Create Node.js project configuration with package metadata, `budget-audit` bin entry, TypeScript settings, Vitest coverage settings, ESLint settings, and Prettier settings in package.json, tsconfig.json, eslint.config.js, and prettier.config.js
- [X] T002 Create TypeScript source entry points in src/index.ts, src/audit/index.ts, src/statement/index.ts, src/transaction/index.ts, src/internal-movement/index.ts, src/report/index.ts, src/shared/index.ts, and src/cli/index.ts
- [X] T003 [P] Create domain folder scaffolds with colocated test files and shared test setup in src/audit/, src/statement/, src/transaction/, src/internal-movement/, src/report/, src/shared/, src/cli/, and tests/fixtures/
- [X] T004 [P] Document fixture conventions and the required CSV header in tests/fixtures/statements/README.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the shared domain types, boundary interfaces, and local implementation skeletons that all user stories depend on.

**Critical**: No user story work can begin until this phase is complete.

- [X] T005 [P] Implement domain entities and enums for StatementFile, Account, Transaction, MatchingMode, AuditRun, AuditReport, and warning records across src/statement/statement-file.ts, src/transaction/transaction.ts, src/internal-movement/matching-mode.ts, src/audit/audit-run.ts, and src/audit/audit-report.ts
- [X] T006 [P] Implement exact minor-unit money parsing and USD formatting helpers in src/shared/money.ts
- [X] T007 [P] Implement date parsing, inclusive range validation, and previous-full-calendar-month calculation in src/shared/date-range.ts
- [X] T008 [P] Define the statement source boundary interface and public exports in src/statement/index.ts
- [X] T009 [P] Define the report writer boundary interface and public exports in src/report/index.ts
- [X] T010 Create audit orchestration use-case skeleton in src/audit/audit-service.ts
- [X] T011 Create transaction classification skeleton in src/transaction/classification.ts
- [X] T012 Create internal movement matching skeleton in src/internal-movement/internal-movement-matcher.ts
- [X] T013 Create CSV statement source implementation skeleton in src/statement/csv-statement-source.ts
- [X] T014 Create JSON report writer skeleton in src/report/json-report-writer.ts
- [X] T015 Create text report writer skeleton in src/report/text-report-writer.ts
- [X] T016 Create CLI argument parsing and application entry scaffold in src/cli/main.ts
- [X] T017 Create CLI output and error mapping scaffold in src/cli/output.ts
- [X] T018 [P] Add no-MCP/no-database dependency audit test in src/shared/project-constraints.test.ts

**Checkpoint**: Domain boundaries, exported interfaces, and local implementation scaffolds exist and user story work can begin.

---

## Phase 3: User Story 1 - Audit Previous Month From Default Folder (Priority: P1) MVP

**Goal**: Running `budget-audit audit` reads `./data`, audits the previous full calendar month, and reports income/spend without silently accepting unreadable input.

**Independent Test**: Use fixture CSV files in `tests/fixtures/statements/default-month/`, run the default CLI path, and verify previous-month filtering, totals, file warnings, and exit behavior.

### Tests for User Story 1 (Mandatory)

- [X] T019 [P] [US1] Add unit tests for previous-full-calendar-month and inclusive date filtering in src/shared/date-range.test.ts
- [X] T020 [P] [US1] Add unit tests for minor-unit amount parsing, zero handling, and USD formatting in src/shared/money.test.ts
- [X] T021 [P] [US1] Add CSV statement contract tests for exact header validation, row parsing, missing folder, empty folder, and unreadable file behavior in src/statement/csv-statement-source.contract.test.ts
- [X] T022 [P] [US1] Add CLI contract tests for default options, stdout summary fields, stderr diagnostics, and exit codes 0, 2, and 3 in src/cli/cli.contract.test.ts
- [X] T023 [P] [US1] Add integration test for default audit over fixture statements in src/cli/budget-audit-cli-flow.test.ts

### Implementation for User Story 1

- [X] T024 [US1] Implement previous-full-calendar-month and custom inclusive range helpers in src/shared/date-range.ts
- [X] T025 [US1] Implement minor-unit amount parsing and USD money formatting in src/shared/money.ts
- [X] T026 [US1] Implement CSV file discovery, exact header validation, row normalization, and file warnings in src/statement/csv-statement-source.ts
- [X] T027 [US1] Implement baseline income/spend classification from Credit and Debit fields in src/transaction/classification.ts
- [X] T028 [US1] Implement audit orchestration for loading statements, filtering by default date range, classifying external transactions, and collecting warnings in src/audit/audit-service.ts
- [X] T029 [US1] Implement default text report rendering for audited folder, date range, matching mode, totals, file summary, and warnings in src/report/text-report-writer.ts
- [X] T030 [US1] Implement `budget-audit audit` default command wiring, stdout, stderr, and exit code mapping in src/cli/main.ts and src/cli/output.ts
- [X] T031 [US1] Add default-month CSV fixtures with expected totals in tests/fixtures/statements/default-month/expected.json

**Checkpoint**: User Story 1 is independently runnable and testable as the MVP.

---

## Phase 4: User Story 2 - Audit A Custom Folder And Date Range (Priority: P2)

**Goal**: The user can provide `--data-dir`, `--from`, and `--to` to audit any supported statement folder and inclusive date range.

**Independent Test**: Run the CLI with custom fixture folders and date ranges, then verify only matching transactions contribute to the report.

### Tests for User Story 2 (Mandatory)

- [X] T032 [P] [US2] Add unit tests for invalid date ranges, boundary inclusion, and empty matching ranges in src/shared/date-range.test.ts
- [X] T033 [P] [US2] Add CLI contract tests for `--data-dir`, `--from`, `--to`, invalid dates, and exit code 1 in src/cli/cli.contract.test.ts
- [X] T034 [P] [US2] Add integration test for custom folder and custom date range audit in src/cli/budget-audit-cli-flow.test.ts

### Implementation for User Story 2

- [X] T035 [US2] Extend CLI parsing for `--data-dir`, `--from`, and `--to` validation in src/cli/main.ts
- [X] T036 [US2] Extend audit orchestration to accept explicit folder and date range inputs in src/audit/audit-service.ts
- [X] T037 [US2] Add custom-range CSV fixtures and expected outputs in tests/fixtures/statements/custom-range/expected.json
- [X] T038 [US2] Update text report rendering for zero-transaction ranges in src/report/text-report-writer.ts

**Checkpoint**: User Stories 1 and 2 work independently through CLI defaults and explicit inputs.

---

## Phase 5: User Story 3 - Exclude Own-Account Transfers And Currency Conversions (Priority: P3)

**Goal**: Own-account transfers and own-account currency conversions net to zero, with strict matching by default and permissive matching available per run.

**Independent Test**: Use fixtures containing matched transfer pairs, matched conversion pairs, ambiguous candidates, and external transactions; verify strict and permissive modes produce the expected exclusions and warnings.

### Tests for User Story 3 (Mandatory)

- [X] T039 [P] [US3] Add unit tests for high-confidence same-currency transfer matching in src/internal-movement/internal-movement-matcher.test.ts
- [X] T040 [P] [US3] Add unit tests for internal currency conversion matching using AMD-normalized evidence in src/internal-movement/internal-movement-matcher.test.ts
- [X] T041 [P] [US3] Add unit tests for strict versus permissive ambiguous candidate handling in src/internal-movement/internal-movement-matcher.test.ts
- [X] T042 [P] [US3] Add CLI contract tests for `--matching-mode strict`, `--matching-mode permissive`, invalid matching mode, and warning output in src/cli/cli.contract.test.ts
- [X] T043 [P] [US3] Add integration test for transfer/conversion exclusion in strict and permissive modes in src/cli/budget-audit-cli-flow.test.ts

### Implementation for User Story 3

- [X] T044 [US3] Implement MatchingMode validation and default strict behavior in src/internal-movement/matching-mode.ts
- [X] T045 [US3] Implement high-confidence same-currency transfer matching in src/internal-movement/internal-movement-matcher.ts
- [X] T046 [US3] Implement internal currency conversion matching with AMD-normalized evidence in src/internal-movement/internal-movement-matcher.ts
- [X] T047 [US3] Implement strict and permissive ambiguity handling with warnings in src/internal-movement/internal-movement-matcher.ts
- [X] T048 [US3] Integrate internal match exclusion into audit totals and warnings in src/audit/audit-service.ts
- [X] T049 [US3] Add `--matching-mode` CLI option mapping to MatchingMode in src/cli/main.ts
- [X] T050 [US3] Update text report to include excluded transfer and conversion counts plus ambiguity warnings in src/report/text-report-writer.ts
- [X] T051 [US3] Add transfer and conversion fixture statements with expected outputs in tests/fixtures/statements/internal-matches/expected.json

**Checkpoint**: User Stories 1, 2, and 3 work independently, and internal movements do not affect final totals.

---

## Phase 6: User Story 4 - Review USD Totals Across Accounts (Priority: P4)

**Goal**: The audit report exposes final income and spend totals in USD, using `Credit(AMD)` and `Debit(AMD)` as AMD-normalized source fields and supporting text, JSON, stdout, and optional local file output.

**Independent Test**: Use multi-account, multi-currency fixtures and verify the text and JSON report contracts show exact USD income/spend totals after internal movement exclusions.

### Tests for User Story 4 (Mandatory)

- [X] T052 [P] [US4] Add unit tests for USD total aggregation from AMD-normalized credit and debit fields in src/audit/audit-service.test.ts
- [X] T053 [P] [US4] Add audit report JSON contract tests for totals, processed files, exclusions, and warnings in src/report/audit-report.contract.test.ts
- [X] T054 [P] [US4] Add CLI contract tests for `--format json`, `--output`, and text-vs-json output behavior in src/cli/cli.contract.test.ts
- [X] T055 [P] [US4] Add integration test for multi-currency USD report output in src/cli/budget-audit-cli-flow.test.ts

### Implementation for User Story 4

- [X] T056 [US4] Implement USD income and spend aggregation in src/audit/audit-service.ts
- [X] T057 [US4] Implement JSON report writer matching contracts/audit-report.md in src/report/json-report-writer.ts
- [X] T058 [US4] Update text report writer to match contracts/audit-report.md text requirements in src/report/text-report-writer.ts
- [X] T059 [US4] Implement `--format` and `--output` CLI behavior with local file writing only in src/cli/main.ts
- [X] T060 [US4] Add multi-currency USD fixture statements and expected report in tests/fixtures/statements/usd-report/expected.json

**Checkpoint**: All user stories are independently functional and produce USD audit reports.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and quality gates across all stories.

- [X] T061 [P] Update README usage, CSV header, matching-mode explanation, no-DB note, and future adapter boundary in README.md
- [X] T062 [P] Add packaged sample service-file report examples in examples/reports/README.md
- [X] T063 Run ESLint validation for all source and tests using eslint.config.js
- [X] T064 Run Prettier format validation for all source and tests using prettier.config.js
- [X] T065 Run Vitest with 100% branch coverage gate for src/ using package.json
- [X] T066 Run quickstart validation commands from specs/001-budget-audit/quickstart.md
- [X] T067 Audit source, tests, generated artifacts, and documentation for forbidden MCP and database dependencies in specs/001-budget-audit/plan.md
- [X] T068 Review code against clean-code and hexagonal boundary rules in .specify/memory/constitution.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies; start immediately.
- **Phase 2 Foundational**: Depends on Phase 1; blocks all user story phases.
- **Phase 3 US1**: Depends on Phase 2; MVP scope.
- **Phase 4 US2**: Depends on Phase 2 and can be developed after US1 foundation behavior is available.
- **Phase 5 US3**: Depends on Phase 2 and can be developed independently with fixtures, then integrated with US1/US2 audit orchestration.
- **Phase 6 US4**: Depends on Phase 2 and can be developed independently with report fixtures, then integrated after US3 exclusions are available.
- **Phase 7 Polish**: Depends on completion of desired user stories.

### User Story Dependencies

- **US1 (P1)**: No dependency on other user stories; delivers MVP default audit.
- **US2 (P2)**: Builds on US1 CLI/audit flow but remains independently testable with explicit inputs.
- **US3 (P3)**: Builds on foundational transaction model and audit flow; transfer matching can be unit-tested independently.
- **US4 (P4)**: Builds on audit report model; USD aggregation can be unit-tested independently and integrated after exclusions.

### Within Each User Story

- Write tests first and verify they fail before implementation.
- Implement domain behavior before CLI or report writer changes.
- Keep statement ingestion, report writing, and CLI mapping outside the core.
- Validate each story at its checkpoint before moving to the next priority.

## Parallel Opportunities

- Setup tasks T003 and T004 can run in parallel after T001/T002 are understood.
- Foundational tasks T005 through T009 can run in parallel because they touch separate files.
- US1 tests T019 through T023 can run in parallel before implementation.
- US2 tests T032 through T034 can run in parallel before implementation.
- US3 tests T039 through T043 can run in parallel before implementation.
- US4 tests T052 through T055 can run in parallel before implementation.
- Fixture tasks T031, T037, T051, and T060 can run in parallel with their corresponding implementation tasks once expected behavior is agreed.
- Polish documentation tasks T061 and T062 can run in parallel.

## Parallel Example: User Story 1

```bash
Task: "T019 [US1] Add unit tests for previous-full-calendar-month and inclusive date filtering in src/shared/date-range.test.ts"
Task: "T020 [US1] Add unit tests for minor-unit amount parsing, zero handling, and USD formatting in src/shared/money.test.ts"
Task: "T021 [US1] Add CSV statement contract tests for exact header validation, row parsing, missing folder, empty folder, and unreadable file behavior in src/statement/csv-statement-source.contract.test.ts"
Task: "T022 [US1] Add CLI contract tests for default options, stdout summary fields, stderr diagnostics, and exit codes 0, 2, and 3 in src/cli/cli.contract.test.ts"
Task: "T023 [US1] Add integration test for default audit over fixture statements in src/cli/budget-audit-cli-flow.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "T039 [US3] Add unit tests for high-confidence same-currency transfer matching in src/internal-movement/internal-movement-matcher.test.ts"
Task: "T040 [US3] Add unit tests for internal currency conversion matching using AMD-normalized evidence in src/internal-movement/internal-movement-matcher.test.ts"
Task: "T041 [US3] Add unit tests for strict versus permissive ambiguous candidate handling in src/internal-movement/internal-movement-matcher.test.ts"
Task: "T042 [US3] Add CLI contract tests for --matching-mode strict, --matching-mode permissive, invalid matching mode, and warning output in src/cli/cli.contract.test.ts"
Task: "T043 [US3] Add integration test for transfer/conversion exclusion in strict and permissive modes in src/cli/budget-audit-cli-flow.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 User Story 1.
4. Stop and validate the default `budget-audit audit` flow against fixture data.
5. Confirm 100% unit coverage for the implemented MVP surface.

### Incremental Delivery

1. Add US1 default audit and validate independently.
2. Add US2 custom folder/date range and validate independently.
3. Add US3 internal transfer/conversion exclusion and validate independently.
4. Add US4 USD report formats and optional local file output and validate independently.
5. Run Phase 7 polish and quality gates.

### Parallel Team Strategy

1. Complete setup and foundational boundaries together.
2. Split tests and fixtures by story once foundation is in place.
3. Keep implementation ownership by domain folder: audit, statement, transaction, internal movement, report, shared, and CLI.
4. Merge story slices only after their independent checkpoints pass.

## Notes

- [P] tasks are parallelizable because they touch separate files or independent fixture sets.
- Every user story has mandatory tests before implementation.
- Domain behavior must not depend on CLI, filesystem, stdout/stderr, future web UI, or bank API details.
- Statement input and report output must remain behind exported boundary interfaces.
- Do not introduce databases, MCP dependencies, or network requirements.
