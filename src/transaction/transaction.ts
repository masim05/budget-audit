import type { Currency } from '../shared/index.js';

export type TransactionClassification =
  | 'income'
  | 'spend'
  | 'internal_transfer'
  | 'internal_conversion'
  | 'ambiguous_internal_candidate'
  | 'invalid';

export interface Transaction {
  id: string;
  date: string;
  transactionType: string;
  transactionNumber: string;
  accountNumber: string;
  currency: Currency;
  credit?: bigint;
  debit?: bigint;
  creditAmd?: bigint;
  debitAmd?: bigint;
  remitterOrBeneficiary: string;
  details: string;
  directionType: string;
  sourceFile: string;
  classification: TransactionClassification;
}
