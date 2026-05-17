import type {
  MatchingMode,
  InternalMatch,
} from '../internal-movement/index.js';
import type { StatementFile } from '../statement/index.js';
import type { DateRange, Currency } from '../shared/index.js';

export interface AuditReport {
  auditedFolder: string;
  dateRange: DateRange;
  matchingMode: MatchingMode;
  accountCurrenciesFound: Currency[];
  totals: {
    incomeUsd: bigint;
    spendUsd: bigint;
  };
  processedFiles: StatementFile[];
  excludedInternalTransfers: InternalMatch[];
  excludedInternalConversions: InternalMatch[];
  warnings: string[];
}
