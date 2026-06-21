import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AuditReport } from '../audit/index.js';
import type { ClusterReport } from '../cluster/index.js';
import { JsonReportWriter, TextReportWriter } from '../report/index.js';

export type OutputFormat = 'text' | 'json';

export function renderReport(
  report: AuditReport,
  format: OutputFormat,
): string {
  return format === 'json'
    ? new JsonReportWriter().write(report)
    : new TextReportWriter().write(report);
}

export async function writeOptionalOutput(
  path: string | undefined,
  content: string,
): Promise<void> {
  if (!path) return;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

function formatThb(minor: bigint): string {
  const whole = minor / 100n;
  const fraction = (minor % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

export function renderClusterReport(
  report: ClusterReport,
  verbose = false,
): string {
  const lines: string[] = [];
  lines.push(`Cluster report ${report.dateRange.from}..${report.dateRange.to}`);
  lines.push(`Statements: ${report.auditedFolder}`);
  lines.push(`Checks: ${report.checksFolder}`);
  lines.push('');
  for (const cluster of report.clusters.sort((a, b) =>
    b.total > a.total ? 1 : b.total < a.total ? -1 : 0,
  )) {
    lines.push(`${cluster.name}: ${formatThb(cluster.total)} THB`);
    if (verbose) {
      const totalsByRecipient = new Map<string, bigint>();
      for (const tx of cluster.transactions) {
        const previous = totalsByRecipient.get(tx.remitterOrBeneficiary) ?? 0n;
        totalsByRecipient.set(
          tx.remitterOrBeneficiary,
          previous + (tx.debit ?? 0n),
        );
      }
      const recipients = [...totalsByRecipient.entries()].sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      for (const [recipient, total] of recipients) {
        lines.push(` - ${recipient} (${formatThb(total)} THB)`);
      }
    }
  }
  if (report.otherRecipients.length > 0) {
    const recipientTotals = report.otherRecipients
      .map((recipient) => ({
        name: recipient.recipient,
        total: recipient.transactions.reduce(
          (sum, tx) => sum + (tx.debit ?? 0n),
          0n,
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const otherTotal = recipientTotals.reduce(
      (sum, recipient) => sum + recipient.total,
      0n,
    );
    lines.push('');
    lines.push(
      `other recipients (${recipientTotals.length}, ${formatThb(otherTotal)} THB):`,
    );
    for (const recipient of recipientTotals) {
      lines.push(` - ${recipient.name} (${formatThb(recipient.total)} THB)`);
    }
  }
  if (verbose && report.warnings.length > 0) {
    lines.push('');
    lines.push('warnings:');
    for (const warning of report.warnings) {
      lines.push(` - ${warning}`);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}
