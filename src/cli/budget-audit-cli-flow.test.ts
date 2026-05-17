import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('budget-audit CLI flow', () => {
  it('audits fixture statements with custom range and internal exclusion', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(
      join(folder, 'IE_USD_1001.csv'),
      `${header}\n15/05/2026,Transfer,001,ACC,25.00,0.00,"10,000.00",0.00,Employer,Salary,Incoming\n16/05/2026,Card,002,ACC,0.00,5.00,0.00,"2,000.00",Shop,Groceries,Outgoing\n17/05/2026,Transfer,003,ACC,10.00,0.00,"4,000.00",0.00,Own,Transfer,Incoming\n17/05/2026,Transfer,003,ACC2,0.00,10.00,0.00,"4,000.00",Own,Transfer,Outgoing\n`,
      'utf8',
    );
    let stdout = '';
    const code = await runCli(
      [
        'audit',
        '--data-dir',
        folder,
        '--from',
        '2026-05-01',
        '--to',
        '2026-05-31',
        '--matching-mode',
        'strict',
      ],
      process.cwd(),
      {
        stdout: (value) => (stdout += value),
        stderr: () => undefined,
      },
    );
    expect(code).toBe(0);
    expect(stdout).toContain('USD income total: 25.00');
    expect(stdout).toContain('USD spend total: 5.00');
    expect(stdout).toContain('Excluded internal transfers: 1');
  });
});
