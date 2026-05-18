# Data Model: CLI Help and Aliases

## CLI Invocation

Represents one user request to the command-line adapter.

**Fields**:

- `command`: Optional positional command. Supported value is `audit` for direct binary usage; package script usage may pass only option arguments because `npm run audit` already supplies the command.
- `options`: Parsed option values and booleans.
- `cwd`: Base directory for resolving relative data and output paths.

**Validation Rules**:

- Help requested with `-h` or `--help` is valid without statement inputs.
- Non-help invocations keep the existing requirement that the audit command is selected in direct binary usage.
- Long options remain valid exactly as before.

## CLI Option Definition

Represents a supported option exposed by the audit CLI.

**Fields**:

- `longName`: Canonical option name.
- `shortName`: Optional single-letter alias.
- `valueType`: `boolean` for help, `string` for value-bearing options.
- `description`: Help text shown to users.

**Validation Rules**:

- `help` has short alias `h` and value type `boolean`.
- `from` has short alias `f` and value type `string`.
- `to` has short alias `t` and value type `string`.
- `output` has short alias `o` and value type `string`.
- Existing options without requested aliases keep their current long-option behavior.

## Help Response

Represents the successful response produced when a user asks for command guidance.

**Fields**:

- `exitCode`: Always `0` for recognized help invocations.
- `stdout`: Help message containing usage and supported options.
- `stderr`: Empty for successful help.
- `auditExecuted`: Always `false` for help responses.
- `reportWritten`: Always `false` for help responses.

**Validation Rules**:

- Must include `-h, --help`.
- Must include `-f, --from`.
- Must include `-t, --to`.
- Must include `-o, --output`.
- Must include the existing statement input and output format options.

## Audit Execution Request

Represents the existing call from the CLI adapter into audit behavior after argument parsing.

**Fields**:

- `dataDir`: Resolved statement folder path.
- `dateRange`: Existing validated from/to range.
- `matchingMode`: Existing parsed matching mode.
- `statementSource`: Existing CSV statement source adapter.
- `format`: Existing report output format.
- `outputPath`: Optional resolved report path.

**Validation Rules**:

- Short aliases must populate the same execution request fields as their long-option equivalents.
- Audit execution request semantics must not change for existing long-option invocations.
- Help invocations must not create an audit execution request.
