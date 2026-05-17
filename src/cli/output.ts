import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AuditReport } from '../audit/index.js';
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
