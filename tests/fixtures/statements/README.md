# Statement Fixtures

CSV fixtures must use the exact supported header:

```csv
Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type
```

Fixture folders group scenarios by user story. Each scenario may include an `expected.json` file with the expected report totals and warnings.
