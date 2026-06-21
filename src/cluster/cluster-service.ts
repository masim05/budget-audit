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
  // Use pre-parsed checks when available to avoid redundant API calls on re-runs.
  const checks =
    options.parsedChecks ??
    (await options.checkParser.parseChecks(options.checksFolder));
  const inRangeTransactions = loaded.transactions.filter((t) =>
    isWithinDateRange(t.date, options.dateRange),
  );
  const movementResult = findInternalMovements(inRangeTransactions, 'strict');

  const spendTransactions = inRangeTransactions.filter((transaction) => {
    /* v8 ignore next 2 */
    if (movementResult.excludedTransactionIds.has(transaction.id)) return false;
    // Safe: PdfStatementSource only yields THB. If a non-THB source is ever
    // wired in, add a currency guard here to prevent mixing THB totals.
    return classifyExternalTransaction(transaction) === 'spend';
  });
  const enrichment = enrichRecipientsFromChecks(spendTransactions, checks);
  const enrichedSpendTransactions = enrichment.transactions;

  const clusters = new Map<
    string,
    {
      name: string;
      total: bigint;
      transactions: typeof enrichedSpendTransactions;
    }
  >();

  const unmatched = new Map<string, typeof enrichedSpendTransactions>();

  for (const tx of enrichedSpendTransactions) {
    const { cluster } = matchCluster(
      tx.remitterOrBeneficiary,
      options.config,
      options.approach,
    );
    if (cluster === 'other') {
      const key = tx.remitterOrBeneficiary.trim() || 'UNKNOWN';
      const current = unmatched.get(key) ?? [];
      current.push(tx);
      unmatched.set(key, current);
    }
    const prev = clusters.get(cluster) ?? {
      name: cluster,
      total: 0n,
      transactions: [],
    };
    prev.total = prev.total + /* v8 ignore next */ (tx.debit ?? 0n);
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
