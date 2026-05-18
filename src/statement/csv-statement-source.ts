import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  parseAmount,
  parseStatementDate,
  type Currency,
} from '../shared/index.js';
import type { Transaction } from '../transaction/index.js';
import type { StatementFile } from './statement-file.js';
import type { StatementLoadResult, StatementSource } from './index.js';

const REQUIRED_HEADER = [
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
];

export class InputFolderMissingError extends Error {}
export class NoStatementFilesError extends Error {}
export class UnsafeStatementError extends Error {}

export class CsvStatementSource implements StatementSource {
  constructor(private readonly folderPath: string) {}

  async load(): Promise<StatementLoadResult> {
    let entries: string[];
    try {
      entries = await readdir(this.folderPath);
    } catch (error) {
      const detail = error instanceof Error ? ` (${error.message})` : '';
      throw new InputFolderMissingError(
        `Input folder is unavailable: ${this.folderPath}${detail}`,
      );
    }

    const csvFiles = entries
      .filter((entry) => entry.toLowerCase().endsWith('.csv'))
      .sort();
    if (csvFiles.length === 0) {
      throw new NoStatementFilesError(
        `No CSV statement files found in ${this.folderPath}`,
      );
    }

    const statementFiles: StatementFile[] = [];
    const transactions: Transaction[] = [];
    const warnings: string[] = [];

    for (const fileName of csvFiles) {
      const filePath = join(this.folderPath, fileName);
      const file = await this.loadFile(filePath, fileName, transactions.length);
      statementFiles.push(file.statementFile);
      transactions.push(...file.transactions);
      warnings.push(...file.statementFile.warnings);
    }

    if (statementFiles.some((file) => file.processingStatus === 'failed')) {
      const failureDetails = statementFiles
        .flatMap((file) => file.warnings)
        .join('; ');
      throw new UnsafeStatementError(
        `One or more statement files could not be parsed safely: ${failureDetails}`,
      );
    }

    return {
      sourceName: 'csv-folder',
      sourceLocation: this.folderPath,
      statementFiles,
      transactions,
      warnings,
    };
  }

  private async loadFile(
    filePath: string,
    fileName: string,
    transactionOffset: number,
  ) {
    const warnings: string[] = [];
    let content: string;
    try {
      content = await readFile(filePath, 'utf8');
    } catch {
      return {
        statementFile: failedStatement(
          filePath,
          [],
          [`Unreadable file: ${filePath}`],
        ),
        transactions: [],
      };
    }

    const rows = parseCsv(content);
    const header = rows[0] ?? [];
    if (header.join(',') !== REQUIRED_HEADER.join(',')) {
      return {
        statementFile: failedStatement(filePath, header, [
          `Header mismatch in ${filePath}. Expected: ${REQUIRED_HEADER.join(',')}. Received: ${header.join(',')}`,
        ]),
        transactions: [],
      };
    }

    const accountNumbers = new Set<string>();
    const transactions: Transaction[] = [];
    const currency = inferCurrencyFromFileName(fileName);

    rows.slice(1).forEach((row, index) => {
      if (row.length === 1 && row[0].trim() === '') return;
      try {
        const transaction = normalizeRow(
          row,
          filePath,
          currency,
          transactionOffset + index + 1,
        );
        accountNumbers.add(transaction.accountNumber);
        transactions.push(transaction);
      } catch (error) {
        warnings.push(
          `${basename(filePath)} row ${index + 2}: ${(error as Error).message}`,
        );
      }
    });

    return {
      statementFile: {
        path: filePath,
        header,
        accountNumbers: [...accountNumbers].sort(),
        processingStatus: 'processed' as const,
        transactionsRead: transactions.length,
        warnings,
      },
      transactions,
    };
  }
}

function failedStatement(
  path: string,
  header: string[],
  warnings: string[],
): StatementFile {
  return {
    path,
    header,
    accountNumbers: [],
    processingStatus: 'failed',
    transactionsRead: 0,
    warnings,
  };
}

function normalizeRow(
  row: string[],
  sourceFile: string,
  currency: Currency,
  sequence: number,
): Transaction {
  if (row.length !== REQUIRED_HEADER.length) {
    throw new Error(
      `Expected ${REQUIRED_HEADER.length} columns but found ${row.length}`,
    );
  }
  const [
    rawDate,
    transactionType,
    transactionNumber,
    accountNumber,
    credit,
    debit,
    creditAmd,
    debitAmd,
    remitterOrBeneficiary,
    details,
    directionType,
  ] = row;
  if (!rawDate || !transactionNumber || !accountNumber) {
    throw new Error('Missing required identity fields');
  }
  return {
    id: `${sourceFile}:${sequence}`,
    date: parseStatementDate(rawDate),
    transactionType,
    transactionNumber,
    accountNumber,
    currency,
    credit: parseAmount(credit),
    debit: parseAmount(debit),
    creditAmd: parseAmount(creditAmd),
    debitAmd: parseAmount(debitAmd),
    remitterOrBeneficiary,
    details,
    directionType,
    sourceFile,
    classification: 'invalid',
  };
}

function inferCurrencyFromFileName(fileName: string): Currency {
  if (fileName.includes('_USD_')) return 'USD';
  if (fileName.includes('_AMD_')) return 'AMD';
  return 'UNKNOWN';
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}
