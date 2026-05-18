import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CsvStatementSource } from './index.js';

const fixtureFolder = join(
  process.cwd(),
  'tests/fixtures/statements/supported-export-formats',
);

describe('supported CSV export formats', () => {
  it('accepts every supported sample fixture filename', async () => {
    const expectedFiles = (await readdir(fixtureFolder)).sort();
    const result = await new CsvStatementSource(fixtureFolder).load();

    expect(result.transactions).toHaveLength(expectedFiles.length);
    expect(
      result.statementFiles.map((file) => file.path.split('/').at(-1)),
    ).toEqual(expectedFiles);
    expect(
      result.statementFiles.every(
        (file) => file.processingStatus === 'processed',
      ),
    ).toBe(true);
    expect(
      result.statementFiles.every((file) => file.transactionsRead === 1),
    ).toBe(true);
  });
});
