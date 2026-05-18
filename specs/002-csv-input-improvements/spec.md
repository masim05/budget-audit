# Feature Specification: CSV Input Improvements

**Feature Branch**: `[002-csv-input-improvements]`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "minor improvements: support more CSV formats for input data using the files in ./data as the complete set of required formats; format error messages more user friendly with new lines; use ./data/statements as the default folder; assert the folder contains only supported CSV files; add tests, commit, push, and ensure CI is green."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Audit Real Statement Exports (Priority: P1)

As a budget auditor, I want the application to accept all real statement CSV exports represented in the local data samples so that visible-valid bank statement files are audited instead of rejected because of invisible export formatting differences.

**Why this priority**: This fixes the current blocker where statement files that appear to have the expected header are rejected, preventing the default audit from running.

**Independent Test**: Place copies of every CSV format currently present in `./data` into the configured statement folder, run the default audit, and verify the files are accepted or produce row-level warnings only for actual row issues rather than false header mismatches.

**Acceptance Scenarios**:

1. **Given** a statement folder containing CSV exports with the visible required header and invisible encoding markers, **When** the user runs the default audit, **Then** the files are recognized as supported statement files.
2. **Given** statement CSVs with CRLF line endings, quoted numbers, quoted commas, and multilingual text, **When** the user runs an audit, **Then** the audit reads the rows without corrupting columns or text.
3. **Given** supported statement files named with required account/currency patterns, **When** the audit completes, **Then** each supported file appears in the processing summary with a successful status or row-specific warnings.

---

### User Story 2 - Read From Dedicated Statement Folder By Default (Priority: P2)

As a user, I want the default audit to read from `./data/statements` so that raw statement exports have a clear dedicated home separate from other data artifacts.

**Why this priority**: A dedicated folder reduces accidental ingestion of unrelated files and makes the default command safer to run repeatedly.

**Independent Test**: Put supported statement CSV files under `./data/statements`, run the default audit without arguments, and verify that folder is used in the report and processing summary.

**Acceptance Scenarios**:

1. **Given** supported CSV statement files exist in `./data/statements`, **When** the user runs the default audit without `--data-dir`, **Then** the audit reads files from `./data/statements`.
2. **Given** the user supplies an explicit data directory, **When** the audit runs, **Then** the explicit directory overrides the default.

---

### User Story 3 - Show Friendly Input Errors (Priority: P3)

As a user, I want input errors to be readable across multiple lines so that I can quickly identify which files are unsupported and what to fix.

**Why this priority**: The current single-line failure is hard to read when several files fail, which slows troubleshooting and makes valid-looking header failures confusing.

**Independent Test**: Run an audit against a folder containing multiple unsupported CSV files and verify the diagnostic output is grouped with line breaks, file names, expected formats, and received details.

**Acceptance Scenarios**:

1. **Given** multiple unsupported CSV files are present, **When** the audit fails, **Then** the error message lists one file issue per line or bullet.
2. **Given** a file has an unsupported header, **When** the audit fails, **Then** the diagnostic shows the expected header and the received header in a readable multi-line format.
3. **Given** a folder contains non-CSV files, **When** the audit runs, **Then** non-CSV files are ignored or reported according to existing input-folder rules without being treated as supported statements.

---

### User Story 4 - Reject Unsupported CSV Files In Statement Folder (Priority: P4)

As a user, I want the statement folder to contain only supported CSV statement files so that the audit never silently skips or misinterprets an unsupported CSV export.

**Why this priority**: This protects audit totals from unsupported CSVs being ignored or partially parsed without clear user awareness.

**Independent Test**: Add a CSV file whose format is not represented in the supported samples, run the audit, and verify the audit stops with a clear unsupported-file diagnostic.

**Acceptance Scenarios**:

1. **Given** the statement folder contains at least one unsupported CSV file, **When** the audit runs, **Then** the audit fails before reporting totals.
2. **Given** the statement folder contains only supported CSV files, **When** the audit runs, **Then** no unsupported-format diagnostic is emitted.

