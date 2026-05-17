import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CsvStatementSource,
  InputFolderMissingError,
  NoStatementFilesError,
  UnsafeStatementError,
} from './index.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';
const row =
  '15/05/2026,Transfer,001,ACC,"1,000.00",0.00,"400,000.00",0.00,Employer,Salary,Incoming';

describe('CSV statement source', () => {
  it('loads valid CSV rows', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(
      join(folder, 'IE_USD_1001.csv'),
      `${header}\n${row}\n`,
      'utf8',
    );
    const result = await new CsvStatementSource(folder).load();
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.currency).toBe('USD');
    expect(result.statementFiles[0]?.processingStatus).toBe('processed');
  });

  it('handles CSV quoting, CRLF endings, blank rows, warnings, and unknown currency filenames', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(
      join(folder, 'statement.csv'),
      `${header}\r\n15/05/2026,Transfer,001,ACC,"1,000.00",0.00,"400,000.00",0.00,"ACME, Inc.","Said ""hello""",Incoming\r\n\r\n15/05/2026,Transfer,002,ACC,not-a-number,0.00,0.00,0.00,Employer,Salary,Incoming`,
      'utf8',
    );
    const result = await new CsvStatementSource(folder).load();
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.currency).toBe('UNKNOWN');
    expect(result.transactions[0]?.remitterOrBeneficiary).toBe('ACME, Inc.');
    expect(result.transactions[0]?.details).toBe('Said "hello"');
    expect(result.warnings[0]).toContain('Invalid amount');
  });

  it('warns about malformed and missing identity rows without unsafe totals', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(
      join(folder, 'IE_USD_1001.csv'),
      `${header}\n15/05/2026,Transfer\n15/05/2026,Transfer,,ACC,1.00,0.00,400.00,0.00,Employer,Salary,Incoming\n`,
      'utf8',
    );
    const result = await new CsvStatementSource(folder).load();
    expect(result.transactions).toHaveLength(0);
    expect(result.warnings).toEqual([
      'IE_USD_1001.csv row 2: Expected 11 columns but found 2',
      'IE_USD_1001.csv row 3: Missing required identity fields',
    ]);
  });

  it('reports missing, empty, and unsafe input', async () => {
    await expect(
      new CsvStatementSource('/missing-folder').load(),
    ).rejects.toBeInstanceOf(InputFolderMissingError);
    await expect(
      new CsvStatementSource('/missing-folder').load(),
    ).rejects.toThrow('Input folder is unavailable');
    const empty = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await expect(new CsvStatementSource(empty).load()).rejects.toBeInstanceOf(
      NoStatementFilesError,
    );
    await writeFile(join(empty, 'bad.csv'), 'bad\n', 'utf8');
    await expect(new CsvStatementSource(empty).load()).rejects.toBeInstanceOf(
      UnsafeStatementError,
    );
    const noHeader = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(join(noHeader, 'empty.csv'), '', 'utf8');
    await expect(
      new CsvStatementSource(noHeader).load(),
    ).rejects.toBeInstanceOf(UnsafeStatementError);
    const unreadable = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await mkdir(join(unreadable, 'directory.csv'));
    await expect(
      new CsvStatementSource(unreadable).load(),
    ).rejects.toBeInstanceOf(UnsafeStatementError);
  });
});
