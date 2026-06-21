import { basename } from 'node:path';
import type { ParsedCheck } from '../checks/index.js';
import type { Transaction } from '../transaction/index.js';

function findCandidates(txs: Transaction[], check: ParsedCheck): Transaction[] {
  return txs.filter(
    (tx) => tx.date === check.date && (tx.debit ?? 0n) === check.amountMinor,
  );
}

export function enrichRecipientsFromChecks(
  transactions: Transaction[],
  checks: ParsedCheck[],
): { transactions: Transaction[]; warnings: string[] } {
  const updated = transactions.map((tx) => ({ ...tx }));
  const warnings: string[] = [];

  for (const check of checks) {
    const candidates = findCandidates(updated, check);
    if (candidates.length === 0) {
      warnings.push(
        `No matching transaction for check ${basename(check.filePath)} (${check.amountMinor})`,
      );
      continue;
    }
    if (candidates.length > 1) {
      warnings.push(
        `Ambiguous transaction match for check ${basename(check.filePath)} (${candidates.length} candidates)`,
      );
      continue;
    }
    const tx = candidates[0];
    tx.remitterOrBeneficiary = check.recipientEnglish || check.recipient;
    tx.details = `${tx.details} | check ${check.time}`;
  }

  return { transactions: updated, warnings };
}
