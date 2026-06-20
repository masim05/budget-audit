import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  parseStatementTextToTransactions,
  PdfStatementSource,
} from './pdf-statement-source.js';

vi.mock('pdf-parse', () => ({ default: vi.fn() }));

describe('parseStatementTextToTransactions', () => {
  it('parses Thai statement lines into THB transactions', () => {
    const text = `
01/06/26 PMT. PROMPTPAY 85.00 15,256.10 mPhone
01/06/26 TRF TO OTH BK 610.00 14,646.10 mPhone
02/06/26 CASH CDM 62,000.00 73,624.10 ATM
    `;
    const result = parseStatementTextToTransactions(text, 'sample.pdf');
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      date: '2026-06-01',
      currency: 'THB',
      debit: 8500n,
    });
    expect(result[1].debit).toBe(61000n);
    expect(result[2].credit).toBe(5897800n);
  });

  it('handles no-spaces line format and DEP credit as first transaction', () => {
    const text =
      '01/06/26DEP. DEPOSIT5,000.0015,000.00Branch';
    const result = parseStatementTextToTransactions(text, 'sample.pdf');
    expect(result).toHaveLength(1);
    expect(result[0].credit).toBe(500000n);
    expect(result[0].debit).toBe(0n);
  });

  it('skips non-transaction lines', () => {
    const text =
      'HEADER LINE\n01/06/26 PMT. PROMPTPAY 85.00 15,256.10 mPhone';
    const result = parseStatementTextToTransactions(text, 'sample.pdf');
    expect(result).toHaveLength(1);
  });
});

describe('PdfStatementSource', () => {
  it('loads PDF files and returns transactions', async () => {
    const { default: pdfParse } = await import('pdf-parse');
    const mockPdfParse = vi.mocked(pdfParse);
    mockPdfParse.mockResolvedValueOnce({
      text: '01/06/26 PMT. PROMPTPAY 85.00 15,256.10 mPhone',
    } as Awaited<ReturnType<typeof pdfParse>>);

    const folder = await mkdtemp(join(tmpdir(), 'pdf-src-'));
    await writeFile(join(folder, 'stmt.pdf'), Buffer.from([0]));

    const source = new PdfStatementSource(folder);
    const result = await source.load();
    expect(result.transactions).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
    expect(result.statementFiles).toHaveLength(1);
  });

  it('warns when a PDF file fails to parse', async () => {
    const { default: pdfParse } = await import('pdf-parse');
    const mockPdfParse = vi.mocked(pdfParse);
    mockPdfParse.mockRejectedValueOnce(new Error('corrupt PDF'));

    const folder = await mkdtemp(join(tmpdir(), 'pdf-src-'));
    await writeFile(join(folder, 'bad.pdf'), Buffer.from([0]));

    const source = new PdfStatementSource(folder);
    const result = await source.load();
    expect(result.transactions).toHaveLength(0);
    expect(result.warnings[0]).toContain('corrupt PDF');
  });

  it('throws when no PDF files are found', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'pdf-src-'));
    const source = new PdfStatementSource(folder);
    await expect(source.load()).rejects.toThrow('No PDF statement files found');
  });
});
