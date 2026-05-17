import { describe, expect, it } from 'vitest';
import { findInternalMovements } from './internal-movement-matcher.js';
import { parseMatchingMode } from './matching-mode.js';
import type { Transaction } from '../transaction/index.js';

function tx(
  id: string,
  transactionNumber: string,
  direction: 'in' | 'out',
  currency = 'USD',
): Transaction {
  return {
    id,
    date: '2026-05-01',
    transactionType: 'Transfer',
    transactionNumber,
    accountNumber: id,
    currency: currency as 'USD' | 'AMD',
    credit: direction === 'in' ? 100n : 0n,
    debit: direction === 'out' ? 100n : 0n,
    creditAmd: direction === 'in' ? 40000n : 0n,
    debitAmd: direction === 'out' ? 40000n : 0n,
    remitterOrBeneficiary: 'Own account',
    details: 'Transfer',
    directionType: direction,
    sourceFile: 'file.csv',
    classification: 'invalid',
  };
}

describe('internal movement matching', () => {
  it('excludes high-confidence transfers and conversions', () => {
    const transfer = findInternalMovements(
      [tx('a', 'n1', 'in'), tx('b', 'n1', 'out')],
      'strict',
    );
    expect(transfer.matches[0]?.type).toBe('transfer');
    expect(transfer.excludedTransactionIds.has('a')).toBe(true);

    const conversion = findInternalMovements(
      [tx('c', 'n2', 'in', 'USD'), tx('d', 'n2', 'out', 'AMD')],
      'strict',
    );
    expect(conversion.matches[0]?.type).toBe('conversion');
  });

  it('warns on probable matches in strict mode and excludes them in permissive mode', () => {
    const transactions = [
      tx('a', 'n1', 'in'),
      tx('b', 'n1', 'out'),
      tx('c', 'n1', 'out'),
    ];
    expect(findInternalMovements(transactions, 'strict').warnings).toHaveLength(
      1,
    );
    expect(
      findInternalMovements(transactions, 'permissive').matches[0]?.confidence,
    ).toBe('probable');
  });

  it('uses fallback evidence keys and ignores one-sided groups', () => {
    expect(
      findInternalMovements([tx('solo', '', 'in')], 'strict').matches,
    ).toHaveLength(0);
    const matchedByDetails = [tx('a', '', 'in'), tx('b', '', 'out')].map(
      (transaction) => ({
        ...transaction,
        details: 'same details',
      }),
    );
    expect(
      findInternalMovements(matchedByDetails, 'strict').matches[0]?.evidence,
    ).toContain('2026-05-01:same details');
    const noIncoming = [
      {
        ...tx('c', 'n3', 'in', 'AMD'),
        credit: undefined,
        creditAmd: undefined,
      },
      { ...tx('d', 'n3', 'out', 'AMD'), debit: 40000n, debitAmd: undefined },
    ];
    expect(
      findInternalMovements(noIncoming, 'permissive').matches,
    ).toHaveLength(0);
    const noOutgoing = [
      { ...tx('e', 'n4', 'in', 'AMD'), creditAmd: undefined },
      { ...tx('f', 'n4', 'out', 'AMD'), debit: undefined, debitAmd: undefined },
    ];
    expect(
      findInternalMovements(noOutgoing, 'permissive').matches,
    ).toHaveLength(0);
    const originalAmdFallback = [
      { ...tx('g', 'n5', 'in', 'AMD'), creditAmd: 0n, debitAmd: 0n },
      { ...tx('h', 'n5', 'out', 'AMD'), creditAmd: 0n, debitAmd: 0n },
    ];
    expect(
      findInternalMovements(originalAmdFallback, 'strict').matches[0]
        ?.usdAmount,
    ).toBe(0n);
    const sameAccount = [
      { ...tx('i', 'n6', 'in'), accountNumber: 'same-account' },
      { ...tx('j', 'n6', 'out'), accountNumber: 'same-account' },
    ];
    expect(findInternalMovements(sameAccount, 'strict').matches).toHaveLength(
      0,
    );
    const mismatchedAmounts = [
      tx('k', 'n7', 'in'),
      { ...tx('l', 'n7', 'out'), debit: 50n },
    ];
    expect(
      findInternalMovements(mismatchedAmounts, 'strict').matches,
    ).toHaveLength(0);
    const unknownCurrency = [
      { ...tx('m', 'n8', 'in'), currency: 'UNKNOWN' as const },
      tx('n', 'n8', 'out'),
    ];
    expect(
      findInternalMovements(unknownCurrency, 'strict').matches,
    ).toHaveLength(0);
  });

  it('validates matching modes', () => {
    expect(parseMatchingMode()).toBe('strict');
    expect(parseMatchingMode('permissive')).toBe('permissive');
    expect(() => parseMatchingMode('loose')).toThrow('Invalid matching mode');
  });
});
