import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('CLI input diagnostics contract', () => {
  it('writes multi-line unsupported input errors to stderr', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(
      join(folder, 'bad-header.csv'),
      'Posted Date,Amount\n',
      'utf8',
    );
    await writeFile(join(folder, 'notes.txt'), 'notes\n', 'utf8');
    await writeFile(
      join(folder, 'missing-currency.csv'),
      `${header}\n15/05/2026,Transfer,001,ACC,10.00,0.00,"4,000.00",0.00,Employer,Salary,Incoming\n`,
      'utf8',
    );

    let stderr = '';
    const code = await runCli(['audit', '--data-dir', folder], process.cwd(), {
      stdout: () => undefined,
      stderr: (value) => (stderr += value),
    });

    expect(code).toBe(3);
    expect(stderr).toContain(
      'Input error: statement folder contains unsupported files.',
    );
    expect(stderr).toContain('- bad-header.csv: unsupported CSV header');
    expect(stderr).toContain('- missing-currency.csv: unsupported filename');
    expect(stderr).toContain('- notes.txt: unsupported file type');
    expect(stderr).toContain('Expected: Date,Transaction Type');
    expect(
      stderr.split('\n').filter((line) => line.startsWith('- ')),
    ).toHaveLength(3);
  });
});
