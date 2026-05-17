# Quickstart: Budget Audit

## Prerequisites

- Node.js 22 LTS
- Local CSV statement exports in `./data` or another folder
- No database and no MCP services are required

## Install For Development

```bash
npm install
npm run build
```

## Validate Statement Input

CSV files must use this exact header:

```csv
Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type
```

## Run The Default Audit

Audits `./data` for the previous full calendar month using strict matching:

```bash
npm run audit
```

## Run A Custom Audit

```bash
npm run audit -- --data-dir ./data --from 2026-05-01 --to 2026-05-31
```

## Use Permissive Matching

```bash
npm run audit -- --matching-mode permissive
```

## Write JSON Report To A File

```bash
npm run audit -- --format json --output reports/may-2026.json
```

To use `budget-audit audit` directly during local development, run `npm link` once after building.

The report file is optional local file output. The application must not require a database.

## Run Quality Checks

```bash
npm run lint
npm run format:check
npm run test:coverage
```

## Expected Behavior

- Internal transfers between own accounts do not affect final totals.
- Internal currency conversions between own accounts do not affect final totals.
- Final income and spend totals are reported in USD.
- Strict matching is the default.
- Ambiguous data is reported in warnings rather than hidden.
