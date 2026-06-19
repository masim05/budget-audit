import { formatMoney } from '../shared/money.js';
import type { ClusterReport } from './cluster-report.js';

export class TextClusterReportWriter {
  write(report: ClusterReport, verbose: boolean): string {
    const lines: string[] = [];

    lines.push(`Statements: ${report.auditedFolder}`);
    lines.push(`Checks: ${report.checksFolder}`);
    lines.push(`Period: ${report.dateRange.from} to ${report.dateRange.to}`);
    lines.push('');

    if (report.clusters.length === 0) {
      lines.push('No clusters found.');
    } else {
      for (const cluster of report.clusters) {
        lines.push(`Cluster: ${cluster.name}`);
        lines.push(`Total: ฿${formatMoney(cluster.totalThb, 'THB')}`);

        if (verbose) {
          lines.push('');
          for (const transaction of cluster.transactions) {
            lines.push(
              `  ${transaction.date} ${transaction.remitterOrBeneficiary} ฿${formatMoney(transaction.debit ?? 0n, 'THB')} (${transaction.details}) [${transaction.sourceFile}]`,
            );
          }
        }

        lines.push('');
      }
    }

    if (report.unmatchedReceivers.length > 0) {
      lines.push('Unmatched receivers:');
      for (const receiver of report.unmatchedReceivers) {
        lines.push(`  ${receiver}`);
      }
      lines.push('');
    }

    if (report.warnings.length > 0) {
      lines.push('Warnings:');
      for (const warning of report.warnings) {
        lines.push(`  ${warning}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
