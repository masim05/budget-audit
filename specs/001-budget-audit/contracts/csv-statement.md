# CSV Statement Contract

## Purpose

Defines the v1 local file input accepted by the statement source adapter.

## File Discovery

- The adapter scans the selected folder for `*.csv` files.
- The default folder is `./data`.
- Subdirectories are out of scope for v1 unless explicitly added in a future feature.

## Required Header

The first row must exactly match:

```csv
Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type
```

## Column Semantics

| Column | Required | Description |
| ------ | -------- | ----------- |
| `Date` | Yes | Transaction date from the statement export. |
| `Transaction Type` | Yes | Bank-provided transaction category. |
| `Transaction Number` | Yes | Bank-provided transaction identifier. |
| `Account Number` | Yes | Account number for the statement row. |
| `Credit` | Conditional | Original incoming amount in the account transaction currency, which may be AMD or USD. Populated credit means positive cash flow before exclusions. |
| `Debit` | Conditional | Original outgoing amount in the account transaction currency, which may be AMD or USD. Populated debit means negative cash flow before exclusions. |
| `Credit(AMD)` | Conditional | AMD-normalized incoming amount used as the basis for final reporting currency conversion. |
| `Debit(AMD)` | Conditional | AMD-normalized outgoing amount used as the basis for final reporting currency conversion. |
| `Remitter/Beneficiary` | Yes | Counterparty or related party text. |
| `Details` | Yes | Description/details text. |
| `Type` | Yes | Bank-provided direction label, such as `Incoming` or `Outgoing`. |

## Row Rules

- Rows are included only when `Date` falls within the inclusive audit range.
- Normal rows have either credit fields populated or debit fields populated, not both.
- Amounts may include thousands separators and must parse to exact decimal values.
- Empty numeric cells are treated as absent; explicit zero values do not create income or spend.
- Rows missing required identity, date, or amount data are reported and excluded from final totals when unsafe.
- Header mismatch is a parsing failure for that file.

## Adapter Output

Each valid row becomes a normalized `Transaction` with:

- Source file path
- Date
- Transaction type
- Transaction number
- Account number
- Original credit/debit amounts
- AMD-normalized credit/debit amounts
- Remitter or beneficiary
- Details
- Type/direction
