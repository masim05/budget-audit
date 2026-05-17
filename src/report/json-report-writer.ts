import type { AuditReport } from '../audit/index.js';
import { formatUsd } from '../shared/index.js';
import type { ReportWriter } from './index.js';

export class JsonReportWriter implements ReportWriter {
  write(report: AuditReport): string {
    return `${JSON.stringify(toJson(report), null, 2)}\n`;
  }
}

function toJson(report: AuditReport) {
  return {
    audited_folder: report.auditedFolder,
    date_range: report.dateRange,
    matching_mode: report.matchingMode,
    account_currencies_found: report.accountCurrenciesFound,
    totals: {
      income_usd: formatUsd(report.totals.incomeUsd),
      spend_usd: formatUsd(report.totals.spendUsd),
    },
    processed_files: report.processedFiles.map((file) => ({
      path: file.path,
      status: file.processingStatus,
      transactions_read: file.transactionsRead,
      warnings: file.warnings,
    })),
    excluded_internal_transfers:
      report.excludedInternalTransfers.map(formatMatch),
    excluded_internal_conversions:
      report.excludedInternalConversions.map(formatMatch),
    warnings: report.warnings,
  };
}

function formatMatch(match: {
  matchId: string;
  confidence: string;
  transactionNumbers: string[];
  usdAmount: bigint;
  evidence: string[];
}) {
  return {
    match_id: match.matchId,
    confidence: match.confidence,
    transaction_numbers: match.transactionNumbers,
    usd_amount: formatUsd(match.usdAmount),
    evidence: match.evidence,
  };
}
