import type { Transaction } from '../transaction/index.js';
import type { StatementFile } from './statement-file.js';

export interface StatementLoadResult {
  sourceName: string;
  sourceLocation: string;
  statementFiles: StatementFile[];
  transactions: Transaction[];
  warnings: string[];
}

export interface StatementSource {
  load(): Promise<StatementLoadResult>;
}

export * from './csv-statement-source.js';
export * from './input-diagnostic.js';
export * from './statement-file.js';
export * from './supported-statement-format.js';
