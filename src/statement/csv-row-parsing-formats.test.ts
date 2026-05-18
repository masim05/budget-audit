import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CsvStatementSource } from './index.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('CSV row parsing formats', () => {
  it('preserves CRLF rows, quoted numeric values, quoted commas, and multilingual text', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(
      join(folder, 'IE_USD_1001.csv'),
      `${header}\r\n15/05/2026,Transfer,001,ACC,"1,000.00",0.00,"400,000.00",0.00,"ACME, Inc.","Աշխատավարձ, May",Incoming\r\n`,
      'utf8',
    );

    const result = await new CsvStatementSource(folder).load();
    const transaction = result.transactions[0];

    expect(transaction?.credit).toBe(100000n);
    expect(transaction?.creditAmd).toBe(40000000n);
    expect(transaction?.remitterOrBeneficiary).toBe('ACME, Inc.');
    expect(transaction?.details).toBe('Աշխատավարձ, May');
  });
});
