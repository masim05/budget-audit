import type { MatchingMode } from '../internal-movement/index.js';
import type { DateRange } from '../shared/index.js';

export interface AuditRunOptions {
  dataDir: string;
  dateRange: DateRange;
  matchingMode: MatchingMode;
}
