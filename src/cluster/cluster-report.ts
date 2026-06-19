import type { DateRange } from '../shared/date-range.js';
import type { ClusterConfig } from './cluster-config.js';
import type { Transaction } from '../transaction/index.js';

export interface ClusteredTransaction extends Transaction {}

export interface ClusterReport {
  auditedFolder: string;
  checksFolder: string;
  dateRange: DateRange;
  clusters: Array<{ name: string; totalThb: bigint; transactions: ClusteredTransaction[] }>;
  unmatchedReceivers: string[];
  warnings: string[];
}

export interface ClusterServiceOptions {
  statementsFolder: string;
  checksFolder: string;
  dateRange: DateRange;
  approach: 'deterministic' | 'hybrid';
  statementSource: { load: () => Promise<{ sourceName: string; sourceLocation: string; statementFiles: string[]; transactions: Transaction[]; warnings: string[] }> };
  config: ClusterConfig;
}
