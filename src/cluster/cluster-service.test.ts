import { describe, expect, it } from 'vitest';
import { runCluster } from './cluster-service.js';
import type { ClusterConfig } from './cluster-config.js';
import type { StatementSource } from '../statement/index.js';
import type { Transaction } from '../transaction/index.js';

const config: ClusterConfig = {
  mappings: { 'CAFE MARKET': 'food' },
  patterns: [{ pattern: '/^LOTUS/i', cluster: 'groceries' }],
  clusters: ['food', 'groceries', 'Other'],
};

describe('cluster service', () => {
  it('keeps only in-range external spend and totals THB by cluster', async () => {
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
            tx({
              id: '3',
              transactionNumber: 'move',
              remitterOrBeneficiary: 'Own',
              debit: 5000n,
            }),
            tx({
              id: '4',
              accountNumber: 'ACC2',
              transactionNumber: 'move',
              credit: 5000n,
              debit: 0n,
              directionType: 'Incoming',
            }),
          ],
          warnings: [],
        };
      },
    };

    const report = await runCluster({
      statementsFolder: './data/statements',
      checksFolder: './data/checks',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      approach: 'deterministic',
      statementSource: source,
      config,
    });

    expect(report.clusters).toEqual([
      expect.objectContaining({ name: 'food', totalThb: 12345n }),
    ]);
    expect(report.unmatchedReceivers).toEqual([]);
  });
});
