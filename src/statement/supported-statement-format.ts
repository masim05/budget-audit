import type { Currency } from '../shared/index.js';

export const REQUIRED_STATEMENT_HEADER = [
  'Date',
  'Transaction Type',
  'Transaction Number',
  'Account Number',
  'Credit',
  'Debit',
  'Credit(AMD)',
  'Debit(AMD)',
  'Remitter/Beneficiary',
  'Details',
  'Type',
] as const;

export function normalizeStatementHeader(header: string[]): string[] {
  if (header.length === 0) return header;
  return [header[0]?.replace(/^\uFEFF+/, '') ?? '', ...header.slice(1)];
}

export function isSupportedStatementHeader(header: string[]): boolean {
  const normalizedHeader = normalizeStatementHeader(header);
  return normalizedHeader.join(',') === REQUIRED_STATEMENT_HEADER.join(',');
}

export function detectStatementCurrency(fileName: string): Currency | null {
  if (fileName.includes('_USD_')) return 'USD';
  if (fileName.includes('_AMD_')) return 'AMD';
  return null;
}

export function expectedStatementHeader(): string {
  return REQUIRED_STATEMENT_HEADER.join(',');
}
