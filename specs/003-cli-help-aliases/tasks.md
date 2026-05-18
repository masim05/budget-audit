# Tasks: CLI Help and Aliases

**Input**: Design documents from `/specs/003-cli-help-aliases/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Unit and CLI contract tests are mandatory for this feature and must preserve 100% unit coverage. Existing tests must not be changed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of help, date aliases, and output aliases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing CLI and test surfaces before behavior changes

- [x] T001 Review the existing CLI parse and execution flow in src/cli/main.ts
- [x] T002 [P] Review existing long-option CLI contract coverage in src/cli/cli.contract.test.ts
- [x] T003 [P] Review existing package audit script behavior in package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared parsing/help structure that all user stories use

**CRITICAL**: No user story implementation should begin until this phase is complete

- [x] T004 Define a reusable CLI option configuration in src/cli/main.ts covering existing options plus aliases for help/from/to/output
- [x] T005 Add a deterministic help rendering function in src/cli/main.ts that lists usage, data-dir, from, to, matching-mode, format, output, and help options
- [x] T006 Ensure the shared CLI option configuration preserves existing long option names and value types in src/cli/main.ts

**Checkpoint**: CLI parsing and help structure are ready for user-story behavior

---

## Phase 3: User Story 1 - View CLI Help (Priority: P1) MVP

**Goal**: Users can request help with `-h` or `--help`, including `npm run audit -- -h`, and receive guidance without running an audit.

**Independent Test**: Invoke `runCli` with help flags before or after `audit` and verify exit code 0, help on stdout, no stderr, and no required statement folder.

### Tests for User Story 1 (MANDATORY)

- [x] T007 [P] [US1] Add CLI help contract tests for `audit --help`, `audit -h`, `--help`, and `-h` in src/cli/cli-help.contract.test.ts
- [x] T008 [US1] Add CLI help no-audit test that verifies `audit -h --data-dir /missing-folder` exits 0 with empty stderr in src/cli/cli-help.contract.test.ts

### Implementation for User Story 1

- [x] T009 [US1] Add `help` boolean parsing with short alias `h` in src/cli/main.ts
- [x] T010 [US1] Return the help message before audit validation, statement source construction, or report writing in src/cli/main.ts
- [x] T011 [US1] Accept help both with and without the `audit` positional command in src/cli/main.ts

**Checkpoint**: User Story 1 is independently functional and testable

---

## Phase 4: User Story 2 - Use Short Date Aliases (Priority: P2)

**Goal**: Users can use `-f` and `-t` as equivalents for `--from` and `--to`.

**Independent Test**: Run equivalent audits with `-f`/`-t` and `--from`/`--to` against the same fixture folder and compare exit code and report totals.

### Tests for User Story 2 (MANDATORY)

- [x] T012 [P] [US2] Add CLI date alias equivalence tests for `-f` and `-t` in src/cli/cli-date-aliases.contract.test.ts
- [x] T013 [US2] Add CLI date alias missing-value and invalid-value diagnostics tests for `-f` and `-t` in src/cli/cli-date-aliases.contract.test.ts

### Implementation for User Story 2

- [x] T014 [US2] Add short alias `f` for `from` in the CLI option configuration in src/cli/main.ts
- [x] T015 [US2] Add short alias `t` for `to` in the CLI option configuration in src/cli/main.ts
- [x] T016 [US2] Verify date alias values flow through existing validateDateRange behavior without changing audit logic in src/cli/main.ts

**Checkpoint**: User Story 2 is independently functional and testable

---

## Phase 5: User Story 3 - Use Short Output Alias (Priority: P3)

**Goal**: Users can use `-o` as an equivalent for `--output`.

**Independent Test**: Run equivalent audits with `-o` and `--output` using relative output paths and verify the written report content and path resolution match.

### Tests for User Story 3 (MANDATORY)

- [x] T017 [P] [US3] Add CLI output alias equivalence tests for `-o` and `--output` in src/cli/cli-output-alias.contract.test.ts
- [x] T018 [US3] Add CLI output alias missing-value diagnostics test for `-o` in src/cli/cli-output-alias.contract.test.ts

### Implementation for User Story 3

- [x] T019 [US3] Add short alias `o` for `output` in the CLI option configuration in src/cli/main.ts
- [x] T020 [US3] Verify output alias values flow through existing resolveFromCwd and writeOptionalOutput behavior in src/cli/main.ts

**Checkpoint**: User Story 3 is independently functional and testable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the completed CLI ergonomics change and delivery requirements

- [x] T021 [P] Update README CLI usage examples to mention `-h`, `-f`, `-t`, and `-o` in README.md
- [x] T022 Run `npm run build` and fix any TypeScript errors in src/cli/main.ts, src/cli/cli-help.contract.test.ts, src/cli/cli-date-aliases.contract.test.ts, and src/cli/cli-output-alias.contract.test.ts
- [x] T023 Run `npm run lint` and fix lint issues in src/cli/main.ts, src/cli/cli-help.contract.test.ts, src/cli/cli-date-aliases.contract.test.ts, and src/cli/cli-output-alias.contract.test.ts
- [X] T024 Run `npm run format:check` and format touched files if needed in src/cli/main.ts, src/cli/cli-help.contract.test.ts, src/cli/cli-date-aliases.contract.test.ts, src/cli/cli-output-alias.contract.test.ts, README.md, and specs/003-cli-help-aliases/tasks.md
- [X] T025 Run `npm run test:coverage` and preserve 100% application code coverage for src/cli/main.ts
- [X] T026 Run quickstart smoke checks for `npm run audit -- -h`, `npm run audit -- --help`, `npm run audit -- -f 2026-05-01 -t 2026-05-31`, and `npm run audit -- -f 2026-05-01 -t 2026-05-31 -o reports/audit.txt` from specs/003-cli-help-aliases/quickstart.md
- [X] T027 Audit generated code, tests, scripts, and docs for accidental MCP dependency mentions in src/cli/main.ts, src/cli/cli-help.contract.test.ts, src/cli/cli-date-aliases.contract.test.ts, src/cli/cli-output-alias.contract.test.ts, README.md, and specs/003-cli-help-aliases/tasks.md
- [X] T028 Commit the completed implementation and task/spec artifacts with git after local validation passes
- [X] T029 Push branch 003-cli-help-aliases to the configured remote and verify remote CI checks pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependency on US2 or US3
- **User Story 2 (P2)**: Can start after Foundational - no dependency on US1 for alias parsing, but final implementation shares src/cli/main.ts
- **User Story 3 (P3)**: Can start after Foundational - no dependency on US1 or US2 for alias parsing, but final implementation shares src/cli/main.ts

### Within Each User Story

- Tests must be added before implementation and should fail before the related implementation task is completed
- CLI option configuration changes in src/cli/main.ts must be coordinated because all stories touch the same file
- Story-specific tests live in separate files and can be created in parallel
- Each story reaches a checkpoint before moving to the next priority when working sequentially

### Parallel Opportunities

- T002 and T003 can run in parallel after T001 starts
- T007 can run in parallel with T012 and T017 because they target different new test files
- T008, T013, and T018 should be serialized with other edits in their respective test files
- T012 can run in parallel with T017 because they target different new test files
- T021 can run in parallel with final validation after implementation behavior is settled
- User story test-file creation can proceed in parallel, while src/cli/main.ts implementation tasks should be serialized

---

## Parallel Example: User Story 1

```bash
# Launch help contract test tasks together if coordinating edits in src/cli/cli-help.contract.test.ts:
Task: "Add CLI help contract tests for `audit --help`, `audit -h`, `--help`, and `-h` in src/cli/cli-help.contract.test.ts"
Task: "Add CLI help no-audit test that verifies `audit -h --data-dir /missing-folder` exits 0 with empty stderr in src/cli/cli-help.contract.test.ts"
```

## Parallel Example: User Story 2

```bash
# Launch date alias test tasks before implementation:
Task: "Add CLI date alias equivalence tests for `-f` and `-t` in src/cli/cli-date-aliases.contract.test.ts"
Task: "Add CLI date alias missing-value and invalid-value diagnostics tests for `-f` and `-t` in src/cli/cli-date-aliases.contract.test.ts"
```

## Parallel Example: User Story 3

```bash
# Launch output alias test tasks before implementation:
Task: "Add CLI output alias equivalence tests for `-o` and `--output` in src/cli/cli-output-alias.contract.test.ts"
Task: "Add CLI output alias missing-value diagnostics test for `-o` in src/cli/cli-output-alias.contract.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate help independently with `npm run audit -- -h` and relevant tests
5. Demo help behavior before implementing aliases if needed

### Incremental Delivery

1. Complete Setup + Foundational
2. Add User Story 1 help behavior and tests
3. Add User Story 2 date aliases and tests
4. Add User Story 3 output alias and tests
5. Complete Polish validation, commit, push, and verify remote CI

### Parallel Team Strategy

With multiple developers:

1. One developer prepares src/cli/main.ts option/help structure
2. Other developers add separate test files for US1, US2, and US3
3. Implementation edits to src/cli/main.ts are integrated serially to avoid conflicts
4. Final validation runs once all stories are merged locally

## Notes

- Do not change existing tests; add new test files or new coverage only.
- Do not change audit calculations, statement ingestion, internal movement matching, or report content behavior.
- Keep all behavior in the CLI adapter unless a direct contract issue requires otherwise.
- Do not add runtime dependencies or MCP dependencies.
