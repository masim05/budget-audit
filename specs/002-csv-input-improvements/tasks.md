# Tasks: CSV Input Improvements

**Input**: Design documents from `specs/002-csv-input-improvements/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/statement-folder.md](contracts/statement-folder.md), [contracts/cli-diagnostics.md](contracts/cli-diagnostics.md), [quickstart.md](quickstart.md)

**Tests**: Unit and contract tests are mandatory for this feature. Add new tests for the new behavior; do not change existing tests unless a later implementation task proves a fixture-only update is unavoidable.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after the foundational phase.

## Phase 1: Setup

**Purpose**: Prepare local fixtures and feature-specific test inputs without changing application behavior.

- [X] T001 [P] Create supported CSV fixture directory in tests/fixtures/statements/supported-export-formats/
- [X] T002 [P] Create unsupported input fixture directory in tests/fixtures/statements/unsupported-files/
- [X] T003 [P] Create default folder fixture directory in tests/fixtures/statements/default-statements-folder/
- [X] T004 [P] Add supported fixture CSVs preserving the relevant format traits from data/IE_AMD_5600.csv, data/IE_USD_1001.csv, data/P_USD_2401.csv, data/P_USD_3601.csv, data/P_USD_5901.csv, data/P_USD_7801.csv, and data/P_USD_8001.csv in tests/fixtures/statements/supported-export-formats/
- [X] T005 [P] Add unsupported fixture files for non-CSV, bad header, and missing currency marker cases in tests/fixtures/statements/unsupported-files/
- [X] T006 [P] Document feature-002 fixture intent in tests/fixtures/statements/README.md

---

## Phase 2: Foundational

**Purpose**: Introduce shared statement-input concepts needed by every story before changing end-user behavior.

**Critical**: Complete this phase before starting any user story implementation.

- [X] T007 [P] Add supported statement format helper with required header, first-column BOM normalization, and `_AMD_` or `_USD_` marker detection in src/statement/supported-statement-format.ts
- [X] T008 [P] Add unit tests for supported header normalization and currency marker detection in src/statement/supported-statement-format.test.ts
- [X] T009 [P] Add input diagnostic model and multi-line formatter in src/statement/input-diagnostic.ts
- [X] T010 [P] Add unit tests for grouped file diagnostics, expected headers, received headers, and filename marker text in src/statement/input-diagnostic.test.ts
- [X] T011 Export supported statement format and input diagnostic helpers from src/statement/index.ts
- [X] T012 Refactor src/statement/csv-statement-source.ts to use supported statement format and input diagnostic helpers without changing existing successful parsing behavior

**Checkpoint**: Statement input helpers are tested, exported, and ready for story work.

---

## Phase 3: User Story 1 - Audit Real Statement Exports (Priority: P1) MVP

**Goal**: Accept all real statement CSV export formats represented by current local samples, including invisible BOM markers, CRLF line endings, quoted values, quoted commas, and multilingual text.

**Independent Test**: Load the supported fixture set through the statement source and verify files are processed without false header mismatches.

### Tests for User Story 1

- [X] T013 [P] [US1] Add contract tests for all supported sample fixture filenames in src/statement/csv-supported-formats.contract.test.ts
- [X] T014 [P] [US1] Add unit tests for repeated leading UTF-8 BOM markers in the first header column in src/statement/csv-header-normalization.test.ts
- [X] T015 [P] [US1] Add unit tests for CRLF rows, quoted numeric values, quoted commas, and multilingual text in src/statement/csv-row-parsing-formats.test.ts

### Implementation for User Story 1

- [X] T016 [US1] Normalize only leading UTF-8 BOM markers from the first parsed header column in src/statement/csv-statement-source.ts
- [X] T017 [US1] Require `_AMD_` or `_USD_` filename markers before treating a CSV as supported in src/statement/csv-statement-source.ts
- [X] T018 [US1] Preserve parsing of CRLF, quoted values, quoted commas, repeated spaces, punctuation, and multilingual row text in src/statement/csv-statement-source.ts
- [X] T019 [US1] Keep supported file processing summary values accurate for accepted statement files in src/statement/csv-statement-source.ts
- [X] T020 [US1] Run User Story 1 tests with npm run test -- src/statement/csv-supported-formats.contract.test.ts src/statement/csv-header-normalization.test.ts src/statement/csv-row-parsing-formats.test.ts using package.json

**Checkpoint**: User Story 1 can be validated independently with supported statement fixtures.

---

## Phase 4: User Story 2 - Read From Dedicated Statement Folder By Default (Priority: P2)

**Goal**: Make `./data/statements` the default audit input folder while preserving explicit `--data-dir` override behavior.

**Independent Test**: Run the CLI without `--data-dir` in a temp project folder containing `data/statements` and verify that path is used; then run with `--data-dir` and verify the override is used.

### Tests for User Story 2

- [X] T021 [P] [US2] Add CLI contract tests for default `./data/statements` selection in src/cli/default-statement-folder.contract.test.ts
- [X] T022 [P] [US2] Add CLI contract tests for explicit `--data-dir` override behavior in src/cli/data-dir-override.contract.test.ts

### Implementation for User Story 2

- [X] T023 [US2] Change the CLI default data directory from `./data` to `./data/statements` in src/cli/main.ts
- [X] T024 [US2] Ensure report processing summary uses the resolved default folder path from src/cli/main.ts through src/audit/audit-service.ts
- [X] T025 [US2] Update default folder documentation in README.md
- [X] T026 [US2] Run User Story 2 tests with npm run test -- src/cli/default-statement-folder.contract.test.ts src/cli/data-dir-override.contract.test.ts using package.json

**Checkpoint**: User Story 2 can be validated independently through CLI contract tests.

---

## Phase 5: User Story 3 - Show Friendly Input Errors (Priority: P3)

**Goal**: Render multi-file unsupported input errors across readable lines with file names, unsupported aspects, expected headers, and received headers.

**Independent Test**: Run an audit against a folder with multiple unsupported files and verify stderr contains one line or bullet per file plus expected and received header details.

### Tests for User Story 3

- [X] T027 [P] [US3] Add statement diagnostic tests for multiple unsupported files in src/statement/unsupported-input-diagnostics.test.ts
- [X] T028 [P] [US3] Add CLI stderr contract tests for multi-line unsupported input errors in src/cli/input-diagnostics.contract.test.ts
- [X] T029 [P] [US3] Add header mismatch diagnostic tests for expected and received header output in src/statement/header-diagnostics.test.ts

### Implementation for User Story 3

- [X] T030 [US3] Aggregate unsupported file issues into one multi-line UnsafeStatementError message in src/statement/csv-statement-source.ts
- [X] T031 [US3] Include expected and received header details for header failures in src/statement/input-diagnostic.ts
- [X] T032 [US3] Keep CLI stderr writing the formatted diagnostic without collapsing line breaks in src/cli/main.ts
- [X] T033 [US3] Preserve unsafe-input exit code behavior for unsupported input diagnostics in src/cli/main.ts
- [X] T034 [US3] Run User Story 3 tests with npm run test -- src/statement/unsupported-input-diagnostics.test.ts src/statement/header-diagnostics.test.ts src/cli/input-diagnostics.contract.test.ts using package.json

**Checkpoint**: User Story 3 can be validated independently with unsupported input fixtures and CLI diagnostics.

---

## Phase 6: User Story 4 - Reject Unsupported CSV Files In Statement Folder (Priority: P4)

**Goal**: Fail the audit before totals are reported whenever the selected statement folder contains any unsupported file.

**Independent Test**: Add unsupported CSV and non-CSV files to the selected statement folder, run the audit, and verify it fails before reporting totals; then remove unsupported files and verify the audit proceeds.

### Tests for User Story 4

- [X] T035 [P] [US4] Add statement source tests for non-CSV blocker files in src/statement/unsupported-files-blocker.test.ts
- [X] T036 [P] [US4] Add statement source tests for unsupported CSV headers and missing filename currency markers in src/statement/unsupported-csv-blocker.test.ts
- [X] T037 [P] [US4] Add CLI flow tests proving no totals are printed when unsupported files are present in src/cli/unsupported-input-flow.test.ts

### Implementation for User Story 4

- [X] T038 [US4] Validate every folder entry instead of filtering unsupported entries out in src/statement/csv-statement-source.ts
- [X] T039 [US4] Reject non-CSV files with file-specific blocking diagnostics in src/statement/csv-statement-source.ts
- [X] T040 [US4] Reject CSV files with unsupported headers or missing `_AMD_` or `_USD_` markers before audit totals are produced in src/statement/csv-statement-source.ts
- [X] T041 [US4] Preserve successful audit behavior when the statement folder contains only supported CSV files in src/statement/csv-statement-source.ts
- [X] T042 [US4] Run User Story 4 tests with npm run test -- src/statement/unsupported-files-blocker.test.ts src/statement/unsupported-csv-blocker.test.ts src/cli/unsupported-input-flow.test.ts using package.json

**Checkpoint**: User Story 4 can be validated independently with supported-only and unsupported-mixed folders.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify the feature end to end, refresh docs, and prepare for commit/push.

- [X] T043 [P] Update quickstart usage notes for default `./data/statements` and unsupported-file diagnostics in README.md
- [X] T044 [P] Verify generated feature docs remain aligned with implementation in specs/002-csv-input-improvements/quickstart.md
- [X] T045 Run full local build with npm run build using package.json
- [X] T046 Run lint with npm run lint using package.json
- [X] T047 Run formatting check with npm run format:check using package.json
- [X] T048 Run coverage check with npm run test:coverage using package.json and confirm 100% unit coverage for application code
- [X] T049 Audit generated code, tests, docs, and package scripts for MCP dependencies in src/, tests/, specs/002-csv-input-improvements/, and package.json
- [X] T050 Commit feature changes after local validation using specs/002-csv-input-improvements/tasks.md as the task source
- [X] T051 Push feature changes and verify remote CI is green for .github/workflows/ci.yml

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Setup and blocks all user stories.
- User Story 1 (Phase 3) depends on Foundational and is the MVP.
- User Story 2 (Phase 4) depends on Foundational; it can be implemented independently after Phase 2, but should be validated after US1 for a realistic default audit fixture.
- User Story 3 (Phase 5) depends on Foundational and can be implemented independently after Phase 2.
- User Story 4 (Phase 6) depends on Foundational and can be implemented independently after Phase 2.
- Polish (Phase 7) depends on the desired user stories being complete.

### User Story Dependencies

- US1 has no dependency on other user stories and is the suggested MVP.
- US2 has no code dependency on US1 but benefits from US1 fixtures for successful default audit coverage.
- US3 has no dependency on US2 and can validate diagnostics through explicit data directories.
- US4 has no dependency on US2 and can validate folder blocking through explicit data directories.

### Parallel Opportunities

- T001, T002, T003, T004, T005, and T006 can run in parallel during setup.
- T007, T008, T009, and T010 can start in parallel after setup fixtures exist; T011 and T012 should follow the helper files.
- T013, T014, and T015 can run in parallel before US1 implementation.
- T021 and T022 can run in parallel before US2 implementation.
- T027, T028, and T029 can run in parallel before US3 implementation.
- T035, T036, and T037 can run in parallel before US4 implementation.
- After Phase 2, US1, US2, US3, and US4 can be staffed in parallel if file conflicts in src/statement/csv-statement-source.ts and src/cli/main.ts are coordinated.

## Parallel Execution Examples

### User Story 1

```text
Task: T013 Add contract tests for all supported sample fixture filenames in src/statement/csv-supported-formats.contract.test.ts
Task: T014 Add unit tests for repeated leading UTF-8 BOM markers in the first header column in src/statement/csv-header-normalization.test.ts
Task: T015 Add unit tests for CRLF rows, quoted numeric values, quoted commas, and multilingual text in src/statement/csv-row-parsing-formats.test.ts
```

### User Story 2

```text
Task: T021 Add CLI contract tests for default ./data/statements selection in src/cli/default-statement-folder.contract.test.ts
Task: T022 Add CLI contract tests for explicit --data-dir override behavior in src/cli/data-dir-override.contract.test.ts
```

### User Story 3

```text
Task: T027 Add statement diagnostic tests for multiple unsupported files in src/statement/unsupported-input-diagnostics.test.ts
Task: T028 Add CLI stderr contract tests for multi-line unsupported input errors in src/cli/input-diagnostics.contract.test.ts
Task: T029 Add header mismatch diagnostic tests for expected and received header output in src/statement/header-diagnostics.test.ts
```

### User Story 4

```text
Task: T035 Add statement source tests for non-CSV blocker files in src/statement/unsupported-files-blocker.test.ts
Task: T036 Add statement source tests for unsupported CSV headers and missing filename currency markers in src/statement/unsupported-csv-blocker.test.ts
Task: T037 Add CLI flow tests proving no totals are printed when unsupported files are present in src/cli/unsupported-input-flow.test.ts
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 for US1.
3. Validate US1 independently with supported statement fixtures.
4. Stop and demo the fixed real-export ingestion path if only the MVP is needed.

### Incremental Delivery

1. Add US1 to accept real exported statements.
2. Add US2 to make `./data/statements` the default folder.
3. Add US3 to improve diagnostic readability.
4. Add US4 to enforce supported-only statement folders.
5. Run full validation and prepare commit/push after all selected stories.

### Validation Gates

1. `npm run build`
2. `npm run lint`
3. `npm run format:check`
4. `npm run test:coverage`
5. Push and verify remote CI is green

## Task Summary

- Total tasks: 51
- Setup tasks: 6
- Foundational tasks: 6
- US1 tasks: 8
- US2 tasks: 6
- US3 tasks: 8
- US4 tasks: 8
- Polish tasks: 9
- Suggested MVP scope: Phase 1, Phase 2, and Phase 3 only
- Format validation target: every task starts with `- [ ]`, has a sequential task ID, includes `[P]` only when parallelizable, includes `[US#]` only in user-story phases, and references at least one concrete path
