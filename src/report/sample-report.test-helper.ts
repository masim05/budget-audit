import type { AuditReport } from '../audit/index.js';

export function sampleReport(): AuditReport {
  return {
    auditedFolder: './data',
    dateRange: { from: '2026-05-01', to: '2026-05-31' },
    matchingMode: 'strict',
    accountCurrenciesFound: ['USD'],
    totals: { incomeUsd: 1000n, spendUsd: 250n },
    processedFiles: [
      {
        path: 'file.csv',
        header: [],
        accountNumbers: ['ACC'],
        processingStatus: 'processed',
        transactionsRead: 1,
        warnings: [],
      },
    ],
    excludedInternalTransfers: [
      {
        matchId: 'transfer-1',
        type: 'transfer',
        confidence: 'high',
        transactionIds: ['1', '2'],
        transactionNumbers: ['001', '001'],
        usdAmount: 500n,
        evidence: ['same transaction number'],
      },
    ],
    excludedInternalConversions: [],
    warnings: ['Review row 3'],
  };
}
