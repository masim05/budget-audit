export type StatementFileStatus = 'processed' | 'skipped' | 'failed';

export interface StatementFile {
  path: string;
  header: string[];
  accountNumbers: string[];
  processingStatus: StatementFileStatus;
  transactionsRead: number;
  warnings: string[];
}
