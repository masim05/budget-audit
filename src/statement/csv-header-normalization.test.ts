import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CsvStatementSource } from './index.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('CSV header normalization', () => {
  it('accepts repeated leading BOM markers before the first header column', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(
      join(folder, 'IE_USD_1001.csv'),
      `\uFEFF\uFEFF${header}\n15/05/2026,Transfer,001,ACC,10.00,0.00,"4,000.00",0.00,Employer,Salary,Incoming\n`,
      'utf8',
    );

    const result = await new CsvStatementSource(folder).load();

    expect(result.statementFiles[0]?.header[0]).toBe('Date');
    expect(result.transactions).toHaveLength(1);
  });
});
