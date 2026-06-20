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
    const result = enrichRecipientsFromChecks([tx({ debit: undefined })], [check]);
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

  it('warns on ambiguous matches', () => {
    const check: ParsedCheck = {
      filePath: '/tmp/2026-06-01 08-22-54.JPEG',
      recipient: 'X',
      recipientEnglish: 'X',
      amountMinor: 8500n,
      date: '2026-06-01',
      time: '08:22',
      warnings: [],
    };
    const result = enrichRecipientsFromChecks(
      [tx({ id: '1' }), tx({ id: '2' })],
      [check],
    );
    expect(result.warnings[0]).toContain('Ambiguous');
  });
});
