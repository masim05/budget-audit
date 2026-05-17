import type { Transaction, TransactionClassification } from './transaction.js';

export function classifyExternalTransaction(
  transaction: Transaction,
): TransactionClassification {
  if ((transaction.credit ?? 0n) > 0n && (transaction.debit ?? 0n) === 0n)
    return 'income';
  if ((transaction.debit ?? 0n) > 0n && (transaction.credit ?? 0n) === 0n)
    return 'spend';
  if (
    (transaction.creditAmd ?? 0n) === 0n &&
    (transaction.debitAmd ?? 0n) === 0n
  )
    return 'invalid';
  return 'ambiguous_internal_candidate';
}
