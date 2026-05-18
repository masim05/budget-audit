# Quickstart: CSV Input Improvements

## Prerequisites

Install dependencies from the repository root:

```sh
npm install
```

## Prepare Statement Files

Create the default statement folder:

```sh
mkdir -p data/statements
```

Place supported bank statement CSV exports in `data/statements`. Supported files must:

- Use the required statement header after leading UTF-8 BOM markers are stripped from the first header column.
- Include `_AMD_` or `_USD_` in the filename.
- Be parseable as CSV with quoted values, quoted commas, CRLF or LF line endings, and multilingual text.

The required visible header is:

```csv
Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type
```

## Run The Default Audit

```sh
npm run audit
```

The command should read from `./data/statements` without `--data-dir`.

## Override The Statement Folder

```sh
npm run audit -- --data-dir ./path/to/statements
```

The explicit folder must be used instead of `./data/statements`.

## Check Unsupported File Diagnostics

Add an unsupported file to the statement folder, for example `notes.txt`, then run:

```sh
npm run audit
```

Expected behavior:

- The command fails before reporting totals.
- stderr includes a multi-line diagnostic.
- Each unsupported file is listed separately.
- Header failures show expected and received headers.
- Filename failures mention `_AMD_` or `_USD_`.

## Validate Before Commit

Run the same local checks expected by CI:

```sh
npm run build
npm run lint
npm run format:check
npm run test:coverage
```

All checks must pass before commit and push.
