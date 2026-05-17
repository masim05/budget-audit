import type { AuditReport } from '../audit/index.js';
import { formatUsd } from '../shared/index.js';
import type { ReportWriter } from './index.js';

export class TextReportWriter implements ReportWriter {
  write(report: AuditReport): string {
    const warnings =
      report.warnings.length === 0 ? 'None' : report.warnings.join('\n- ');
    const files = report.processedFiles
      .map(
        (file) =>
          `${file.path}: ${file.processingStatus} (${file.transactionsRead} transactions)`,
      )
      .join('\n');
    return [
      `Audited folder: ${report.auditedFolder}`,
      `Date range: ${report.dateRange.from} to ${report.dateRange.to}`,
      `Matching mode: ${report.matchingMode}`,
      `Account currencies found: ${report.accountCurrenciesFound.join(', ') || 'None'}`,
      `USD income total: ${formatUsd(report.totals.incomeUsd)}`,
      `USD spend total: ${formatUsd(report.totals.spendUsd)}`,
      `Excluded internal transfers: ${report.excludedInternalTransfers.length}`,
      `Excluded internal currency conversions: ${report.excludedInternalConversions.length}`,
      'File processing summary:',
      files || 'No files processed',
      'Warnings:',
      warnings === 'None' ? warnings : `- ${warnings}`,
      '',
    ].join('\n');
  }
}