### Edge Cases

- Statement files may contain one or more invisible encoding markers before the visible header.
- Statement files may use CRLF or LF line endings.
- Statement files may contain quoted amounts, quoted commas, punctuation, repeated spaces, and multilingual text.
- CSV headers that look visually correct but include invisible characters must be normalized before support is determined.
- Unsupported CSV files must not be silently ignored when they are in the statement folder.
- Error output for many failing files must remain readable in a terminal.
- A missing default folder should still produce a clear missing-input diagnostic.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use `./data/statements` as the default statement input folder when the user does not provide a data directory.
- **FR-002**: Users MUST be able to override the default statement folder with an explicit data directory.
- **FR-003**: System MUST support every statement CSV format represented by the current local sample files in `./data`.
- **FR-004**: System MUST recognize supported statement headers even when exported files include invisible encoding markers before the visible first column.
- **FR-005**: System MUST preserve row parsing for supported CSV files with CRLF line endings, quoted numeric values, quoted commas, and multilingual text.
- **FR-006**: System MUST fail the audit when the statement folder contains an unsupported CSV file.
- **FR-007**: System MUST report unsupported CSV files with file-specific diagnostics that identify the file and the unsupported aspect.
- **FR-008**: System MUST format multi-file input errors with line breaks so each file issue is readable without horizontal scrolling.
- **FR-009**: System MUST include expected and received header information for header-related failures in a readable format.
- **FR-010**: System MUST keep successful audit output behavior unchanged for supported statement files except for the default input folder path.
- **FR-011**: System MUST add tests that cover all newly supported input formats, the new default folder, unsupported CSV rejection, and friendly multi-line diagnostics.
- **FR-012**: System MUST pass the existing local CI checks before the changes are committed and pushed.

### Quality & Architecture Requirements

- **QA-001**: Application behavior MUST be independently unit-testable with the configured coverage gate passing locally and in CI.
- **QA-002**: Core behavior MUST remain independent of CLI framework, terminal, web, persistence, and infrastructure concerns.
- **QA-003**: CSV format support MUST be owned by the statement input boundary and not by reporting or audit aggregation behavior.
- **QA-004**: CLI diagnostics MUST define successful output, user-facing errors, and exit-code behavior for unsupported input.
- **QA-005**: Development, tests, generated artifacts, and runtime behavior MUST NOT require MCP servers, clients, protocols, or tooling.

### Key Entities *(include if feature involves data)*

- **Supported Statement Format**: A recognized CSV export shape that can be safely parsed into statement transactions; includes header normalization rules and row parsing expectations.
- **Statement Folder**: The local folder that contains CSV statement files for an audit run; defaults to `./data/statements`.
- **Input Diagnostic**: A user-facing message describing unsupported files, unsafe parsing, missing input, or row-level warnings.
- **Statement File**: A single CSV file processed during an audit, including its path, header, account numbers, transaction count, processing status, and warnings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of CSV files currently present in `./data` are accepted as supported statement formats when placed in the default statement folder.
- **SC-002**: A default audit run uses `./data/statements` without requiring any command-line option.
- **SC-003**: Unsupported CSV files in the statement folder are rejected with a file-specific diagnostic before totals are reported.
- **SC-004**: Multi-file input errors are displayed with at least one separate line per failing file.
- **SC-005**: A user can identify the expected and received header for a header failure from the terminal output without reading source code.
- **SC-006**: All local CI checks pass before push: build, lint, format check, and coverage test.
- **SC-007**: Remote CI reports green after the pushed changes.

## Assumptions

- The local CSV files currently under `./data` are the complete sample set for supported statement export formats in this improvement.
- The visible business column names remain semantically equivalent to the existing statement contract.
- Non-CSV files are not statement inputs and do not need to be parsed as statements.
- The existing explicit `--data-dir` behavior remains available for users with a different folder layout.
- Implementation and tests will happen in a later planning/tasks/implementation phase after this specification is accepted.
