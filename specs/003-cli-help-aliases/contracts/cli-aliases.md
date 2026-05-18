# Contract: CLI Aliases

## Purpose

Define equivalence between requested short aliases and existing long options.

## Alias Mapping

| Short alias | Long option | Value | Expected behavior |
| ----------- | ----------- | ----- | ----------------- |
| `-f` | `--from` | Date string | Sets the audit range start date exactly like `--from` |
| `-t` | `--to` | Date string | Sets the audit range end date exactly like `--to` |
| `-o` | `--output` | File path | Writes the report to the same destination semantics as `--output` |

## Successful Alias Response

For equivalent valid invocations, short aliases and long options must produce the same observable behavior:

- Same exit code.
- Same stdout report content for stdout-producing commands.
- Same report file content when an output path is provided.
- Same relative-path resolution from the provided current working directory.
- Same audit business results.

## Missing or Invalid Values

Short aliases with missing or invalid values must produce diagnostics and non-success outcomes equivalent to the corresponding long options.

Examples:

- `-f` without a value behaves like `--from` without a value.
- `-t` with an invalid date behaves like `--to` with an invalid date.
- `-o` without a value behaves like `--output` without a value.

## Long-Option Preservation

Existing commands using `--from`, `--to`, and `--output` must continue to work without user-visible changes. Existing tests covering long options remain unchanged.
