import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CsvStatementSource, expectedStatementHeader } from './index.js';

describe('header diagnostics', () => {
  it('shows expected and received headers for unsupported CSV headers', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(
      join(folder, 'IE_USD_1001.csv'),
      'Posted Date,Description,Amount\n15/05/2026,Salary,10.00\n',
      'utf8',
    );

    await expect(new CsvStatementSource(folder).load()).rejects.toThrow(
      `Expected: ${expectedStatementHeader()}`,
    );
    await expect(new CsvStatementSource(folder).load()).rejects.toThrow(
      'Received: Posted Date,Description,Amount',
    );
  });
});
