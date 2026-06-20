# Budget Audit

Budget Audit is a local Node.js CLI for auditing bank statement CSV exports. It reads statement files from `./data/statements` by default, filters transactions by date range, excludes own-account transfers and currency conversions, and reports income and spend totals in USD.

## Install

```bash
npm install
npm run build
```

## Run

For local development, run the CLI through npm after building:

```bash
npm run audit
npm run audit -- -h
npm run audit -- --data-dir ./data/statements --from 2026-05-01 --to 2026-05-31
npm run audit -- -f 2026-05-01 -t 2026-05-31
npm run audit -- --matching-mode permissive --format json --output reports/may-2026.json
npm run audit -- -f 2026-05-01 -t 2026-05-31 -o reports/may-2026.json
```

To make the `budget-audit` command available directly in your shell, link the package first:

```bash
npm link
```

Then run:

```bash
budget-audit -h
budget-audit audit
budget-audit audit --data-dir ./data/statements --from 2026-05-01 --to 2026-05-31
budget-audit audit -f 2026-05-01 -t 2026-05-31
budget-audit audit --matching-mode permissive --format json --output reports/may-2026.json
budget-audit audit -f 2026-05-01 -t 2026-05-31 -o reports/may-2026.json
```

## CSV Header

```csv
Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type
```

`Credit` and `Debit` contain original AMD or USD amounts. `Credit(AMD)` and `Debit(AMD)` contain AMD-normalized amounts used for reporting conversion when the source currency is AMD.

Statement folders may contain only supported CSV statement files. A supported file must use the required header after leading UTF-8 BOM markers are stripped from the first header column, and its filename must contain `_AMD_` or `_USD_`. Unsupported files fail the audit before totals are reported and are listed one file per line in stderr with the unsupported aspect and header details when applicable.

## Matching Mode

Strict matching is the default and excludes only high-confidence internal movements. Permissive mode may exclude probable internal movements and reports those decisions as warnings.

## Architecture Notes

The project is CLI-first, uses DDD-style domain folders with exported boundary interfaces, and does not require a database, network service, or MCP dependency. Future source adapters, such as a bank API or web interface, should reuse the domain use cases without changing domain behavior.

# Cluster command

Examples:

```bash
npm run cluster -- --from 2026-05-01 --to 2026-05-31
npm run cluster -- -sf ./data/statements -cf ./data/checks -v
npm run cluster -- -a 2 --cluster-other
```

`config/clusters.yml` stores normalized receiver mappings, regex patterns, and the set of supported cluster names. The cluster report groups THB spend transactions only and does not perform cross-currency conversion. Copy `config/clusters.example.yml` to `config/clusters.yml` before the first run.
