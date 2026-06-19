import { findInternalMovements } from '../internal-movement/internal-movement-matcher.js';
import { isWithinDateRange } from '../shared/date-range.js';
import { classifyExternalTransaction } from '../transaction/classification.js';
import { matchCluster } from './cluster-match.js';
import type { ClusterReport, ClusterServiceOptions } from './cluster-report.js';

export async function runCluster(options: ClusterServiceOptions): Promise<ClusterReport> {
  const loaded = await options.statementSource.load();
  const movementResult = findInternalMovements(loaded.transactions, 'strict');

  const spendTransactions = loaded.transactions.filter((transaction) => {
    if (!isWithinDateRange(transaction.date, options.dateRange)) return false;
    if (movementResult.excludedTransactionIds.has(transaction.id)) return false;
    return classifyExternalTransaction(transaction) === 'spend' && transaction.currency === 'THB';
  });

  const clusters = new Map<string, { name: string; totalThb: bigint; transactions: typeof spendTransactions }>();

  const unmatched = new Set<string>();

  for (const tx of spendTransactions) {
    const { cluster, matchedBy } = matchCluster(tx.remitterOrBeneficiary ?? '', options.config, options.approach);
    if (cluster === 'Other') unmatched.add(tx.remitterOrBeneficiary ?? '');
    const prev = clusters.get(cluster) ?? { name: cluster, totalThb: 0n, transactions: [] };
    prev.totalThb = prev.totalThb + (tx.debit ?? 0n);
    prev.transactions.push(tx);
    clusters.set(cluster, prev);
  }

  return {
    auditedFolder: options.statementsFolder,
    checksFolder: options.checksFolder,
    dateRange: options.dateRange,
    clusters: Array.from(clusters.values()),
    unmatchedReceivers: Array.from(unmatched),
    warnings: loaded.warnings.concat(movementResult.warnings),
  };
}
