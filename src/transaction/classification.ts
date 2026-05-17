import type { Transaction, TransactionClassification } from './transaction.js';

export function classifyExternalTransaction(
  transaction: Transaction,
): TransactionClassification {
  const hasCredit = (transaction.credit ?? 0n) !== 0n;
  const hasDebit = (transaction.debit ?? 0n) !== 0n;
  if (hasCredit && !hasDebit) return 'income';
  if (hasDebit && !hasCredit) return 'spend';
  if (
    (transaction.creditAmd ?? 0n) === 0n &&
    (transaction.debitAmd ?? 0n) === 0n
  )
    return 'invalid';
  return 'ambiguous_internal_candidate';
}
