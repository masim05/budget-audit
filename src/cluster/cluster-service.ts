import { findInternalMovements } from '../internal-movement/internal-movement-matcher.js';
import { isWithinDateRange } from '../shared/date-range.js';
import type { DateRange } from '../shared/index.js';
import type { StatementSource } from '../statement/index.js';
import { classifyExternalTransaction } from '../transaction/classification.js';
import type { ClusterConfig } from './cluster-config.js';
import type { ClusterApproach } from './cluster-match.js';
import { matchCluster } from './cluster-match.js';
import type { ClusterReport, ClusteredTransaction } from './cluster-report.js';

export interface ClusterServiceOptions {
  statementsFolder: string;
  checksFolder: string;
  dateRange: DateRange;
  approach: ClusterApproach;
  statementSource: StatementSource;
  config: ClusterConfig;
}

export async function runCluster(
  options: ClusterServiceOptions,
): Promise<ClusterReport> {
  const loaded = await options.statementSource.load();

  const movementResult = findInternalMovements(loaded.transactions, 'strict');

  const spendTransactions = loaded.transactions.filter((transaction) => {
    if (!isWithinDateRange(transaction.date, options.dateRange)) return false;
    if (movementResult.excludedTransactionIds.has(transaction.id)) return false;
    return (
      classifyExternalTransaction(transaction) === 'spend' &&
      transaction.currency === 'THB'
    );
  });

  const clusteredTransactions: ClusteredTransaction[] = spendTransactions.map(
    (transaction) => {
      const match = matchCluster(
        transaction.remitterOrBeneficiary,
        options.config,
        options.approach,
      );
      return {
        ...transaction,
        cluster: match.cluster,
        matchedBy: match.matchedBy,
        normalizedReceiver: match.normalizedReceiver,
      };
    },
  );

  const clusterMap = new Map<
    string,
    { totalThb: bigint; transactions: ClusteredTransaction[] }
  >();

  for (const transaction of clusteredTransactions) {
    const existing = clusterMap.get(transaction.cluster);
    if (existing) {
      existing.totalThb += transaction.debit ?? 0n;
      existing.transactions.push(transaction);
    } else {
      clusterMap.set(transaction.cluster, {
        totalThb: transaction.debit ?? 0n,
        transactions: [transaction],
      });
    }
  }

  const clusters = Array.from(clusterMap.entries())
    .map(([name, data]) => ({
      name,
      totalThb: data.totalThb,
      transactions: data.transactions,
    }))
    .filter((cluster) => cluster.totalThb > 0n)
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const unmatchedReceivers = clusteredTransactions
    .filter((tx) => tx.matchedBy === 'other')
    .map((tx) => tx.normalizedReceiver)
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort();

  return {
    auditedFolder: options.statementsFolder,
    checksFolder: options.checksFolder,
    dateRange: options.dateRange,
    clusters,
    unmatchedReceivers,
    warnings: [...loaded.warnings, ...movementResult.warnings],
  };
}
