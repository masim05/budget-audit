import type { DateRange } from '../shared/index.js';
import type { Transaction } from '../transaction/index.js';

export interface ClusteredTransaction extends Transaction {
  cluster: string;
  matchedBy: 'mapping' | 'pattern' | 'fuzzy' | 'other';
  normalizedReceiver: string;
}

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
  warnings: string[];
}
