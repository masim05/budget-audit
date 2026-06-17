import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

describe('cluster CLI contract', () => {
  it('prints cluster help', async () => {
    let stdout = '';
    let stderr = '';
    const code = await runCli(['cluster', '--help'], process.cwd(), {
      stdout: (value) => (stdout += value),
      stderr: (value) => (stderr += value),
    });

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Usage: budget-audit cluster');
    expect(stdout).toContain('-sf, --statements-folder');
    expect(stdout).toContain('-cf, --checks-folder');
    expect(stdout).toContain('-co, --cluster-other');
  });

  it('clusters fixture statements and prints verbose rows', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await mkdir(join(cwd, 'config'), { recursive: true });
    await writeFile(
      join(cwd, 'config', 'clusters.yml'),
      [
        '# receiver normalisation rules and direct mappings',
        'mappings:',
        '  "SHOP": "supermarkets"',
        'patterns:',
        '  []',
        '',
      ].join('\n'),
      'utf8',
    );
    const checksFolder = join(cwd, 'checks');
    await mkdir(checksFolder, { recursive: true });
    await writeFile(join(checksFolder, 'receipt-002.png'), 'ok', 'utf8');
    const fixtureStatement = join(
      process.cwd(),
      'tests',
      'fixtures',
      'statements',
      'usd-report',
      'IE_AMD_5600.csv',
    );
    const statementsFolder = join(cwd, 'statements');
    await mkdir(statementsFolder, { recursive: true });
    await writeFile(
      join(statementsFolder, 'IE_AMD_5600.csv'),
      await readFile(fixtureStatement, 'utf8'),
      'utf8',
    );
    let stdout = '';
    let stderr = '';
    const code = await runCli(
      [
        'cluster',
        '-sf',
        statementsFolder,
        '-cf',
        checksFolder,
        '-f',
        '2026-05-01',
        '-t',
        '2026-05-31',
        '-a',
        'd',
        '-v',
      ],
      cwd,
      {
        stdout: (value) => (stdout += value),
        stderr: (value) => (stderr += value),
      },
    );

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Cluster summary (THB):');
    expect(stdout).toContain('- supermarkets: 80000.00');
    expect(stdout).toContain('Total spend (THB): 80000.00');
    expect(stdout).toContain(
      '2026-05-16 00:00 — 80000.00 — Shop — IE_AMD_5600.csv — receipt-002.png',
    );
  });

  it('supports equals-style short aliases and cluster-other alias', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const statementsFolder = join(cwd, 'data', 'statements');
    await mkdir(statementsFolder, { recursive: true });
    await writeFile(
      join(statementsFolder, 'IE_USD_1001.csv'),
      [
        'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type',
        '16/05/2026,Card,002,ACC,0.00,5.00,0.00,0.00,SHOP,Groceries,Outgoing',
        '',
      ].join('\n'),
      'utf8',
    );
    await mkdir(join(cwd, 'config'), { recursive: true });
    await writeFile(
      join(cwd, 'config', 'clusters.yml'),
      [
        '# receiver normalisation rules and direct mappings',
        'mappings:',
        '  {}',
        'patterns:',
        '  []',
        '',
      ].join('\n'),
      'utf8',
    );
    const checksFolder = join(cwd, 'data', 'checks');
    await mkdir(checksFolder, { recursive: true });

    let stderr = '';
    const code = await runCli(
      [
        'cluster',
        `-sf=${statementsFolder}`,
        `-cf=${checksFolder}`,
        '-co',
        '-f',
        '2026-05-01',
        '-t',
        '2026-05-31',
      ],
      cwd,
      {
        stdout: () => undefined,
        stderr: (value) => (stderr += value),
      },
    );

    expect(code).toBe(0);
    expect(stderr).toContain(
      'Interactive clustering requires a TTY. Skipping --cluster-other.',
    );
  });

  it('uses default statements and checks folders', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const statementsFolder = join(cwd, 'data', 'statements');
    await mkdir(statementsFolder, { recursive: true });
    await writeFile(
      join(statementsFolder, 'IE_USD_1001.csv'),
      [
        'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type',
        '16/05/2026,Card,002,ACC,0.00,7.00,0.00,0.00,SHOP,Groceries,Outgoing',
        '',
      ].join('\n'),
      'utf8',
    );
    await mkdir(join(cwd, 'data', 'checks'), { recursive: true });
    await mkdir(join(cwd, 'config'), { recursive: true });
    await writeFile(
      join(cwd, 'config', 'clusters.yml'),
      [
        '# receiver normalisation rules and direct mappings',
        'mappings:',
        '  "SHOP": "дом"',
        'patterns:',
        '  []',
        '',
      ].join('\n'),
      'utf8',
    );

    let stdout = '';
    const code = await runCli(
      ['cluster', '-f', '2026-05-01', '-t', '2026-05-31'],
      cwd,
      {
        stdout: (value) => (stdout += value),
        stderr: () => undefined,
      },
    );

    expect(code).toBe(0);
    expect(stdout).toContain('- дом: 7.00');
  });
});
