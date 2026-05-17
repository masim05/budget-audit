import type { AuditReport } from '../audit/index.js';

export interface ReportWriter {
  write(report: AuditReport): string;
}

export * from './json-report-writer.js';
export * from './text-report-writer.js';
