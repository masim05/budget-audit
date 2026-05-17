import {
  findInternalMovements,
  type MatchingMode,
} from '../internal-movement/index.js';
import {
  convertAmdToUsdMinor,
  isWithinDateRange,
  preferredAmount,
  type DateRange,
} from '../shared/index.js';
import type { StatementSource } from '../statement/index.js';
import {
  classifyExternalTransaction,
  type Transaction,
} from '../transaction/index.js';
import type { AuditReport } from './audit-report.js';

export interface AuditServiceOptions {
  dataDir: string;
  dateRange: DateRange;
  matchingMode: MatchingMode;
  statementSource: StatementSource;
}

export async function runAudit(
  options: AuditServiceOptions,
): Promise<AuditReport> {
  const loaded = await options.statementSource.load();
  const transactions = loaded.transactions.filter((transaction) =>
    isWithinDateRange(transaction.date, options.dateRange),
  );
  const movementResult = findInternalMovements(
    transactions,
    options.matchingMode,
  );
  let incomeUsd = 0n;
  let spendUsd = 0n;
  const warnings = [...loaded.warnings, ...movementResult.warnings];

  for (const transaction of transactions) {
    if (movementResult.excludedTransactionIds.has(transaction.id)) continue;
    transaction.classification = classifyExternalTransaction(transaction);
    if (transaction.classification === 'income')
      incomeUsd += transactionUsdAmount(transaction);
    if (transaction.classification === 'spend')
      spendUsd += transactionUsdAmount(transaction);
    if (transaction.classification === 'invalid')
      warnings.push(`Invalid transaction ${transaction.transactionNumber}`);
  }

  return {
    auditedFolder: options.dataDir,
    dateRange: options.dateRange,
    matchingMode: options.matchingMode,
    accountCurrenciesFound: [
      ...new Set(transactions.map((transaction) => transaction.currency)),
    ].sort(),
    totals: { incomeUsd, spendUsd },
    processedFiles: loaded.statementFiles,
    excludedInternalTransfers: movementResult.matches.filter(
      (match) => match.type === 'transfer',
    ),
    excludedInternalConversions: movementResult.matches.filter(
      (match) => match.type === 'conversion',
    ),
    warnings,
  };
}

function transactionUsdAmount(transaction: Transaction): bigint {
  const original = preferredAmount(transaction.credit, transaction.debit);
  if (transaction.currency === 'USD') return original;
  const normalizedAmd = preferredAmount(
    transaction.creditAmd,
    transaction.debitAmd,
  );
  const amd = normalizedAmd > 0n ? normalizedAmd : original;
  return convertAmdToUsdMinor(amd);
}
