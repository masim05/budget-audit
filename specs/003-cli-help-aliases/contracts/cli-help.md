# Contract: CLI Help

## Purpose

Define the user-facing behavior for requesting command help.

## Supported Invocations

- `budget-audit --help`
- `budget-audit -h`
- `budget-audit audit --help`
- `budget-audit audit -h`
- `npm run audit -- --help`
- `npm run audit -- -h`

## Successful Help Response

**Exit code**: `0`

**Stdout**:

- Contains a usage line for the audit command.
- Lists the statement input option `--data-dir`.
- Lists date range options `-f, --from` and `-t, --to`.
- Lists output destination option `-o, --output`.
- Lists output format option `--format`.
- Lists matching behavior option `--matching-mode` if it remains supported by the CLI.
- Lists help option `-h, --help`.

**Stderr**: Empty.

## No-Audit Guarantee

When help is requested:

- Statement folders are not read.
- Audit calculations are not run.
- Report files are not written.
- Missing normal audit inputs do not cause a validation failure.
- Other supplied valid audit options do not change the help response.

## Failure Behavior

Recognized help invocations do not fail. Unknown commands or invalid non-help options continue to use existing CLI diagnostics and exit-code behavior.
