# Implementation Plan: Budget Audit

**Branch**: `001-budget-audit` | **Date**: 2026-05-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-budget-audit/spec.md`

## Summary

Build a Node.js CLI tool that audits CSV bank statement exports from `./data` by
default, filters transactions by date range, excludes own-account transfers and
currency conversions, and reports final income and spend totals in USD. The core
audit behavior will be isolated behind hexagonal boundaries so a future web UI or
bank API source adapter can reuse the same use cases without changing domain
logic. No database will be used; local files are used only for statement input,
fixtures, and optional report output.

## Technical Context

**Language/Version**: Node.js 22 LTS with TypeScript 5.x

**Primary Dependencies**: Node.js standard-library runtime (`node:fs`,
`node:path`, `node:stream`, `node:util`, `node:test` compatible APIs where
useful); development dependencies `typescript`, `vitest`, `@vitest/coverage-v8`,
`eslint`, and `prettier`

**Storage**: Local files only. CSV files are input; optional report export writes
JSON/text files. No database.

**Testing**: Vitest unit tests with branch coverage enforced at 100%; contract
tests for CLI, CSV header parsing, and audit report JSON shape

**Target Platform**: Local developer machine with Node.js 22 on macOS/Linux;
portable CLI behavior with no network requirement

**Project Type**: Single Node.js CLI application with reusable TypeScript core

**Performance Goals**: Complete an audit of up to 24 monthly CSV statement files
in under 30 seconds; parse and classify statement rows deterministically using
exact minor-unit money arithmetic

**Constraints**: CLI first with future web interface possible; no DBs; no MCP
dependency in development, tests, generated artifacts, or runtime; strict CSV
header validation; final totals in USD; strict matching default

**Scale/Scope**: Personal budget audit demo for a folder of bank CSV exports;
v1 supports local CSV ingestion and optional local report files only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Clean code teaching value: PASS. The plan keeps runtime dependencies minimal,
  separates domain concepts into small modules, and avoids abstractions beyond
  ports/adapters needed for source and presentation boundaries.
- Unit coverage: PASS. Behavior-bearing domain folders, boundary interfaces,
  local implementations, and CLI mapping must preserve 100% branch coverage.
- CLI-first scalability: PASS. [contracts/cli.md](contracts/cli.md) defines the
  CLI contract while domain use cases remain independent of `node:util`
  argument parsing, stdout, and stderr.
- Hexagonal boundaries: PASS. Domain folders own their public interfaces,
  implementations, and tests. Source/report boundaries are represented through
  exported interfaces in their owning folders.
- No MCP dependency: PASS. No MCP server, client, protocol, or tool is required
  by the planned application, tests, generated artifacts, or runtime commands.

## Project Structure

### Documentation (this feature)

```text
specs/001-budget-audit/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- audit-report.md
|   |-- cli.md
|   `-- csv-statement.md
`-- tasks.md
```

### Source Code (repository root)

```text
package.json
tsconfig.json
eslint.config.js
prettier.config.js
src/
|-- audit/
|   |-- index.ts # public interfaces and exports
|   |-- audit-service.ts
|   |-- audit-service.test.ts
|   |-- audit-run.ts
|   `-- audit-report.ts
|-- statement/
|   |-- index.ts # public interfaces and exports
|   |-- statement-file.ts
|   |-- csv-statement-source.ts
|   |-- csv-statement-source.test.ts
|   `-- csv-statement-source.contract.test.ts
|-- transaction/
|   |-- index.ts # public interfaces and exports
|   |-- transaction.ts
|   |-- classification.ts
|   `-- classification.test.ts
|-- internal-movement/
|   |-- index.ts # public interfaces and exports
|   |-- matching-mode.ts
|   |-- internal-match.ts
|   |-- internal-movement-matcher.ts
|   `-- internal-movement-matcher.test.ts
|-- report/
|   |-- index.ts # public interfaces and exports
|   |-- audit-report.contract.test.ts
|   |-- json-report-writer.ts
|   |-- json-report-writer.test.ts
|   |-- text-report-writer.ts
|   `-- text-report-writer.test.ts
|-- shared/
|   |-- index.ts # public interfaces and exports
|   |-- date-range.ts
|   |-- date-range.test.ts
|   |-- money.ts
|   |-- money.test.ts
|   `-- project-constraints.test.ts
|-- cli/
|   |-- index.ts # public interfaces and exports
|   |-- main.ts
|   |-- main.test.ts
|   |-- cli.contract.test.ts
|   |-- budget-audit-cli-flow.test.ts
|   `-- output.ts
`-- index.ts

tests/
`-- fixtures/
    `-- statements/
```

**Structure Decision**: Use a single Node.js/TypeScript package with DDD-style
feature/domain folders and colocated tests. `audit` owns the audit use case and
report model. `statement` owns statement input interfaces and CSV ingestion.
`transaction` owns transaction entities and classification. `internal-movement`
owns transfer/conversion matching. `report` owns report-writer interfaces and
implementations. `shared` owns cross-domain money/date helpers. `cli` remains an
inbound adapter that maps command-line arguments to domain use cases and formats
exit behavior. Future web or bank API support should add or reuse adapters
without changing domain behavior.

## Phase 0: Research Summary

Research decisions are captured in [research.md](research.md): Node.js 22,
TypeScript, Node standard-library runtime, local file storage only, strict CSV
contract, USD final totals from AMD-normalized columns, Vitest coverage and
ESLint/Prettier quality tooling, and strict matching as the default.

## Phase 1: Design Summary

Design artifacts are complete:

- [data-model.md](data-model.md) defines statement files, boundary adapters, accounts,
  transactions, matching mode, internal matches, audit runs, and reports.
- [contracts/cli.md](contracts/cli.md) defines command options, stdout/stderr,
  and exit codes.
- [contracts/csv-statement.md](contracts/csv-statement.md) defines file discovery,
  required CSV header, row semantics, and normalized adapter output.
- [contracts/audit-report.md](contracts/audit-report.md) defines JSON report shape
  and text report content.
- [quickstart.md](quickstart.md) defines setup, run, custom audit, permissive mode,
  optional JSON file output, and quality checks.

## Post-Design Constitution Check

- Clean code teaching value: PASS. Design keeps domain folders cohesive and uses
  boundary interfaces only where they protect real source/output boundaries.
- Unit coverage: PASS. The structure identifies behavior-bearing modules and
  contract tests; quickstart requires 100% branch coverage.
- CLI-first scalability: PASS. CLI is an adapter; domain behavior is reusable by
  a future web interface.
- Hexagonal boundaries: PASS. Statement input and report output are boundary
  interfaces with local implementations in their domain folders; matching,
  classification, and totals remain independent of CLI and filesystem details.
- No MCP dependency: PASS. All setup and runtime commands rely on local Node.js
  tooling only.

## Complexity Tracking

No constitution violations requiring justification.
