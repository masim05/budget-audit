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
import {
  formatInputDiagnostics,
  type InputDiagnosticIssue,
} from './input-diagnostic.js';
import {
  detectStatementCurrency,
  expectedStatementHeader,
  isSupportedStatementHeader,
  normalizeStatementHeader,
  REQUIRED_STATEMENT_HEADER,
} from './supported-statement-format.js';

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

    const folderEntries = entries.sort();
    if (folderEntries.length === 0) {
      throw new NoStatementFilesError(
        `No statement files found in ${this.folderPath}`,
      );
    }

    const statementFiles: StatementFile[] = [];
    const transactions: Transaction[] = [];
    const warnings: string[] = [];
    const unsupportedIssues: InputDiagnosticIssue[] = [];

    for (const fileName of folderEntries) {
      const filePath = join(this.folderPath, fileName);
      if (!fileName.toLowerCase().endsWith('.csv')) {
        unsupportedIssues.push({
          filePath,
          reason:
            'unsupported file type. Statement folders may contain only supported CSV statement files.',
        });
        statementFiles.push(
          failedStatement(
            filePath,
            [],
            [
              'Unsupported file type. Statement folders may contain only supported CSV statement files.',
            ],
          ),
        );
        continue;
      }
      const file = await this.loadFile(filePath, fileName, transactions.length);
      statementFiles.push(file.statementFile);
      transactions.push(...file.transactions);
      warnings.push(...file.statementFile.warnings);
      unsupportedIssues.push(...file.unsupportedIssues);
    }

    if (unsupportedIssues.length > 0) {
      throw new UnsafeStatementError(formatInputDiagnostics(unsupportedIssues));
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
        unsupportedIssues: [
          {
            filePath,
            reason: 'unreadable file',
          },
        ],
      };
    }

    const rows = parseCsv(content);
    const header = normalizeStatementHeader(rows[0] ?? []);
    if (!isSupportedStatementHeader(header)) {
      const received = header.join(',') || '(empty file)';
      return {
        statementFile: failedStatement(filePath, header, [
          `Unsupported CSV header. Expected: ${expectedStatementHeader()}. Received: ${received}`,
        ]),
        transactions: [],
        unsupportedIssues: [
          {
            filePath,
            reason: 'unsupported CSV header',
            expected: expectedStatementHeader(),
            received,
          },
        ],
      };
    }

    const currency = detectStatementCurrency(fileName);
    if (currency === null) {
      return {
        statementFile: failedStatement(filePath, header, [
          'Unsupported filename. Expected `_AMD_` or `_USD_` in the file name.',
        ]),
        transactions: [],
        unsupportedIssues: [
          {
            filePath,
            reason: 'unsupported filename',
            expected: 'Filename containing `_AMD_` or `_USD_`',
            received: fileName,
          },
        ],
      };
    }

    const accountNumbers = new Set<string>();
    const transactions: Transaction[] = [];

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
      unsupportedIssues: [],
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
  if (row.length !== REQUIRED_STATEMENT_HEADER.length) {
    throw new Error(
      `Expected ${REQUIRED_STATEMENT_HEADER.length} columns but found ${row.length}`,
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
