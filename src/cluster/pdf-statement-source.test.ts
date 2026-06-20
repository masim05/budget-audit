import { describe, expect, it } from 'vitest';
import { parseStatementTextToTransactions } from './pdf-statement-source.js';

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
});
