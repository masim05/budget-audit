import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

async function fixtureCwd(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), 'budget-audit-'));
  const statements = join(cwd, 'statements');
  await mkdir(statements);
  await writeFile(
    join(statements, 'IE_USD_1001.csv'),
    `${header}\n15/05/2026,Transfer,001,ACC,10.00,0.00,"4,000.00",0.00,Employer,Salary,Incoming\n`,
    'utf8',
  );
  return cwd;
}

async function runWith(
  argv: string[],
  cwd: string,
): Promise<{ code: number; stderr: string; stdout: string }> {
  let stdout = '';
  let stderr = '';
  const code = await runCli(argv, cwd, {
    stdout: (value) => (stdout += value),
    stderr: (value) => (stderr += value),
  });
  return { code, stderr, stdout };
}

describe('CLI output alias contract', () => {
  it('treats -o like --output', async () => {
    const cwd = await fixtureCwd();
    const baseArgs = [
      'audit',
      '--data-dir',
      'statements',
      '--from',
      '2026-05-01',
      '--to',
      '2026-05-31',
      '--format',
      'json',
    ];

    const shortResult = await runWith(
      [...baseArgs, '-o', 'reports/short.json'],
      cwd,
    );
    const longResult = await runWith(
      [...baseArgs, '--output', 'reports/long.json'],
      cwd,
    );

    expect(shortResult.code).toBe(0);
    expect(shortResult.stderr).toBe('');
    expect(longResult.code).toBe(0);
    expect(longResult.stderr).toBe('');

    const shortReport = JSON.parse(
      await readFile(join(cwd, 'reports/short.json'), 'utf8'),
    );
    const longReport = JSON.parse(
      await readFile(join(cwd, 'reports/long.json'), 'utf8'),
    );
    expect(shortReport).toEqual(longReport);
    expect(shortReport.totals.income_usd).toBe('10.00');
  });

  it('reports a missing value for -o', async () => {
    const result = await runWith(['audit', '-o'], process.cwd());

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('argument missing');
  });
});
