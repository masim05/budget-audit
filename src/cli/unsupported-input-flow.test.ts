import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('unsupported input CLI flow', () => {
  it('fails before printing totals when unsupported files are present', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(join(folder, 'notes.txt'), 'notes\n', 'utf8');
    await writeFile(
      join(folder, 'IE_USD_1001.csv'),
      `${header}\n15/05/2026,Transfer,001,ACC,10.00,0.00,"4,000.00",0.00,Employer,Salary,Incoming\n`,
      'utf8',
    );

    let stdout = '';
    let stderr = '';
    const code = await runCli(
      [
        'audit',
        '--data-dir',
        folder,
        '--from',
        '2026-05-01',
        '--to',
        '2026-05-31',
      ],
      process.cwd(),
      {
        stdout: (value) => (stdout += value),
        stderr: (value) => (stderr += value),
      },
    );

    expect(code).toBe(3);
    expect(stdout).toBe('');
    expect(stderr).toContain('- notes.txt: unsupported file type');
    expect(stderr).not.toContain('USD income total');
  });
});
