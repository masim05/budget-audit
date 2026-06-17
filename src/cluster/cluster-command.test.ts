import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  normalizeReceiver,
  parseApproach,
  runClusterCommand,
  tokenSimilarity,
} from './cluster-command.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

async function writeStatements(
  folder: string,
  rows: string[],
  fileName = 'IE_USD_1001.csv',
) {
  await mkdir(folder, { recursive: true });
  await writeFile(
    join(folder, fileName),
    `${header}\n${rows.join('\n')}\n`,
    'utf8',
  );
}

describe('cluster command helpers', () => {
  it('normalizes receivers and parses approach aliases', () => {
    expect(normalizeReceiver('Café Déjà-Vu  #12')).toBe('CAFE DEJA VU 12');
    expect(parseApproach(undefined)).toBe('hybrid');
    expect(parseApproach('h')).toBe('hybrid');
    expect(parseApproach('2')).toBe('hybrid');
    expect(parseApproach('d')).toBe('deterministic');
    expect(parseApproach('1')).toBe('deterministic');
    expect(() => parseApproach('x')).toThrow('Invalid clustering approach: x');
  });

  it('scores token similarity for fuzzy matching fallback', () => {
    expect(tokenSimilarity('COFFEE SHOP BKK', 'COFFEE SHOP')).toBeCloseTo(
      2 / 3,
      5,
    );
    expect(tokenSimilarity('A B', 'C D')).toBe(0);
  });
});

describe('runClusterCommand', () => {
  it('applies deterministic mappings and regex patterns', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const statementsFolder = join(cwd, 'statements');
    await writeStatements(statementsFolder, [
      '15/05/2026,Card,001,ACC,0.00,5.00,0.00,0.00,SHOP,Groceries,Outgoing',
      '16/05/2026,Card,002,ACC,0.00,6.00,0.00,0.00,Cafe Roma,Lunch,Outgoing',
      '17/05/2026,Transfer,003,ACC,10.00,0.00,0.00,0.00,Employer,Salary,Incoming',
    ]);
    await mkdir(join(cwd, 'config'), { recursive: true });
    await writeFile(
      join(cwd, 'config', 'clusters.yml'),
      [
        '# receiver normalisation rules and direct mappings',
        'mappings:',
        '  "SHOP": "Дом"',
        'patterns:',
        '  - pattern: "/^CAFE/i"',
        '    cluster: "кафе/рестораны"',
        '',
      ].join('\n'),
      'utf8',
    );

    const output = await runClusterCommand({
      statementsFolder,
      checksFolder: join(cwd, 'checks'),
      from: '2026-05-01',
      to: '2026-05-31',
      approach: 'd',
      verbose: false,
      clusterOther: false,
      configPath: join(cwd, 'config', 'clusters.yml'),
      cwd,
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(output).toContain('Cluster summary (THB):');
    expect(output).toContain('- Дом: 5.00');
    expect(output).toContain('- кафе/рестораны: 6.00');
    expect(output).toContain('Total spend (THB): 11.00');
  });

  it('uses fuzzy fallback in hybrid mode and prints verbose rows', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const statementsFolder = join(cwd, 'statements');
    await writeStatements(statementsFolder, [
      '16/05/2026,Card,002,ACC,0.00,80.00,0.00,0.00,COFFEE SHOP BKK,Lunch,Outgoing',
    ]);
    const checksFolder = join(cwd, 'checks');
    await mkdir(checksFolder, { recursive: true });
    await writeFile(join(checksFolder, 'check-002.jpg'), 'ok', 'utf8');
    await mkdir(join(cwd, 'config'), { recursive: true });
    await writeFile(
      join(cwd, 'config', 'clusters.yml'),
      [
        '# receiver normalisation rules and direct mappings',
        'mappings:',
        '  "COFFEE SHOP": "кафе/рестораны"',
        'patterns:',
        '  []',
        '',
      ].join('\n'),
      'utf8',
    );

    const output = await runClusterCommand({
      statementsFolder,
      checksFolder,
      from: '2026-05-01',
      to: '2026-05-31',
      approach: 'h',
      verbose: true,
      clusterOther: false,
      configPath: join(cwd, 'config', 'clusters.yml'),
      cwd,
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(output).toContain('- кафе/рестораны: 80.00');
    expect(output).toContain(
      '2026-05-16 00:00 — 80.00 — COFFEE SHOP BKK — IE_USD_1001.csv — check-002.jpg',
    );
  });

  it('accepts invalid regex patterns and keeps unknown receivers in Other', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const statementsFolder = join(cwd, 'statements');
    await writeStatements(statementsFolder, [
      '16/05/2026,Card,002,ACC,0.00,8.00,0.00,0.00,Unknown Place,Lunch,Outgoing',
    ]);
    await mkdir(join(cwd, 'config'), { recursive: true });
    await writeFile(
      join(cwd, 'config', 'clusters.yml'),
      [
        '# receiver normalisation rules and direct mappings',
        'mappings:',
        "  'SHOP:LOCAL': 'дом'",
        'patterns:',
        '  - pattern: "/[/"',
        '    cluster: "broken"',
        '',
      ].join('\n'),
      'utf8',
    );

    const output = await runClusterCommand({
      statementsFolder,
      checksFolder: join(cwd, 'checks'),
      from: '2026-05-01',
      to: '2026-05-31',
      approach: 'd',
      verbose: false,
      clusterOther: false,
      configPath: join(cwd, 'config', 'clusters.yml'),
      cwd,
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(output).toContain('- Other: 8.00');
  });

  it('supports cluster-other mode when no other receivers exist', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const statementsFolder = join(cwd, 'statements');
    await writeStatements(statementsFolder, [
      '16/05/2026,Card,002,ACC,0.00,8.00,0.00,0.00,SHOP,Lunch,Outgoing',
    ]);
    await mkdir(join(cwd, 'config'), { recursive: true });
    await writeFile(
      join(cwd, 'config', 'clusters.yml'),
      [
        '# receiver normalisation rules and direct mappings',
        'mappings:',
        '  "SHOP": "Дом"',
        'patterns:',
        '  []',
        '',
      ].join('\n'),
      'utf8',
    );
    let stdout = '';
    const output = await runClusterCommand({
      statementsFolder,
      checksFolder: join(cwd, 'checks'),
      from: '2026-05-01',
      to: '2026-05-31',
      approach: 'h',
      verbose: false,
      clusterOther: true,
      configPath: join(cwd, 'config', 'clusters.yml'),
      cwd,
      stdout: (value) => (stdout += value),
      stderr: () => undefined,
    });

    expect(stdout).toContain('No "Other" receivers found.');
    expect(output).toContain('- Дом: 8.00');
  });

  it('prints empty message when no spend is in range', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const statementsFolder = join(cwd, 'statements');
    await writeStatements(statementsFolder, [
      '17/05/2026,Transfer,003,ACC,10.00,0.00,0.00,0.00,Employer,Salary,Incoming',
    ]);

    const output = await runClusterCommand({
      statementsFolder,
      checksFolder: join(cwd, 'checks'),
      from: '2026-05-01',
      to: '2026-05-31',
      approach: 'h',
      verbose: true,
      clusterOther: false,
      configPath: join(cwd, 'config', 'clusters.yml'),
      cwd,
      stdout: () => undefined,
      stderr: () => undefined,
    });

    expect(output).toBe('No spend transactions found for selected range.\n');
  });
});
