import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
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

describe('CLI contract', () => {
  it('returns text and JSON output for valid audit arguments', async () => {
    const folder = await fixtureFolder();
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
      ],
      process.cwd(),
      {
        stdout: (value) => (stdout += value),
        stderr: () => undefined,
      },
    );
    expect(code).toBe(0);
    expect(stdout).toContain('USD income total: 10.00');

    let json = '';
    const jsonCode = await runCli(
      [
        'audit',
        '--data-dir',
        folder,
        '--from',
        '2026-05-01',
        '--to',
        '2026-05-31',
        '--format',
        'json',
      ],
      process.cwd(),
      {
        stdout: (value) => (json += value),
        stderr: () => undefined,
      },
    );
    expect(jsonCode).toBe(0);
    expect(JSON.parse(json).totals.income_usd).toBe('10.00');
  });

  it('resolves relative data and output paths from the provided cwd', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const dataFolder = join(cwd, 'statements');
    await mkdir(dataFolder);
    await writeFile(
      join(dataFolder, 'IE_USD_1001.csv'),
      `${header}\n15/05/2026,Transfer,001,ACC,10.00,0.00,"4,000.00",0.00,Employer,Salary,Incoming\n`,
      'utf8',
    );
    const code = await runCli(
      [
        'audit',
        '--data-dir',
        'statements',
        '--from',
        '2026-05-01',
        '--to',
        '2026-05-31',
        '--format',
        'json',
        '--output',
        'reports/audit.json',
      ],
      cwd,
      {
        stdout: () => undefined,
        stderr: () => undefined,
      },
    );
    expect(code).toBe(0);
    const report = JSON.parse(
      await readFile(join(cwd, 'reports/audit.json'), 'utf8'),
    );
    expect(report.audited_folder).toBe(dataFolder);
  });

  it('maps invalid arguments and input failures to documented exit codes', async () => {
    let stderr = '';
    expect(
      await runCli(['wrong'], process.cwd(), {
        stdout: () => undefined,
        stderr: (value) => (stderr += value),
      }),
    ).toBe(1);
    expect(stderr).toContain('Expected command');
    expect(
      await runCli(['audit', '--data-dir', '/missing-folder'], process.cwd(), {
        stdout: () => undefined,
        stderr: () => undefined,
      }),
    ).toBe(2);
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(join(folder, 'bad.csv'), 'bad\n', 'utf8');
    expect(
      await runCli(['audit', '--data-dir', folder], process.cwd(), {
        stdout: () => undefined,
        stderr: () => undefined,
      }),
    ).toBe(3);
    expect(
      await runCli(['audit', '--format', 'xml'], process.cwd(), {
        stdout: () => undefined,
        stderr: () => undefined,
      }),
    ).toBe(1);
  });
});
