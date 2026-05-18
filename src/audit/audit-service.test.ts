import { describe, expect, it } from 'vitest';
import { runAudit } from './audit-service.js';
import type { StatementSource } from '../statement/index.js';
import type { Transaction } from '../transaction/index.js';

function source(transactions: Transaction[]): StatementSource {
  return {
    async load() {
      return {
        sourceName: 'test',
        sourceLocation: 'test',
        statementFiles: [
          {
            path: 'file.csv',
            header: [],
            accountNumbers: [],
            processingStatus: 'processed',
            transactionsRead: transactions.length,
            warnings: [],
          },
        ],
        transactions,
        warnings: [],
      };
    },
  };
}

function tx(id: string, credit: bigint, debit: bigint): Transaction {
  return {
    id,
    date: '2026-05-15',
    transactionType: 'Card',
    transactionNumber: id,
    accountNumber: 'ACC',
    currency: 'USD',
    credit,
    debit,
    creditAmd: credit * 400n,
    debitAmd: debit * 400n,
    remitterOrBeneficiary: 'Someone',
    details: 'Details',
    directionType: credit > 0n ? 'Incoming' : 'Outgoing',
    sourceFile: 'file.csv',
    classification: 'invalid',
  };
}

describe('audit service', () => {
  it('aggregates external income and spend and filters by date range', async () => {
    const report = await runAudit({
      dataDir: './data',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      matchingMode: 'strict',
      statementSource: source([
        tx('income', 500n, 0n),
        tx('spend', 0n, 125n),
        { ...tx('old', 999n, 0n), date: '2026-04-30' },
      ]),
    });
    expect(report.totals).toEqual({ incomeUsd: 500n, spendUsd: 125n });
  });

  it('excludes internal movements and warns on invalid transactions', async () => {
    const report = await runAudit({
      dataDir: './data',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      matchingMode: 'strict',
      statementSource: source([
        tx('same', 100n, 0n),
        {
          ...tx('same2', 0n, 100n),
          transactionNumber: 'same',
          accountNumber: 'ACC2',
        },
        { ...tx('bad', 0n, 0n), creditAmd: 0n, debitAmd: 0n },
      ]),
    });
    expect(report.excludedInternalTransfers).toHaveLength(1);
    expect(report.warnings).toContain('Invalid transaction bad');
  });

  it('excludes in-range internal movement sides matched against all loaded transactions', async () => {
    const report = await runAudit({
      dataDir: './data',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      matchingMode: 'strict',
      statementSource: source([
        tx('split', 100n, 0n),
        {
          ...tx('split-out', 0n, 100n),
          transactionNumber: 'split',
          accountNumber: 'ACC2',
          date: '2026-06-01',
        },
      ]),
    });
    expect(report.totals).toEqual({ incomeUsd: 0n, spendUsd: 0n });
    expect(report.excludedInternalTransfers).toHaveLength(1);
  });

  it('converts AMD external amounts to USD totals', async () => {
    const report = await runAudit({
      dataDir: './data',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      matchingMode: 'strict',
      statementSource: source([
        { ...tx('amd-income', 40000n, 0n), currency: 'AMD', creditAmd: 40000n },
        { ...tx('amd-spend', 0n, 80000n), currency: 'AMD', debitAmd: 80000n },
        {
          ...tx('amd-income-no-normalized', 40000n, 0n),
          currency: 'AMD',
          creditAmd: 0n,
          debitAmd: 0n,
        },
        {
          ...tx('amd-spend-no-credit', 0n, 40000n),
          currency: 'AMD',
          credit: undefined,
          creditAmd: undefined,
          debitAmd: 40000n,
        },
      ]),
    });
    expect(report.totals).toEqual({ incomeUsd: 200n, spendUsd: 300n });
  });

  it('excludes unknown currency transactions from totals with warnings', async () => {
    const report = await runAudit({
      dataDir: './data',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      matchingMode: 'strict',
      statementSource: source([
        { ...tx('unknown-income', 40000n, 0n), currency: 'UNKNOWN' },
        { ...tx('known-spend', 0n, 125n), currency: 'USD' },
      ]),
    });
    expect(report.totals).toEqual({ incomeUsd: 0n, spendUsd: 125n });
    expect(report.warnings).toContain(
      'Unsupported currency for transaction unknown-income; excluded from totals',
    );
  });

  it('excludes unknown currency spend transactions from totals with warnings', async () => {
    const report = await runAudit({
      dataDir: './data',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      matchingMode: 'strict',
      statementSource: source([
        { ...tx('known-income', 500n, 0n), currency: 'USD' },
        { ...tx('unknown-spend', 0n, 40000n), currency: 'UNKNOWN' },
      ]),
    });
    expect(report.totals).toEqual({ incomeUsd: 500n, spendUsd: 0n });
    expect(report.warnings).toContain(
      'Unsupported currency for transaction unknown-spend; excluded from totals',
    );
  });
});
