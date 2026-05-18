# Implementation Plan: CLI Help and Aliases

**Branch**: `003-cli-help-aliases` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-cli-help-aliases/spec.md`

## Summary

Add discoverable CLI help for the existing audit command and concise aliases for the date range and output options. The implementation stays in the CLI adapter: parse `-h`/`--help`, render a help message without invoking audit behavior, map `-f` to `--from`, `-t` to `--to`, and `-o` to `--output`, and preserve the existing audit, statement ingestion, matching, and report business logic unchanged.

## Technical Context

**Language/Version**: Node.js 22 LTS with TypeScript 5.x

**Primary Dependencies**: Node.js standard-library runtime only, using the existing `node:util` `parseArgs` support for option aliases; existing development dependencies `typescript`, `vitest`, `@vitest/coverage-v8`, `eslint`, `typescript-eslint`, `prettier`, and `@types/node`

**Storage**: Local files only. This feature must not add persistence or change statement/report file semantics.

**Testing**: Vitest unit and contract tests. Validation must pass `npm run build`, `npm run lint`, `npm run format:check`, and `npm run test:coverage`, preserving 100% unit coverage for application code.

**Target Platform**: Local developer machine and CI runners with Node.js 22 on macOS/Linux

**Project Type**: Single Node.js CLI application with reusable TypeScript core

**Performance Goals**: Help rendering completes without filesystem statement reads or audit execution; alias parsing adds no measurable overhead to normal audit execution.

**Constraints**: CLI adapter change only; business logic must not change; existing tests must not change; add tests for new help and alias behavior; `npm run audit -- -h` must display help successfully; generated artifacts, tests, and runtime behavior must not depend on MCP tooling.

**Scale/Scope**: Small CLI ergonomics enhancement covering help text and aliases for `from`, `to`, and `output`; no new commands, report formats, statement parsing behavior, or audit calculations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Clean code teaching value: PASS. The feature keeps parsing and help text in the CLI adapter and avoids adding a CLI framework or broader parser abstraction.
- Unit coverage: PASS. Tests will cover help output, no-audit help behavior, short alias equivalence, and existing long-option preservation without modifying existing tests.
- CLI-first scalability: PASS. The plan defines arguments, stdout/stderr expectations, and exit codes while keeping core audit behavior callable independently of terminal presentation.
- Hexagonal boundaries: PASS. The CLI inbound adapter translates arguments into existing audit use case calls; statement source and report output adapters remain unchanged.
- No MCP dependency: PASS. Planning, implementation, tests, and runtime behavior rely only on local repository scripts and Node tooling.

## Project Structure

### Documentation (this feature)

```text
specs/003-cli-help-aliases/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- cli-help.md
|   `-- cli-aliases.md
`-- tasks.md
```

### Source Code (repository root)

```text
src/
|-- cli/
|   |-- main.ts
|   |-- cli.contract.test.ts
|   |-- budget-audit-cli-flow.test.ts
|   `-- main.test.ts
|-- audit/
|   |-- audit-service.ts
|   `-- audit-service.test.ts
|-- statement/
|   |-- csv-statement-source.ts
|   `-- csv-statement-source.test.ts
|-- internal-movement/
|   `-- internal-movement-matcher.ts
|-- report/
|   |-- text-report-writer.ts
|   `-- json-report-writer.ts
`-- shared/
  |-- date-range.ts
  `-- money.ts

tests/
`-- fixtures/
  `-- statements/
```

**Structure Decision**: Keep all behavior in the existing single TypeScript CLI project. Implement the option aliases and help rendering in `src/cli/main.ts`, add or extend CLI-focused tests under `src/cli/`, and avoid touching audit, statement, internal movement, report, or shared business modules unless tests expose a direct integration contract issue.

## Phase 0: Research Summary

Research is captured in [research.md](research.md). Decisions: use Node `parseArgs` alias support, treat help as an early successful CLI adapter response, keep help text deterministic and testable, and verify alias behavior by comparing observable CLI outcomes with long-option commands.

## Phase 1: Design Summary

Design artifacts are complete:

- [data-model.md](data-model.md) defines the CLI invocation, option definition, help response, and audit execution request concepts.
- [contracts/cli-help.md](contracts/cli-help.md) defines supported help invocations, output destination, exit code, and no-audit behavior.
- [contracts/cli-aliases.md](contracts/cli-aliases.md) defines alias equivalence, missing-value behavior, and long-option preservation.
- [quickstart.md](quickstart.md) defines local validation commands and manual smoke checks for help and aliases.

## Post-Design Constitution Check

- Clean code teaching value: PASS. The design keeps command parsing explicit and localized and documents the small behavior surface.
- Unit coverage: PASS. Contracts identify tests for help, alias equivalence, missing values, and unchanged long options; coverage validation remains required.
- CLI-first scalability: PASS. CLI contracts are documented through stdout/stderr, arguments, and exit codes while preserving core use case boundaries.
- Hexagonal boundaries: PASS. The CLI remains the inbound adapter; existing audit use case, statement source outbound adapter, and report writer behavior remain unchanged.
- No MCP dependency: PASS. No MCP servers, clients, protocols, or tooling are introduced.

## Complexity Tracking

No constitution violations requiring justification.
