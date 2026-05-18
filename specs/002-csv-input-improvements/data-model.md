# Data Model: CSV Input Improvements

## SupportedStatementFormat

Represents a CSV export shape that may be loaded as a bank statement.

**Fields**:

- `headerColumns`: ordered list of required statement column names.
- `headerNormalization`: rule set applied before header comparison.
- `filenameCurrencyMarker`: detected `_AMD_` or `_USD_` marker.
- `rowParsingCapabilities`: supported row traits such as CRLF line endings, quoted numbers, quoted commas, punctuation, repeated spaces, and multilingual text.

**Validation rules**:

- Header comparison is exact after stripping leading UTF-8 BOM markers from the first header column only.
- Supported filenames must contain `_AMD_` or `_USD_`.
- CSVs with recognized headers but no supported filename marker are unsupported.
- Reordered columns, missing columns, extra columns, and unknown semantic aliases are unsupported.

## StatementFolder

Represents the local folder selected for an audit run.

**Fields**:

- `path`: resolved local folder path.
- `defaultPath`: `./data/statements` when no data directory is provided.
- `entries`: files discovered in the folder.
- `supportedStatementFiles`: files accepted as supported statement CSVs.
- `unsupportedFiles`: files that block the audit.

**Validation rules**:

- Folder must exist and be readable.
- Folder must contain at least one supported statement CSV.
- Every file in the folder must be a supported statement CSV.
- Any unsupported file produces a blocking diagnostic and no audit totals are reported.

## InputDiagnostic

Represents user-facing diagnostics for invalid statement input.

**Fields**:

- `summary`: short human-readable summary.
- `fileIssues`: ordered list of file-specific blockers.
- `expected`: expected header or supported filename rule, when relevant.
- `received`: received header or filename, when relevant.
- `rowWarnings`: non-blocking row-level warnings for supported files.

**Validation rules**:

- Multi-file blockers must render with line breaks.
- Header mismatch diagnostics must include expected and received headers.
- Unsupported filename diagnostics must mention the `_AMD_` or `_USD_` requirement.
- Diagnostics must remain suitable for stderr.

## StatementFile

Existing processed-file record extended by this feature through clearer unsupported-file semantics.

**Fields**:

- `path`: statement file path.
- `header`: normalized or received header columns.
- `accountNumbers`: account numbers found in supported rows.
- `processingStatus`: `processed` or `failed`.
- `transactionsRead`: count of accepted transactions.
- `warnings`: row warnings or file-level blocker details.

**State transitions**:

- `discovered` -> `processed`: file has supported header and filename marker, and rows are parsed safely.
- `discovered` -> `failed`: file is unsupported or cannot be parsed safely.
- Any `failed` file in the selected statement folder blocks audit totals.
