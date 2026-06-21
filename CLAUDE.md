# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build            # tsc -> dist/ (required before npm run audit/cluster)
npm test                 # vitest run (all tests)
npm run test:coverage    # vitest with v8 coverage (enforces 98% thresholds)
npm run lint             # eslint .
npm run format:check     # prettier --check
npm run format           # prettier --write

npx vitest run src/checks/openai-check-parser.test.ts   # run a single test file
npx vitest run -t "uses image/png mime"                 # run tests matching a name
```

Run the CLI locally after building (`npm run build` first):

```bash
npm run audit -- -f 2026-05-01 -t 2026-05-31
npm run cluster -- -f 2026-06-01 -t 2026-06-15        # add -co for interactive --cluster-other
```

The `cluster` command needs `OPENAI_API_KEY` in the environment or a `.env` file at the repo root.

## Hard rules (from CONTRIBUTING.md)

- **All implementation work happens in a Git worktree under `tmp/wts/`.** Feature work and bug-fix work go in *separate* worktrees — never mix them. (`tmp/` is gitignored and eslint-ignored.)
- **Every new class needs unit tests covering its public methods**, added/updated before opening a PR.
- **Work-item artifacts live only in `specs/<id>-<work-item-short-name>/`** (`spec.md`, `plan.md`, `tasks.md`, `contracts/`, etc.). Existing specs: `001-budget-audit`, `002-csv-input-improvements`, `003-cli-help-aliases`, `004-spend-clustering`.

## Architecture

CLI-first, ESM TypeScript (`"type": "module"`, `module: NodeNext`). **Imports must use explicit `.js` extensions** even for `.ts` source files (NodeNext resolution). No database, network service, or MCP runtime dependency is allowed — this is asserted by `src/shared/project-constraints.test.ts`.

Code is organized into **DDD-style domain folders**, each exposing its public surface through an `index.ts` barrel; cross-domain imports go through those barrels, not deep paths. `src/index.ts` re-exports every domain.

- `cli/` — entrypoint (`main.ts`, the `budget-audit` bin). Parses args with `node:util` `parseArgs`, dispatches the `audit` and `cluster` subcommands, and wires concrete adapters (`CsvStatementSource`, `PdfStatementSource`, `OpenAiCheckParser`) into domain use cases. CLI behavior is locked down by many `*.contract.test.ts` files here.
- `statement/` — loads/validates statement files. `CsvStatementSource` (audit) and the supported-format/diagnostic logic that *blocks* the run when a folder contains unsupported files (wrong header after BOM strip, missing `_AMD_`/`_USD_` in filename).
- `transaction/` — the `Transaction` domain type and `classifyExternalTransaction` (income vs spend vs internal).
- `internal-movement/` — detects own-account transfers / currency conversions to exclude. `strict` (default, high-confidence only) vs `permissive` (probable, reported as warnings) matching modes.
- `audit/` — `runAudit` use case: filter by date range, exclude internal movements, total income/spend.
- `cluster/` — `runCluster` use case: groups THB spend by recipient, enriching recipients from check images and a persisted recipient→cluster mapping (`data/clusters/mapping.yml`). PDF statements via `PdfStatementSource`. `--cluster-other` runs an interactive flow that writes new assignments back to the mapping config and re-clusters.
- `checks/` — `CheckParser` interface and `OpenAiCheckParser`, which sends check images to the OpenAI responses API to extract recipient/amount. `parseChecks` is called once in `main.ts` and the result is passed into `runCluster` (and reused on the `--cluster-other` re-run) to avoid redundant API calls.
- `report/` — text and JSON report writers.
- `shared/` — date-range filtering and money. **Money is handled as `bigint` minor units** (e.g. `amountMinor`); AMD amounts are normalized to USD via `convertAmdToUsdMinor`.

Adapter pattern: domain use cases depend on interfaces (`StatementSource`, `CheckParser`), so new sources (bank API, web UI) plug in without changing domain logic.

## Testing conventions

- Vitest, with **98% line/function/branch/statement coverage thresholds** enforced (`vitest.config.ts`). `index.ts` barrels and a few thin files are excluded from coverage.
- Use `/* v8 ignore next */` (already used across the codebase) for genuinely unreachable branches.
- `*.contract.test.ts` = externally-observable CLI/output behavior; `*.test.ts` = unit tests; `*.test-helper.ts` files are excluded from build and coverage.
