# Contract: CLI Defaults And Diagnostics

## Command

```text
budget-audit audit [OPTIONS]
```

The local development entrypoint remains:

```text
npm run audit -- [OPTIONS]
```

## Input Folder Selection

- Without `--data-dir`, the CLI uses `./data/statements` relative to the current working directory.
- With `--data-dir <path>`, the CLI uses the provided path.
- Relative explicit paths are resolved from the current working directory.

## Successful Output

For supported statement folders, successful stdout and report formatting remain unchanged except that the processing summary reflects `./data/statements` when the default is used.

## Blocking Input Diagnostics

Unsupported input errors are written to stderr and formatted across multiple lines.

Minimum diagnostic shape:

```text
Input error: statement folder contains unsupported files.

Unsupported files:
- bad-export.csv: unsupported CSV header.
  Expected: Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type
  Received: Posted Date,Description,Amount
- notes.txt: unsupported file type. Statement folders may contain only supported CSV statement files.
- card-export.csv: unsupported filename. Expected `_AMD_` or `_USD_` in the file name.
```

## Exit Codes

- Supported input preserves existing success behavior and exit code `0`.
- Missing input folder preserves the existing invalid-input failure category and uses a clear missing-folder diagnostic.
- Unsupported files, unsupported headers, unsupported filename currency markers, and unsafe parse blockers use the existing unsafe-input failure category.

## Test Expectations

Contract tests must verify:

- The default folder is `./data/statements`.
- `--data-dir` overrides the default.
- Multiple unsupported files render on separate lines.
- Header mismatch diagnostics include expected and received headers.
- Filename marker diagnostics mention `_AMD_` or `_USD_`.
- Successful audit output for supported files is unchanged aside from the default folder path.
