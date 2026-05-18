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
    loaded.transactions,
    options.matchingMode,
  );
  const inRangeTransactionIds = new Set(
    transactions.map((transaction) => transaction.id),
  );
  const inRangeInternalMatches = movementResult.matches.filter((match) =>
    match.transactionIds.some((id) => inRangeTransactionIds.has(id)),
  );
  let incomeUsd = 0n;
  let spendUsd = 0n;
  const warnings = [...loaded.warnings, ...movementResult.warnings];

  for (const transaction of transactions) {
    if (movementResult.excludedTransactionIds.has(transaction.id)) continue;
    transaction.classification = classifyExternalTransaction(transaction);
    if (transaction.classification === 'income') {
      const amount = transactionUsdAmount(transaction);
      if (amount === undefined)
        warnings.push(unsupportedCurrencyWarning(transaction));
      else incomeUsd += amount;
    }
    if (transaction.classification === 'spend') {
      const amount = transactionUsdAmount(transaction);
      if (amount === undefined)
        warnings.push(unsupportedCurrencyWarning(transaction));
      else spendUsd += amount;
    }
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
    excludedInternalTransfers: inRangeInternalMatches.filter(
      (match) => match.type === 'transfer',
    ),
    excludedInternalConversions: inRangeInternalMatches.filter(
      (match) => match.type === 'conversion',
    ),
    warnings,
  };
}

function transactionUsdAmount(transaction: Transaction): bigint | undefined {
  const original = preferredAmount(transaction.credit, transaction.debit);
  if (transaction.currency === 'USD') return original;
  if (transaction.currency === 'UNKNOWN') return undefined;
  const normalizedAmd = preferredAmount(
    transaction.creditAmd,
    transaction.debitAmd,
  );
  const amd = normalizedAmd !== 0n ? normalizedAmd : original;
  return convertAmdToUsdMinor(amd);
}

function unsupportedCurrencyWarning(transaction: Transaction): string {
  return `Unsupported currency for transaction ${transaction.transactionNumber}; excluded from totals`;
}
