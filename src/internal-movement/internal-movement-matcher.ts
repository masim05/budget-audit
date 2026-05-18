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
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [transaction]);
    else group.push(transaction);
  }

  const matches: InternalMatch[] = [];
  const warnings: string[] = [];
  const excludedTransactionIds = new Set<string>();

  for (const [key, group] of groups) {
    const incoming = group.filter(
      (transaction) => (transaction.credit ?? 0n) !== 0n,
    );
    const outgoing = group.filter(
      (transaction) => (transaction.debit ?? 0n) !== 0n,
    );
    if (incoming.length === 0 || outgoing.length === 0) continue;
    if (
      !hasDistinctAccounts(group) ||
      !hasMatchingAmounts(incoming, outgoing)
    ) {
      warnings.push(
        `Internal movement candidate ${key} was included in totals because accounts or amounts did not match`,
      );
      continue;
    }
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
      const usd = matchingUsdAmount(transaction) ?? 0n;
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

function hasDistinctAccounts(group: Transaction[]): boolean {
  return (
    new Set(group.map((transaction) => transaction.accountNumber)).size > 1
  );
}

function hasMatchingAmounts(
  incoming: Transaction[],
  outgoing: Transaction[],
): boolean {
  return incoming.some((incomingTransaction) =>
    outgoing.some((outgoingTransaction) => {
      const incomingAmount = matchingUsdAmount(incomingTransaction);
      const outgoingAmount = matchingUsdAmount(outgoingTransaction);
      return incomingAmount !== undefined && incomingAmount === outgoingAmount;
    }),
  );
}

function matchingUsdAmount(transaction: Transaction): bigint | undefined {
  const original = preferredAmount(transaction.credit, transaction.debit);
  const normalizedAmd = preferredAmount(
    transaction.creditAmd,
    transaction.debitAmd,
  );
  const amd = normalizedAmd !== 0n ? normalizedAmd : original;
  if (transaction.currency === 'UNKNOWN') return undefined;
  const amount =
    transaction.currency === 'USD' ? original : convertAmdToUsdMinor(amd);
  return amount < 0n ? -amount : amount;
}
