# CLI Contract: Budget Audit

## Command

`budget-audit audit [OPTIONS]`

The default command audits CSV statements in `./data` for the previous full calendar month and writes a human-readable summary to stdout.

## Options

| Option | Required | Default | Description |
| ------ | -------- | ------- | ----------- |
| `--data-dir PATH` | No | `./data` | Folder containing CSV statement files. |
| `--from YYYY-MM-DD` | No | First day of previous full calendar month | Inclusive audit start date. |
| `--to YYYY-MM-DD` | No | Last day of previous full calendar month | Inclusive audit end date. |
| `--matching-mode strict\|permissive` | No | `strict` | Controls ambiguous internal transfer/conversion handling. |
| `--format text\|json` | No | `text` | Output format for the audit report. |
| `--output PATH` | No | stdout only | Optional file path for saving the report; file storage only, no database. |

## Exit Codes

| Code | Meaning |
| ---- | ------- |
| `0` | Audit completed successfully. Warnings may be present in the report. |
| `1` | Invalid CLI arguments, invalid date range, or invalid matching mode. |
| `2` | Input folder is missing or contains no statement files. |
| `3` | One or more statement files could not be parsed safely enough to produce final totals. |
| `4` | Unexpected application error. |

## Stdout

For `--format text`, stdout contains:

- Audited folder
- Date range
- Matching mode
- Account currencies found
- USD income total
- USD spend total
- Count of excluded internal transfers
- Count of excluded internal currency conversions
- Warning summary

For `--format json`, stdout contains an `AuditReport` JSON document matching [audit-report.md](audit-report.md).

## Stderr

Stderr is reserved for diagnostics that prevent normal output, including invalid arguments, missing folders, unreadable files, and unexpected errors.

## Examples

```bash
budget-audit audit
budget-audit audit --data-dir ./data --from 2026-05-01 --to 2026-05-31
budget-audit audit --matching-mode permissive --format json --output reports/may-2026.json
```
