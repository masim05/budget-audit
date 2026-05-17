import { convertAmdToUsdMinor, preferredAmount } from '../shared/index.js';
import type { Transaction } from '../transaction/index.js';
import type { InternalMatch } from './internal-match.js';
import type { MatchingMode } from './matching-mode.js';

export interface InternalMovementResult {
  matches: InternalMatch[];
  excludedTransactionIds: Set<string>;
  warnings: string[];
}

export function findInternalMovements(
  transactions: Transaction[],
  matchingMode: MatchingMode,
): InternalMovementResult {
  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const key =
      transaction.transactionNumber ||
      `${transaction.date}:${transaction.details}`;
    groups.set(key, [...(groups.get(key) ?? []), transaction]);
  }

  const matches: InternalMatch[] = [];
  const warnings: string[] = [];
  const excludedTransactionIds = new Set<string>();

  for (const [key, group] of groups) {
    const incoming = group.filter(
      (transaction) => (transaction.credit ?? 0n) > 0n,
    );
    const outgoing = group.filter(
      (transaction) => (transaction.debit ?? 0n) > 0n,
    );
    if (incoming.length === 0 || outgoing.length === 0) continue;
    const confidence =
      incoming.length === 1 && outgoing.length === 1 ? 'high' : 'probable';
    if (confidence === 'probable' && matchingMode === 'strict') {
      warnings.push(
        `Ambiguous internal movement candidate ${key} was included in totals`,
      );
      continue;
    }
    const type =
      new Set(group.map((transaction) => transaction.currency)).size > 1
        ? 'conversion'
        : 'transfer';
    for (const transaction of group) excludedTransactionIds.add(transaction.id);
    const amount = group.reduce((largest, transaction) => {
      const original = preferredAmount(transaction.credit, transaction.debit);
      const normalizedAmd = preferredAmount(
        transaction.creditAmd,
        transaction.debitAmd,
      );
      const amd = normalizedAmd > 0n ? normalizedAmd : original;
      const usd =
        transaction.currency === 'USD' ? original : convertAmdToUsdMinor(amd);
      return usd > largest ? usd : largest;
    }, 0n);
    matches.push({
      matchId: `${type}-${matches.length + 1}`,
      type,
      confidence,
      transactionIds: group.map((transaction) => transaction.id),
      transactionNumbers: group.map(
        (transaction) => transaction.transactionNumber,
      ),
      usdAmount: amount,
      evidence: ['matching transaction evidence', confidence, key],
    });
  }

  return { matches, excludedTransactionIds, warnings };
}
