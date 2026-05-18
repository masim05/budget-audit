import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CsvStatementSource, UnsafeStatementError } from './index.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('unsupported input diagnostics', () => {
  it('groups multiple unsupported file issues in one readable error', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(
      join(folder, 'bad-header.csv'),
      'Posted Date,Amount\n',
      'utf8',
    );
    await writeFile(
      join(folder, 'missing-currency.csv'),
      `${header}\n15/05/2026,Transfer,001,ACC,10.00,0.00,"4,000.00",0.00,Employer,Salary,Incoming\n`,
      'utf8',
    );

    await expect(new CsvStatementSource(folder).load()).rejects.toThrow(
      UnsafeStatementError,
    );
    await expect(new CsvStatementSource(folder).load()).rejects.toThrow(
      '- bad-header.csv: unsupported CSV header\n  Expected:',
    );
    await expect(new CsvStatementSource(folder).load()).rejects.toThrow(
      '- missing-currency.csv: unsupported filename\n  Expected: Filename containing `_AMD_` or `_USD_`',
    );
  });
});
