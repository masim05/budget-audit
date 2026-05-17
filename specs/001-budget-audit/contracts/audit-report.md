# Audit Report Contract

## JSON Shape

```json
{
  "audited_folder": "./data",
  "date_range": {
    "from": "2026-05-01",
    "to": "2026-05-31"
  },
  "matching_mode": "strict",
  "account_currencies_found": ["AMD", "USD"],
  "totals": {
    "income_usd": "0.00",
    "spend_usd": "0.00"
  },
  "processed_files": [
    {
      "path": "data/P_USD_5901.csv",
      "status": "processed",
      "transactions_read": 0,
      "warnings": []
    }
  ],
  "excluded_internal_transfers": [
    {
      "match_id": "transfer-1",
      "confidence": "high",
      "transaction_numbers": ["000497", "000497"],
      "usd_amount": "9500.00",
      "evidence": ["same transaction number", "opposite directions", "owned accounts"]
    }
  ],
  "excluded_internal_conversions": [],
  "warnings": []
}
```

## Field Rules

- Money values are strings containing decimal values rounded or formatted according to USD display rules.
- `matching_mode` is `strict` or `permissive`.
- `processed_files[].status` is `processed`, `skipped`, or `failed`.
- `confidence` is `high` or `probable`.
- Warnings must include enough context for the user to locate the affected file and transaction.

## Text Report Requirements

The default text report must include the same information in a readable order:

1. Audited folder and date range
2. Matching mode
3. USD income total
4. USD spend total
5. Excluded internal transfer count
6. Excluded internal currency conversion count
7. File processing summary
8. Warnings
