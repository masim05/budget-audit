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
  }
  if (report.unmatchedReceivers.length > 0) {
    lines.push('');
    lines.push(`other recipients (${report.unmatchedReceivers.length}):`);
    for (const receiver of report.unmatchedReceivers.sort()) {
      lines.push(` - ${receiver}`);
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
