# Feature Specification: CLI Help and Aliases

**Feature Branch**: `003-cli-help-aliases`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "implement several improvements: 1. add help message (`-h/--help`) describing possible CLI options 2. implement short alias -f to --from 3. implement short alias -t to --to 4. implement short alias -o to --output cover it with tests. business logic must not change. existing tests must not change. commit, make sure CI checks pass locally, fix errors if any. push. make sure CI checks pass on remote, fix errors if any."

## Clarifications

### Session 2026-05-18

- Q: Which command forms should support help? → A: `npm run audit -- -h` must work, and direct binary help may be requested before or after the `audit` command.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View CLI Help (Priority: P1)

A CLI user can request help from the audit command and see the available command options, including both long option names and their short aliases, without starting an audit run.

**Why this priority**: Discoverability is the highest-value improvement because users need a reliable way to learn the command shape before using or troubleshooting it.

**Independent Test**: Can be fully tested by invoking help with either supported help flag and verifying that the command lists the available options and exits successfully without producing an audit report.

**Acceptance Scenarios**:

1. **Given** the CLI is available, **When** the user requests help with `--help`, **Then** the CLI displays a help message describing supported options and exits successfully without running an audit.
2. **Given** the CLI is available through the package audit script, **When** the user requests help with `npm run audit -- -h`, **Then** the CLI displays the same help information and exits successfully without running an audit.

---

### User Story 2 - Use Short Date Aliases (Priority: P2)

A CLI user can provide the audit date range with `-f` and `-t` as concise alternatives to `--from` and `--to`, while receiving the same audit result as the equivalent long-option command.

**Why this priority**: Date range selection is a routine CLI action, and short aliases reduce friction without changing the task being performed.

**Independent Test**: Can be fully tested by running an audit with `-f` and `-t`, comparing the outcome with the same audit using `--from` and `--to`, and verifying both commands succeed with equivalent results.

**Acceptance Scenarios**:

1. **Given** a valid statement folder and date range, **When** the user runs an audit with `-f` and `-t`, **Then** the CLI applies those dates as the audit range.
2. **Given** the same valid statement folder and date range, **When** the user runs equivalent commands using short and long date options, **Then** both commands complete successfully with equivalent audit behavior.

---

### User Story 3 - Use Short Output Alias (Priority: P3)

A CLI user can provide `-o` as a concise alternative to `--output` and receive the same report destination behavior as the long option.

**Why this priority**: Output selection matters for scripted usage, and the alias should improve ergonomics while preserving existing report semantics.

**Independent Test**: Can be fully tested by running an audit with `-o`, verifying the expected report destination is used, and comparing the behavior with the equivalent `--output` command.

**Acceptance Scenarios**:

1. **Given** a valid audit command and writable output location, **When** the user provides `-o`, **Then** the CLI writes the report to the requested location.
2. **Given** equivalent commands using `-o` and `--output`, **When** both commands are run with the same inputs, **Then** both commands complete successfully with equivalent report destination behavior.

### Edge Cases

- Help requested alongside other valid audit options displays help and exits successfully without running an audit.
- Help requested when normal audit inputs are absent displays help and exits successfully without requiring those inputs.
- Short aliases with missing values produce the same style of user-facing diagnostic and non-success outcome as equivalent long options with missing values.
- Existing commands that use long options continue to work exactly as before.
- Audit calculations, statement parsing, diagnostics unrelated to the new aliases, and report contents remain unchanged.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The CLI MUST support `--help` for the audit command and direct binary help usage, and display a help message that describes available audit options.
- **FR-002**: The CLI MUST support `-h` as an alias for `--help`, including through the package audit script as `npm run audit -- -h`, and display equivalent help information.
- **FR-003**: The help message MUST include the available date range options, output option, statement input option, and any supported short aliases for those options.
- **FR-004**: Requesting help MUST exit successfully without running an audit, reading statement files, or writing a report.
- **FR-005**: The CLI MUST support `-f` as an alias for `--from` with equivalent date range behavior.
- **FR-006**: The CLI MUST support `-t` as an alias for `--to` with equivalent date range behavior.
- **FR-007**: The CLI MUST support `-o` as an alias for `--output` with equivalent report destination behavior.
- **FR-008**: Short aliases MUST accept values in the same user-facing forms as their long-option equivalents.
- **FR-009**: Short aliases with invalid or missing values MUST produce diagnostics and outcomes equivalent to their long-option equivalents.
- **FR-010**: Existing long-option behavior MUST remain unchanged for successful audits, validation failures, diagnostics, output destinations, and exit outcomes.
- **FR-011**: Existing business logic for audit calculations, statement ingestion, internal movement matching, and report content MUST remain unchanged.
- **FR-012**: Existing tests MUST remain intact; coverage for the new CLI help and alias behavior MUST be added through new or additional test coverage.

### Quality & Architecture Requirements

- **QA-001**: Application behavior MUST be independently unit-testable with 100% unit coverage.
- **QA-002**: Core behavior MUST remain independent of CLI framework, terminal, web, persistence, and infrastructure concerns.
- **QA-003**: Features with external interaction MUST identify the applicable inbound adapters, outbound ports, and outbound adapters.
- **QA-004**: CLI behavior MUST define arguments, successful output, diagnostics, and exit codes.
- **QA-005**: Development, tests, generated artifacts, and runtime behavior MUST NOT require MCP servers, clients, protocols, or tooling.
- **QA-006**: The feature MUST pass the repository's local validation checks before delivery.
- **QA-007**: The completed change MUST be committed, pushed, and verified by remote checks before delivery.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of help invocations using `-h` or `--help` display option guidance and exit successfully without producing an audit report.
- **SC-002**: 100% of audit commands using `-f`, `-t`, and `-o` produce outcomes equivalent to matching commands using `--from`, `--to`, and `--output` for the same valid inputs.
- **SC-003**: 100% of existing documented long-option audit workflows continue to complete with unchanged user-visible results.
- **SC-004**: Missing or invalid values for short aliases produce diagnostics equivalent to the corresponding long options in all covered cases.
- **SC-005**: Local validation checks complete successfully before the change is considered ready for remote verification.
- **SC-006**: Remote checks complete successfully after the committed change is pushed.

## Assumptions

- The help message describes the existing audit command and its current user-facing options, whether help is requested before or after the `audit` positional command.
- Help output may be shown when requested even if other audit inputs are incomplete or invalid, because the user is asking for command guidance.
- Alias behavior should match long-option behavior exactly; no new audit filtering, reporting, or parsing semantics are introduced.
- Existing tests are preserved as-is, and new tests are added alongside them to cover the new behavior.
- The repository's established validation commands represent the required local CI checks unless project documentation defines a stricter set.
