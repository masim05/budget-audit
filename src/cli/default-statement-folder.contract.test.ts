import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('default statement folder contract', () => {
  it('uses ./data/statements when data-dir is omitted', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const defaultFolder = join(cwd, 'data', 'statements');
    await mkdir(defaultFolder, { recursive: true });
    await writeFile(
      join(defaultFolder, 'IE_USD_1001.csv'),
      `${header}\n15/05/2026,Transfer,001,ACC,10.00,0.00,"4,000.00",0.00,Employer,Salary,Incoming\n`,
      'utf8',
    );

    let stdout = '';
    const code = await runCli(
      [
        'audit',
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
    expect(JSON.parse(stdout).audited_folder).toBe(defaultFolder);
  });
});
