import type { DateRange } from '../shared/date-range.js';
import type { ClusterConfig } from './cluster-config.js';
import type { CheckParser } from '../checks/index.js';
import type { StatementSource } from '../statement/index.js';
import type { Transaction } from '../transaction/index.js';

export type ClusteredTransaction = Transaction;

export interface ClusterReport {
  auditedFolder: string;
  checksFolder: string;
  dateRange: DateRange;
  clusters: Array<{
    name: string;
    totalThb: bigint;
    transactions: ClusteredTransaction[];
  }>;
  unmatchedReceivers: string[];
  otherRecipients: Array<{
    recipient: string;
    recipientEnglish: string;
    transactions: ClusteredTransaction[];
  }>;
  warnings: string[];
}

export interface ClusterServiceOptions {
  statementsFolder: string;
  checksFolder: string;
  dateRange: DateRange;
  approach: 'deterministic' | 'hybrid';
  statementSource: StatementSource;
  checkParser: CheckParser;
  config: ClusterConfig;
}
