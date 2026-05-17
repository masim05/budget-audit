export type InternalMatchType = 'transfer' | 'conversion';
export type MatchConfidence = 'high' | 'probable';

export interface InternalMatch {
  matchId: string;
  type: InternalMatchType;
  confidence: MatchConfidence;
  transactionIds: string[];
  transactionNumbers: string[];
  usdAmount: bigint;
  evidence: string[];
}
