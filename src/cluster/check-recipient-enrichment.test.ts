import { describe, expect, it } from 'vitest';
import type { ParsedCheck } from '../checks/index.js';
import type { Transaction } from '../transaction/index.js';
import { enrichRecipientsFromChecks } from './check-recipient-enrichment.js';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: '1',
    date: '2026-06-01',
    transactionType: 'PMT',
    transactionNumber: '1',
    accountNumber: 'A',
    currency: 'THB',
    credit: 0n,
    debit: 8500n,
    creditAmd: 0n,
    debitAmd: 0n,
    remitterOrBeneficiary: 'PMT. PROMPTPAY',
    details: 'mPhone',
    directionType: 'Outgoing',
    sourceFile: 'statement.pdf',
    classification: 'invalid',
    ...overrides,
  };
}

describe('enrichRecipientsFromChecks', () => {
  it('enriches recipient when match is unique', () => {
    const check: ParsedCheck = {
      filePath: '/tmp/2026-06-01 08-22-54.JPEG',
      recipient: 'เวโล่ คาเฟ่',
      recipientEnglish: 'VELO CAFE',
      amountMinor: 8500n,
      date: '2026-06-01',
      time: '08:22',
      warnings: [],
    };
    const result = enrichRecipientsFromChecks([tx({})], [check]);
    expect(result.transactions[0].remitterOrBeneficiary).toBe('VELO CAFE');
    expect(result.warnings).toEqual([]);
  });

  it('warns when no transaction matches the check', () => {
    const check: ParsedCheck = {
      filePath: '/tmp/2026-06-01 08-22-54.JPEG',
      recipient: 'GHOST',
      recipientEnglish: 'GHOST',
      amountMinor: 99999n,
      date: '2026-06-01',
      time: '08:22',
      warnings: [],
    };
    const result = enrichRecipientsFromChecks([tx({})], [check]);
    expect(result.warnings[0]).toContain('No matching transaction');
  });

  it('matches transaction with undefined debit using 0n fallback', () => {
    const check: ParsedCheck = {
      filePath: '/tmp/2026-06-01 08-22-54.JPEG',
      recipient: 'INCOME',
      recipientEnglish: 'INCOME',
      amountMinor: 0n,
      date: '2026-06-01',
      time: '08:22',
      warnings: [],
    };
    const result = enrichRecipientsFromChecks(
      [tx({ debit: undefined })],
      [check],
    );
    expect(result.transactions[0].remitterOrBeneficiary).toBe('INCOME');
  });

  it('falls back to recipient when recipientEnglish is empty', () => {
    const check: ParsedCheck = {
      filePath: '/tmp/2026-06-01 08-22-54.JPEG',
      recipient: 'ชื่อไทย',
      recipientEnglish: '',
      amountMinor: 8500n,
      date: '2026-06-01',
      time: '08:22',
      warnings: [],
    };
    const result = enrichRecipientsFromChecks([tx({})], [check]);
    expect(result.transactions[0].remitterOrBeneficiary).toBe('ชื่อไทย');
  });

  it('pairs same-date same-amount checks to distinct transactions in time order', () => {
    const earlier: ParsedCheck = {
      filePath: '/tmp/2026-06-06 18-10-12.JPEG',
      recipient: 'SHOP A',
      recipientEnglish: 'SHOP A',
      amountMinor: 85000n,
      date: '2026-06-06',
      time: '18:10',
      warnings: [],
    };
    const later: ParsedCheck = {
      filePath: '/tmp/2026-06-06 18-12-57.JPEG',
      recipient: 'SHOP B',
      recipientEnglish: 'SHOP B',
      amountMinor: 85000n,
      date: '2026-06-06',
      time: '18:12',
      warnings: [],
    };
    const t1 = tx({ id: 't1', date: '2026-06-06', debit: 85000n });
    const t2 = tx({ id: 't2', date: '2026-06-06', debit: 85000n });

    // Checks supplied out of order; matcher should still pair by time.
    const result = enrichRecipientsFromChecks([t1, t2], [later, earlier]);

    expect(result.warnings).toEqual([]);
    expect(result.transactions[0].remitterOrBeneficiary).toBe('SHOP A');
    expect(result.transactions[0].details).toContain('| check 18:10');
    expect(result.transactions[1].remitterOrBeneficiary).toBe('SHOP B');
    expect(result.transactions[1].details).toContain('| check 18:12');
  });

  it('enriches only the first transaction when checks are outnumbered', () => {
    const check: ParsedCheck = {
      filePath: '/tmp/2026-06-06 18-10-12.JPEG',
      recipient: 'SHOP A',
      recipientEnglish: 'SHOP A',
      amountMinor: 85000n,
      date: '2026-06-06',
      time: '18:10',
      warnings: [],
    };
    const result = enrichRecipientsFromChecks(
      [
        tx({ id: 't1', date: '2026-06-06', debit: 85000n }),
        tx({ id: 't2', date: '2026-06-06', debit: 85000n }),
      ],
      [check],
    );
    expect(result.warnings).toEqual([]);
    expect(result.transactions[0].remitterOrBeneficiary).toBe('SHOP A');
    expect(result.transactions[1].remitterOrBeneficiary).toBe('PMT. PROMPTPAY');
  });

  it('warns when more checks share a (date, amount) than there are transactions', () => {
    const first: ParsedCheck = {
      filePath: '/tmp/2026-06-06 18-10-12.JPEG',
      recipient: 'SHOP A',
      recipientEnglish: 'SHOP A',
      amountMinor: 85000n,
      date: '2026-06-06',
      time: '18:10',
      warnings: [],
    };
    const second: ParsedCheck = {
      filePath: '/tmp/2026-06-06 18-12-57.JPEG',
      recipient: 'SHOP B',
      recipientEnglish: 'SHOP B',
      amountMinor: 85000n,
      date: '2026-06-06',
      time: '18:12',
      warnings: [],
    };
    const result = enrichRecipientsFromChecks(
      [tx({ id: 't1', date: '2026-06-06', debit: 85000n })],
      [first, second],
    );
    expect(result.transactions[0].remitterOrBeneficiary).toBe('SHOP A');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('No unconsumed transaction');
  });
});
