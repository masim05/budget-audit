import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CsvStatementSource } from './index.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('CSV statement contract', () => {
  it('normalizes the documented header and row semantics', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(
      join(folder, 'IE_AMD_5600.csv'),
      `${header}\n15/05/2026,Transfer,001,ACC,0.00,"40,000.00",0.00,"40,000.00",Shop,Purchase,Outgoing\n`,
      'utf8',
    );
    const result = await new CsvStatementSource(folder).load();
    expect(result.transactions[0]).toMatchObject({
      date: '2026-05-15',
      transactionNumber: '001',
      accountNumber: 'ACC',
      currency: 'AMD',
      debit: 4000000n,
      debitAmd: 4000000n,
    });
  });
});
