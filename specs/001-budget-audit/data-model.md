# Data Model: Budget Audit

## StatementFile

Represents one CSV export file discovered in the selected input folder.

**Fields**:

- `path`: Path to the CSV file.
- `header`: Ordered list of CSV column names.
- `account_numbers`: Account numbers observed in rows.
- `processing_status`: `processed`, `skipped`, or `failed`.
- `warnings`: Non-fatal issues found while reading the file.

**Validation Rules**:

- Header must exactly match `Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type`.
- File must be readable as CSV text.
- Rows missing required values are invalid and must be reported.

**Relationships**:

- Contains zero or more `Transaction` records.

## StatementSourceAdapter

Represents an inbound adapter that supplies normalized transactions to the audit core.

**Fields**:

- `source_name`: Human-readable source identifier, such as `csv-folder`.
- `source_location`: Folder path, API label, or future source identifier.
- `statement_files`: Statement files or source batches processed.

**Validation Rules**:

- v1 source adapter must read local CSV files only.
- Future bank API adapters must produce the same normalized transaction shape.

**Relationships**:

- Produces `Transaction` records for an `AuditRun`.

## Account

Represents an own account inferred from statement rows.

**Fields**:

- `account_number`: Account number from the CSV row.
- `display_name`: Optional friendly name derived from source context or configuration.
- `observed_currencies`: Account currencies inferred from files or transaction evidence when available.

**Validation Rules**:

- Account number must be present for every transaction.
- All accounts represented in the selected input folder are treated as owned accounts.

**Relationships**:

- Has many `Transaction` records.

## Transaction

Represents a dated movement of money on an account.

**Fields**:

- `date`: Transaction date.
- `transaction_type`: CSV `Transaction Type` value.
- `transaction_number`: CSV `Transaction Number` value.
- `account_number`: CSV `Account Number` value.
- `credit`: Original credit amount as exact minor units, if present.
- `debit`: Original debit amount as exact minor units, if present.
- `credit_amd`: AMD-normalized credit amount as exact minor units, if present.
- `debit_amd`: AMD-normalized debit amount as exact minor units, if present.
- `remitter_or_beneficiary`: CSV `Remitter/Beneficiary` value.
- `details`: CSV `Details` value.
- `direction_type`: CSV `Type` value, such as `Incoming` or `Outgoing`.
- `source_file`: Source `StatementFile` path.
- `classification`: `income`, `spend`, `internal_transfer`, `internal_conversion`, `ambiguous_internal_candidate`, or `invalid`.

**Validation Rules**:

- Date must parse using the documented statement date format.
- Exactly one side of original credit/debit should be populated for normal transactions.
- Exactly one side of AMD-normalized credit/debit should be used as the basis for USD totals when final classification is income or spend.
- Amount parsing must preserve decimal precision and accept thousands separators.
- Rows with both credit and debit populated, both empty, or missing AMD-normalized totals are reported as warnings or invalid according to severity.

**Relationships**:

- Belongs to one `Account`.
- May participate in one `InternalTransferMatch` or `InternalCurrencyConversionMatch`.

## MatchingMode

Represents the user's per-run choice for uncertain internal movement handling.

**Fields**:

- `value`: `strict` or `permissive`.
- `is_default`: True for `strict` when no option is provided.

**Validation Rules**:

- Only `strict` and `permissive` are accepted.
- Strict mode excludes high-confidence matches only.
- Permissive mode may exclude probable matches but must report lower-confidence exclusions.

**State Transitions**:

- Default state is `strict`.
- A CLI option may set state to `permissive` for the current run only.

## InternalTransferMatch

Represents matched own-account transactions that move funds without changing external income or spend.

**Fields**:

- `match_id`: Stable identifier for the match.
- `transaction_ids`: Two or more matched transaction identifiers.
- `confidence`: `high` or `probable`.
- `evidence`: Dates, transaction numbers, account numbers, amounts, details, and counterparties supporting the match.
- `included_in_totals`: Always false when excluded as a match.

**Validation Rules**:

- Same-currency transfers require opposite directions and compatible original or AMD-normalized amounts.
- Strict mode excludes only high-confidence matches.
- Permissive mode may exclude probable matches and must warn.

**Relationships**:

- References matched `Transaction` records.

## InternalCurrencyConversionMatch

Represents matched own-account transactions that exchange currencies without changing external income or spend.

**Fields**:

- `match_id`: Stable identifier for the match.
- `transaction_ids`: Matched transaction identifiers.
- `confidence`: `high` or `probable`.
- `evidence`: Dates, transaction numbers, account numbers, original amounts, AMD-normalized amounts, details, and counterparties supporting the match.
- `included_in_totals`: Always false when excluded as a match.

**Validation Rules**:

- Conversion sides may have different original amounts and account currencies.
- AMD-normalized values and transaction evidence must support the match.
- Strict mode excludes only high-confidence matches.
- Permissive mode may exclude probable matches and must warn.

**Relationships**:

- References matched `Transaction` records.

## AuditRun

Represents one execution of the audit.

**Fields**:

- `input_folder`: Folder path audited.
- `start_date`: Inclusive start date.
- `end_date`: Inclusive end date.
- `matching_mode`: Selected `MatchingMode`.
- `statement_files`: Files processed.
- `transactions`: Transactions considered.

**Validation Rules**:

- Default input folder is `./data`.
- Default date range is previous full calendar month.
- Start date must be on or before end date.

**State Transitions**:

- `configured` -> `loaded` after statements are read.
- `loaded` -> `classified` after transfer/conversion matching.
- `classified` -> `reported` after report generation.
- Any state may transition to `failed` for fatal input or validation errors.

## AuditReport

Represents the final audit output.

**Fields**:

- `audited_folder`: Folder path audited.
- `date_range`: Inclusive date range.
- `matching_mode`: Matching mode used.
- `account_currencies_found`: Currencies inferred from source data.
- `usd_income_total`: Final external income total in USD.
- `usd_spend_total`: Final external spend total in USD.
- `processed_files`: File processing summary.
- `excluded_internal_transfers`: Transfer matches excluded from totals.
- `excluded_internal_conversions`: Conversion matches excluded from totals.
- `warnings`: Ambiguous matches, invalid rows, unreadable files, duplicate candidates, and unsupported records.

**Validation Rules**:

- Internal transfers and conversions must not affect `usd_income_total` or `usd_spend_total`.
- Report must identify warnings when any data could not be processed confidently.
- Zero totals are valid only when no external transactions exist in the audited range.
