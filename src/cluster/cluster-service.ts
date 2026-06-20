import { findInternalMovements } from '../internal-movement/internal-movement-matcher.js';
import { isWithinDateRange } from '../shared/date-range.js';
import { classifyExternalTransaction } from '../transaction/classification.js';
import { enrichRecipientsFromChecks } from './check-recipient-enrichment.js';
import { matchCluster } from './cluster-match.js';
import type { ClusterReport, ClusterServiceOptions } from './cluster-report.js';

export async function runCluster(
  options: ClusterServiceOptions,
): Promise<ClusterReport> {
  const loaded = await options.statementSource.load();
  const checks = await options.checkParser.parseChecks(options.checksFolder);
  const inRangeTransactions = loaded.transactions.filter((t) =>
    isWithinDateRange(t.date, options.dateRange),
  );
  const movementResult = findInternalMovements(inRangeTransactions, 'strict');

  const spendTransactions = inRangeTransactions.filter((transaction) => {
    if (movementResult.excludedTransactionIds.has(transaction.id)) return false;
    return classifyExternalTransaction(transaction) === 'spend';
  });
  const enrichment = enrichRecipientsFromChecks(spendTransactions, checks);
  const enrichedSpendTransactions = enrichment.transactions;

  const clusters = new Map<
    string,
    {
      name: string;
      totalThb: bigint;
      transactions: typeof enrichedSpendTransactions;
    }
  >();

  const unmatched = new Map<string, typeof enrichedSpendTransactions>();

  for (const tx of enrichedSpendTransactions) {
    const { cluster } = matchCluster(
      tx.remitterOrBeneficiary ?? '',
      options.config,
      options.approach,
    );
    if (cluster === 'other') {
      const key = (tx.remitterOrBeneficiary ?? '').trim() || 'UNKNOWN';
      const current = unmatched.get(key) ?? [];
      current.push(tx);
      unmatched.set(key, current);
    }
    const prev = clusters.get(cluster) ?? {
      name: cluster,
      totalThb: 0n,
      transactions: [],
    };
    prev.totalThb = prev.totalThb + (tx.debit ?? 0n);
    prev.transactions.push(tx);
    clusters.set(cluster, prev);
  }

  return {
    auditedFolder: options.statementsFolder,
    checksFolder: options.checksFolder,
    dateRange: options.dateRange,
    clusters: Array.from(clusters.values()),
    unmatchedReceivers: Array.from(unmatched.keys()),
    otherRecipients: Array.from(unmatched.entries()).map(
      ([recipient, transactions]) => ({
        recipient,
        recipientEnglish: recipient,
        transactions,
      }),
    ),
    warnings: loaded.warnings
      .concat(movementResult.warnings)
      .concat(enrichment.warnings)
      .concat(checks.flatMap((check) => check.warnings)),
  };
}
