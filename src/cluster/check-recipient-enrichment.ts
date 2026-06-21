import { basename } from 'node:path';
import type { ParsedCheck } from '../checks/index.js';
import type { Transaction } from '../transaction/index.js';

function matches(tx: Transaction, check: ParsedCheck): boolean {
  return tx.date === check.date && (tx.debit ?? 0n) === check.amountMinor;
}

export function enrichRecipientsFromChecks(
  transactions: Transaction[],
  checks: ParsedCheck[],
): { transactions: Transaction[]; warnings: string[] } {
  const updated = transactions.map((tx) => ({ ...tx }));
  const warnings: string[] = [];
  const consumed = new Set<Transaction>();

  // Bank statements carry no per-transaction time, so several payments can
  // share the same (date, amount). Pair each check with a distinct transaction
  // one-to-one instead of bailing out: process checks in chronological order
  // (their filename timestamp) and consume transactions in statement order, so
  // the earliest check links to the earliest matching transaction.
  const orderedChecks = [...checks].sort((a, b) =>
    `${a.date} ${a.time} ${a.filePath}`.localeCompare(
      `${b.date} ${b.time} ${b.filePath}`,
    ),
  );

  for (const check of orderedChecks) {
    const matching = updated.filter((tx) => matches(tx, check));
    if (matching.length === 0) {
      warnings.push(
        `No matching transaction for check ${basename(check.filePath)} (${check.amountMinor})`,
      );
      continue;
    }
    const tx = matching.find((candidate) => !consumed.has(candidate));
    if (tx === undefined) {
      warnings.push(
        `No unconsumed transaction for check ${basename(check.filePath)} (${matching.length} matching, all already linked to other checks)`,
      );
      continue;
    }
    consumed.add(tx);
    tx.remitterOrBeneficiary = check.recipientEnglish || check.recipient;
    tx.details = `${tx.details} | check ${check.time}`;
  }

  return { transactions: updated, warnings };
}
