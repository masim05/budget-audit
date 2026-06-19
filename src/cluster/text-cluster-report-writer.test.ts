import { describe, expect, it } from 'vitest';
import type { ClusterReport } from './cluster-report.js';
import { TextClusterReportWriter } from './text-cluster-report-writer.js';

describe('TextClusterReportWriter', () => {
  it('writes a minimal cluster report', () => {
    const report: ClusterReport = {
      auditedFolder: '/data/statements',
      checksFolder: '/data/checks',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      clusters: [],
      unmatchedReceivers: [],
      warnings: [],
    };

    const writer = new TextClusterReportWriter();
    const output = writer.write(report, false);

    expect(output).toContain('Statements: /data/statements');
    expect(output).toContain('Checks: /data/checks');
    expect(output).toContain('Period: 2026-05-01 to 2026-05-31');
  });

  it('writes clusters with totals', () => {
    const report: ClusterReport = {
      auditedFolder: '/data/statements',
      checksFolder: '/data/checks',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      clusters: [
        {
          name: 'food',
          totalThb: 50000n,
          transactions: [
            {
              id: 'tx1',
              date: '2026-05-15',
              transactionType: 'Card',
              transactionNumber: '1001',
              accountNumber: 'ACC',
              credit: 0n,
              debit: 50000n,
              creditAmd: 0n,
              debitAmd: 0n,
              remitterOrBeneficiary: 'Cafe Market',
              details: 'Lunch',
              type: 'Outgoing',
              currency: 'THB',
              cluster: 'food',
              matchedBy: 'mapping',
              normalizedReceiver: 'cafemarket',
            },
          ],
        },
      ],
      unmatchedReceivers: [],
      warnings: [],
    };

    const writer = new TextClusterReportWriter();
    const output = writer.write(report, false);

    expect(output).toContain('Cluster: food');
    expect(output).toContain('Total: ฿500.00');
  });

  it('writes verbose details including transactions', () => {
    const report: ClusterReport = {
      auditedFolder: '/data/statements',
      checksFolder: '/data/checks',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      clusters: [
        {
          name: 'food',
          totalThb: 50000n,
          transactions: [
            {
              id: 'tx1',
              date: '2026-05-15',
              transactionType: 'Card',
              transactionNumber: '1001',
              accountNumber: 'ACC',
              credit: 0n,
              debit: 50000n,
              creditAmd: 0n,
              debitAmd: 0n,
              remitterOrBeneficiary: 'Cafe Market',
              details: 'Lunch',
              type: 'Outgoing',
              currency: 'THB',
              cluster: 'food',
              matchedBy: 'mapping',
              normalizedReceiver: 'cafemarket',
            },
          ],
        },
      ],
      unmatchedReceivers: [],
      warnings: [],
    };

    const writer = new TextClusterReportWriter();
    const output = writer.write(report, true);

    expect(output).toContain('Cluster: food');
    expect(output).toContain('2026-05-15');
    expect(output).toContain('Cafe Market');
    expect(output).toContain('฿500.00');
  });

  it('writes unmatched receivers when present', () => {
    const report: ClusterReport = {
      auditedFolder: '/data/statements',
      checksFolder: '/data/checks',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      clusters: [],
      unmatchedReceivers: ['unknownshop', 'anotherstore'],
      warnings: [],
    };

    const writer = new TextClusterReportWriter();
    const output = writer.write(report, false);

    expect(output).toContain('Unmatched receivers:');
    expect(output).toContain('unknownshop');
    expect(output).toContain('anotherstore');
  });

  it('writes warnings when present', () => {
    const report: ClusterReport = {
      auditedFolder: '/data/statements',
      checksFolder: '/data/checks',
      dateRange: { from: '2026-05-01', to: '2026-05-31' },
      clusters: [],
      unmatchedReceivers: [],
      warnings: ['Warning: duplicate transaction detected'],
    };

    const writer = new TextClusterReportWriter();
    const output = writer.write(report, false);

    expect(output).toContain('Warnings:');
    expect(output).toContain('Warning: duplicate transaction detected');
  });
});
