import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('data-dir override contract', () => {
  it('uses explicit data-dir instead of ./data/statements', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const overrideFolder = join(cwd, 'custom-statements');
    await mkdir(join(cwd, 'data', 'statements'), { recursive: true });
    await mkdir(overrideFolder);
    await writeFile(
      join(overrideFolder, 'IE_USD_1001.csv'),
      `${header}\n15/05/2026,Transfer,001,ACC,10.00,0.00,"4,000.00",0.00,Employer,Salary,Incoming\n`,
      'utf8',
    );

    let stdout = '';
    const code = await runCli(
      [
        'audit',
        '--data-dir',
        'custom-statements',
        '--from',
        '2026-05-01',
        '--to',
        '2026-05-31',
        '--format',
        'json',
      ],
      cwd,
      {
        stdout: (value) => (stdout += value),
        stderr: () => undefined,
      },
    );

    expect(code).toBe(0);
    expect(JSON.parse(stdout).audited_folder).toBe(overrideFolder);
  });
});
