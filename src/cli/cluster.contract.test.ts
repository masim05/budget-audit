import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('cluster CLI contract', () => {
  it('runs the cluster command with statement and checks folder aliases', async () => {
    const statements = await mkdtemp(
      join(tmpdir(), 'budget-audit-statements-'),
    );
    const checks = await mkdtemp(join(tmpdir(), 'budget-audit-checks-'));
    await writeFile(
      join(statements, 'TH_THB_1001.csv'),
      `${header}\n2026-05-15,Card,1001,ACC,0.00,123.45,0.00,0.00,Cafe Market,Lunch,Outgoing\n`,
      'utf8',
    );

    let stdout = '';
    const code = await runCli(
      [
        'cluster',
        '--statements-folder',
        statements,
        '--checks-folder',
        checks,
        '-f',
        '2026-05-01',
        '-t',
        '2026-05-31',
      ],
      process.cwd(),
      { stdout: (value) => (stdout += value), stderr: () => undefined },
    );

    expect(code).toBe(0);
    expect(stdout).toContain('Cluster:');
    expect(stdout).toContain('food');
  });

  it('prints cluster help without loading statements', async () => {
    let stdout = '';
    const code = await runCli(['cluster', '--help'], process.cwd(), {
      stdout: (value) => (stdout += value),
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(stdout).toContain('Usage: budget-audit cluster');
    expect(stdout).toContain('--statements-folder');
    expect(stdout).toContain('--checks-folder');
    expect(stdout).toContain('--cluster-other');
    expect(stdout).toContain('--approach');
  });
});
