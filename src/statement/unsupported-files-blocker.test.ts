import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CsvStatementSource, UnsafeStatementError } from './index.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('unsupported file blockers', () => {
  it('rejects non-CSV files instead of ignoring them', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(join(folder, 'notes.txt'), 'notes\n', 'utf8');
    await writeFile(
      join(folder, 'IE_USD_1001.csv'),
      `${header}\n15/05/2026,Transfer,001,ACC,10.00,0.00,"4,000.00",0.00,Employer,Salary,Incoming\n`,
      'utf8',
    );

    await expect(new CsvStatementSource(folder).load()).rejects.toBeInstanceOf(
      UnsafeStatementError,
    );
    await expect(new CsvStatementSource(folder).load()).rejects.toThrow(
      '- notes.txt: unsupported file type',
    );
  });
});
