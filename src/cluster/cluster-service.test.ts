import { describe, expect, it } from 'vitest';
import { runCluster } from './cluster-service.js';
import type { ClusterConfig } from './cluster-config.js';
import type { StatementSource } from '../statement/index.js';
import type { Transaction } from '../transaction/index.js';
import type { CheckParser } from '../checks/index.js';

const config: ClusterConfig = {
  mappings: { 'CAFE MARKET': 'food' },
  patterns: [{ pattern: '/^LOTUS/i', cluster: 'groceries' }],
  clusters: ['food', 'groceries', 'other'],
};

describe('cluster service', () => {
  it('keeps only in-range external spend and totals THB by cluster (handles out-of-range counterpart)', async () => {
    const source: StatementSource = {
      async load() {
        const tx = (overrides: Partial<Transaction>): Transaction => ({
          id: '1',
          date: '2026-05-15',
          transactionType: 'Card',
          transactionNumber: '1001',
          accountNumber: 'ACC',
          currency: 'THB',
          credit: 0n,
          debit: 12345n,
          creditAmd: 0n,
          debitAmd: 0n,
          remitterOrBeneficiary: 'Cafe Market',
          details: 'Lunch',
          directionType: 'Outgoing',
          sourceFile: 'TH_THB_1001.csv',
          classification: 'invalid',
          ...overrides,
        });

        return {
          sourceName: 'test',
          sourceLocation: 'test',
          statementFiles: [],
          transactions: [
            tx({}),
            tx({
              id: '2',
              credit: 1000n,
              debit: 0n,
              directionType: 'Incoming',
            }),
            // internal movement candidate where counterpart is OUT OF RANGE (different date)
            tx({
              id: '3',
              transactionNumber: 'move',
              remitterOrBeneficiary: 'Own',
              debit: 5000n,
            }),
            tx({
              id: '4',
              transactionNumber: 'move',
              date: '2026-06-01',
              accountNumber: 'ACC2',
              credit: 0n,
              debit: 0n,
              directionType: 'Incoming',
              creditAmd: 5000n,
            }),
          ],
          warnings: [],
        };
      },
    };
    const checkParser: CheckParser = {
      async parseChecks() {
        return [
          {
            filePath: '/tmp/2026-05-15 08-00-00.JPEG',
            recipient: 'Cafe Market',
            recipientEnglish: 'Cafe Market',
            amountMinor: 12345n,
            date: '2026-05-15',
            time: '08:00',
            warnings: [],
          },
        ];
      },
    };

    const report = await runCluster({
      statementsFolder: './data/statements',
      checksFolder: './data/checks',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      approach: 'deterministic',
      statementSource: source,
      checkParser,
      config,
    });

    expect(report.clusters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'food', totalThb: 12345n }),
        expect.objectContaining({ name: 'other', totalThb: 5000n }),
      ]),
    );
    expect(report.unmatchedReceivers).toEqual(expect.arrayContaining(['Own']));
    expect(report.otherRecipients).toEqual(
      expect.arrayContaining([expect.objectContaining({ recipient: 'Own' })]),
    );
  });

  it('covers branch paths: excluded movements, multi-tx clusters, empty-name fallback', async () => {
    const make = (overrides: Partial<Transaction>): Transaction => ({
      id: 'x',
      date: '2026-05-15',
      transactionType: 'Card',
      transactionNumber: 'TRF001',
      accountNumber: 'ACC1',
      currency: 'THB',
      credit: 0n,
      debit: 5000n,
      creditAmd: 0n,
      debitAmd: 0n,
      remitterOrBeneficiary: 'CAFE MARKET',
      details: 'lunch',
      directionType: 'Outgoing',
      sourceFile: 'stmt.pdf',
      classification: 'invalid',
      ...overrides,
    });

    const source: StatementSource = {
      async load() {
        return {
          sourceName: 'test',
          sourceLocation: 'test',
          statementFiles: [],
          warnings: [],
          transactions: [
            // Internal movement pair (same transactionNumber, distinct accounts)
            make({
              id: 'im1',
              accountNumber: 'ACC1',
              debit: 5000n,
              credit: 0n,
            }),
            make({
              id: 'im2',
              accountNumber: 'ACC2',
              transactionNumber: 'TRF001',
              debit: undefined,
              credit: 5000n,
              directionType: 'Incoming',
            }),
            // Two transactions in same named cluster → clusters.get() non-null branch
            make({ id: 'a1', transactionNumber: 'A1', debit: 1000n }),
            make({ id: 'a2', transactionNumber: 'A2', debit: 2000n }),
            // Transaction going to 'other' twice (same recipient) → unmatched.get() non-null branch
            make({
              id: 'b1',
              transactionNumber: 'B1',
              remitterOrBeneficiary: 'OwnShop',
              debit: 3000n,
            }),
            make({
              id: 'b2',
              transactionNumber: 'B2',
              remitterOrBeneficiary: 'OwnShop',
              debit: 4000n,
            }),
            // Empty remitterOrBeneficiary → || 'UNKNOWN' branch
            make({
              id: 'b3',
              transactionNumber: 'B3',
              remitterOrBeneficiary: '',
              debit: 500n,
            }),
            // tx.debit undefined → tx.debit ?? 0n branch (goes to 'food' cluster via mapping override)
            make({
              id: 'a3',
              transactionNumber: 'A3',
              debit: undefined,
              credit: undefined,
            }),
          ],
        };
      },
    };
    const checkParser: CheckParser = {
      async parseChecks() {
        return [];
      },
    };

    const report = await runCluster({
      statementsFolder: './data/statements',
      checksFolder: './data/checks',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      approach: 'deterministic',
      statementSource: source,
      checkParser,
      config,
    });

    const clusterNames = report.clusters.map((c) => c.name);
    expect(clusterNames).toContain('food');
    expect(report.unmatchedReceivers).toContain('OwnShop');
    expect(report.unmatchedReceivers).toContain('UNKNOWN');
  });
});
