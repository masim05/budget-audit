# Contract: Statement Folder Input

## Default Folder

When no data directory is provided, the audit reads statements from:

```text
./data/statements
```

An explicit data directory overrides this default.

## Supported Files

A file in the statement folder is supported only when all of the following are true:

1. It is a CSV statement file.
2. Its filename contains `_AMD_` or `_USD_`.
3. Its parsed header exactly matches the required statement header after stripping leading UTF-8 BOM markers from the first header column.
4. Its rows can be parsed with the existing CSV row rules, including quoted values, quoted commas, CRLF or LF line endings, repeated spaces, punctuation, and multilingual text.

Required header:

```csv
Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type
```

## Unsupported Files

Any unsupported file in the statement folder is a blocker. The audit must not report totals when blockers are present.

Unsupported examples:

- Non-CSV files in the statement folder.
- CSV files with a missing, reordered, extra, or aliased header column.
- CSV files whose visible header is correct but whose filename lacks `_AMD_` or `_USD_`.
- Unreadable files.

## Success Contract

For a folder containing only supported statement files:

- The audit proceeds normally.
- Each file appears in the processing summary.
- Row-level parse warnings may be reported without turning the whole file unsupported, as long as totals remain safe.

## Failure Contract

For a folder containing one or more unsupported files:

- Exit code remains the unsafe-input exit code.
- No totals are reported.
- Diagnostics identify each blocking file.
- Header-related failures include expected and received headers.
- Filename-related failures mention the `_AMD_` or `_USD_` requirement.
