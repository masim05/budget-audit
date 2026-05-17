import { describe, expect, it } from 'vitest';
import { classifyExternalTransaction } from './classification.js';
import type { Transaction } from './transaction.js';

const base: Transaction = {
  id: '1',
  date: '2026-05-01',
  transactionType: 'Transfer',
  transactionNumber: '1',
  accountNumber: 'A',
  currency: 'USD',
  remitterOrBeneficiary: 'Someone',
  details: 'Details',
  directionType: 'Incoming',
  sourceFile: 'file.csv',
  classification: 'invalid',
};

describe('classification', () => {
  it('classifies income, spend, invalid, and ambiguous rows', () => {
    expect(
      classifyExternalTransaction({ ...base, credit: 100n, debit: 0n }),
    ).toBe('income');
    expect(classifyExternalTransaction({ ...base, credit: 100n })).toBe(
      'income',
    );
    expect(
      classifyExternalTransaction({ ...base, credit: 0n, debit: 100n }),
    ).toBe('spend');
    expect(classifyExternalTransaction({ ...base, debit: 100n })).toBe('spend');
    expect(
      classifyExternalTransaction({ ...base, credit: -100n, debit: 0n }),
    ).toBe('income');
    expect(
      classifyExternalTransaction({ ...base, credit: 0n, debit: -100n }),
    ).toBe('spend');
    expect(
      classifyExternalTransaction({ ...base, creditAmd: 0n, debitAmd: 0n }),
    ).toBe('invalid');
    expect(classifyExternalTransaction({ ...base })).toBe('invalid');
    expect(
      classifyExternalTransaction({
        ...base,
        credit: 100n,
        debit: 100n,
        creditAmd: 100n,
      }),
    ).toBe('ambiguous_internal_candidate');
  });
});
