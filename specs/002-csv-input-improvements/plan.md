# Implementation Plan: CSV Input Improvements

**Branch**: `001-budget-audit` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-csv-input-improvements/spec.md`

## Summary

Improve statement ingestion so the CLI can audit the real bank CSV exports represented by the current `./data` samples. The implementation will normalize leading UTF-8 BOM markers in the first header column, keep the existing exact column contract, require supported CSV filenames to contain `_AMD_` or `_USD_`, fail with a blocking diagnostic for any unsupported file in the statement folder, default the CLI to `./data/statements`, and format multi-file input errors across readable lines.

The work stays inside the existing Node.js/TypeScript CLI and DDD-style modules. Statement format support remains in the `statement` boundary implementation, CLI defaults and diagnostics remain in `cli`, and audit/report aggregation behavior remains unchanged for supported statements.

## Technical Context

**Language/Version**: Node.js 22 LTS with TypeScript 5.x

**Primary Dependencies**: Node.js standard-library runtime only; existing development dependencies `typescript`, `vitest`, `@vitest/coverage-v8`, `eslint`, `typescript-eslint`, `prettier`, and `@types/node`

**Storage**: Local files only. CSV statement exports are read from a local statement folder; no database or network storage.

**Testing**: Vitest unit and contract tests. The feature must pass `npm run build`, `npm run lint`, `npm run format:check`, and `npm run test:coverage`; implementation validation must prove 100% unit coverage for application code to satisfy the constitution. The configured CI threshold may remain at least 98%, but it is not the feature acceptance bar.

**Target Platform**: Local developer machine and CI runners with Node.js 22 on macOS/Linux

**Project Type**: Single Node.js CLI application with reusable TypeScript core

**Performance Goals**: Statement folder validation and CSV parsing remain linear in the number of files and rows; auditing the current supported sample set completes in under 30 seconds.

**Constraints**: CLI first; future web interface remains possible; no DBs; no MCP dependency; exact CSV column contract after first-column BOM normalization; unsupported files in the statement folder block the audit; successful report semantics remain unchanged except for the default input folder path.

**Scale/Scope**: Minor enhancement to the existing budget audit demo. Scope includes the CSV formats represented by current local `./data` samples, the default folder change to `./data/statements`, and user-facing input diagnostics.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Clean code teaching value: PASS. The plan keeps CSV support in a small statement-format concern, uses explicit diagnostics, and avoids broad parser abstractions beyond the existing boundary.
- Unit coverage: PASS. Tests will target statement ingestion, CLI defaults/diagnostics, and error formatting, preserving 100% coverage for behavior-bearing application code.
- CLI-first scalability: PASS. CLI defaults and stderr formatting are adapter concerns; statement recognition remains callable through the existing statement source boundary.
- Hexagonal boundaries: PASS. The statement source adapter owns local file validation and CSV parsing; audit use cases and report writers remain independent of filesystem and terminal details.
- No MCP dependency: PASS. Development, tests, generated artifacts, and runtime behavior use local Node.js tooling only.

## Project Structure

### Documentation (this feature)

```text
specs/002-csv-input-improvements/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- cli-diagnostics.md
|   `-- statement-folder.md
`-- tasks.md
```

### Source Code (repository root)

```text
src/
|-- statement/
|   |-- index.ts
|   |-- csv-statement-source.ts
|   |-- csv-statement-source.test.ts
|   `-- csv-statement-source.contract.test.ts
|-- cli/
|   |-- index.ts
|   |-- main.ts
|   |-- main.test.ts
|   |-- cli.contract.test.ts
|   |-- budget-audit-cli-flow.test.ts
|   `-- output.ts
|-- audit/
|   |-- audit-service.ts
|   `-- audit-service.test.ts
|-- shared/
|   |-- money.ts
|   |-- date-range.ts
|   `-- project-constraints.test.ts
`-- report/
    |-- text-report-writer.ts
    `-- json-report-writer.ts

tests/
`-- fixtures/
    `-- statements/
        |-- supported-export-formats/
        |-- default-statements-folder/
        `-- unsupported-files/
```

**Structure Decision**: Continue the existing DDD-style folder layout. Implement CSV support and unsupported-file blocking in `src/statement/`; implement the default folder and stderr formatting in `src/cli/`; keep `src/audit/`, `src/report/`, and `src/shared/` behavior unchanged unless tests reveal an integration contract issue. Add fixtures under `tests/fixtures/statements/` rather than relying on ignored local `data/` files.

## Phase 0: Research Summary

Research is captured in [research.md](research.md). Decisions: preserve the exact CSV column contract, strip only leading UTF-8 BOM markers from the first header column, require `_AMD_` or `_USD_` filename markers, treat any unsupported file in the statement folder as a blocker, and render unsafe input diagnostics as multi-line grouped messages.

## Phase 1: Design Summary

Design artifacts are complete:

- [data-model.md](data-model.md) defines supported statement formats, statement folder validation, input diagnostics, and statement file processing status updates.
- [contracts/statement-folder.md](contracts/statement-folder.md) defines supported and unsupported file behavior for statement folder ingestion.
- [contracts/cli-diagnostics.md](contracts/cli-diagnostics.md) defines default folder behavior, stderr shape, and exit-code expectations.
- [quickstart.md](quickstart.md) defines how to arrange sample statements, run default and custom audits, and validate diagnostics.

## Post-Design Constitution Check

- Clean code teaching value: PASS. Design keeps the improvement narrow and names explicit concepts: supported format, unsupported file, and input diagnostic.
- Unit coverage: PASS. Design identifies tests for BOM normalization, filename marker support, unsupported file blocking, multi-file diagnostics, default folder behavior, and custom folder override.
- CLI-first scalability: PASS. CLI output contracts are documented, while statement support remains behind the statement source boundary for reuse by future adapters.
- Hexagonal boundaries: PASS. Filesystem/CSV parsing remains an outbound adapter; CLI remains an inbound adapter; audit/report domain behavior remains isolated.
- No MCP dependency: PASS. No MCP servers, clients, protocols, or tooling are part of implementation or validation.

## Complexity Tracking

No constitution violations requiring justification.
