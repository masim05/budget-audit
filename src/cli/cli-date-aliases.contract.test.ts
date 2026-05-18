import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

async function fixtureFolder(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
  await writeFile(
    join(folder, 'IE_USD_1001.csv'),
    `${header}\n15/05/2026,Transfer,001,ACC,10.00,0.00,"4,000.00",0.00,Employer,Salary,Incoming\n`,
    'utf8',
  );
  return folder;
}

async function runWith(
  argv: string[],
): Promise<{ code: number; stderr: string; stdout: string }> {
  let stdout = '';
  let stderr = '';
  const code = await runCli(argv, process.cwd(), {
    stdout: (value) => (stdout += value),
    stderr: (value) => (stderr += value),
  });
  return { code, stderr, stdout };
}

describe('CLI date alias contract', () => {
  it('treats -f and -t like --from and --to', async () => {
    const folder = await fixtureFolder();

    const shortResult = await runWith([
      'audit',
      '--data-dir',
      folder,
      '-f',
      '2026-05-01',
      '-t',
      '2026-05-31',
    ]);
    const longResult = await runWith([
      'audit',
      '--data-dir',
      folder,
      '--from',
      '2026-05-01',
      '--to',
      '2026-05-31',
    ]);

    expect(shortResult).toEqual(longResult);
    expect(shortResult.stdout).toContain('USD income total: 10.00');
  });

  it('reports invalid date alias values like long options', async () => {
    const invalidFromAlias = await runWith(['audit', '-f', 'bad-date']);
    const invalidFromLong = await runWith(['audit', '--from', 'bad-date']);
    const invalidToAlias = await runWith(['audit', '-t', 'bad-date']);
    const invalidToLong = await runWith(['audit', '--to', 'bad-date']);

    expect(invalidFromAlias).toEqual(invalidFromLong);
    expect(invalidToAlias).toEqual(invalidToLong);
  });

  it.each([['-f'], ['-t']])('reports missing values for %s', async (alias) => {
    const result = await runWith(['audit', alias]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('argument missing');
  });
});
