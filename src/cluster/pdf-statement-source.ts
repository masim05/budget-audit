import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import pdfParse from 'pdf-parse';
import type {
  StatementLoadResult,
  StatementSource,
} from '../statement/index.js';
import type { Transaction } from '../transaction/index.js';

function parseThbMinor(value: string): bigint {
  const normalized = value.replaceAll(',', '');
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function parseDate(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value);
  if (!match) throw new Error(`Unsupported statement date: ${value}`);
  return `20${match[3]}-${match[2]}-${match[1]}`;
}

export function parseStatementTextToTransactions(
  text: string,
  sourceFile: string,
): Transaction[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const transactions: Transaction[] = [];
  let previousBalance: bigint | undefined;
  let sequence = 1;

  for (const line of lines) {
    const match =
      /^(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+(\d[\d,]*\.\d{2})\s+(\d[\d,]*\.\d{2})\s+([A-Za-z][A-Za-z0-9 -]+)$/.exec(
        line,
      ) ??
      /^(\d{2}\/\d{2}\/\d{2})(.+?)(\d[\d,]*\.\d{2})(\d[\d,]*\.\d{2})([A-Za-z][A-Za-z0-9 -]+)$/.exec(
        line,
      );
    if (!match) continue;

    const [, rawDate, particularsRaw, amountRaw, balanceRaw, viaRaw] = match;
    const particulars = particularsRaw.trim();
    const via = viaRaw.trim();
    const amount = parseThbMinor(amountRaw);
    const balance = parseThbMinor(balanceRaw);

    let debit = 0n;
    let credit = 0n;
    if (previousBalance !== undefined) {
      if (balance < previousBalance) debit = previousBalance - balance;
      if (balance > previousBalance) credit = balance - previousBalance;
    } else if (/CASH CDM|DEP/i.test(particulars)) {
      credit = amount;
    } else {
      debit = amount;
    }
    previousBalance = balance;

    transactions.push({
      id: `${sourceFile}:${sequence}`,
      date: parseDate(rawDate),
      transactionType: particulars,
      transactionNumber: `${sequence}`,
      accountNumber: 'THB-ACCOUNT',
      currency: 'THB',
      credit,
      debit,
      creditAmd: 0n,
      debitAmd: 0n,
      remitterOrBeneficiary: particulars,
      details: via,
      directionType: debit > 0n ? 'Outgoing' : 'Incoming',
      sourceFile,
      classification: 'invalid',
    });
    sequence += 1;
  }

  return transactions;
}

export class PdfStatementSource implements StatementSource {
  constructor(private readonly folderPath: string) {}

  async load(): Promise<StatementLoadResult> {
    const files = (await readdir(this.folderPath))
      .filter((name) => name.toLowerCase().endsWith('.pdf'))
      .sort();
    if (files.length === 0) {
      throw new Error(`No PDF statement files found in ${this.folderPath}`);
    }

    const transactions: Transaction[] = [];
    const warnings: string[] = [];
    const statementFiles: Array<{
      path: string;
      processingStatus: 'processed';
    }> = [];

    for (const file of files) {
      const path = join(this.folderPath, file);
      try {
        const buffer = await readFile(path);
        const parsed = await pdfParse(buffer);
        transactions.push(
          ...parseStatementTextToTransactions(parsed.text, path),
        );
        statementFiles.push({ path, processingStatus: 'processed' });
      } catch (error) {
        warnings.push(`${basename(path)}: ${(error as Error).message}`);
      }
    }

    return {
      sourceName: 'pdf-folder',
      sourceLocation: this.folderPath,
      statementFiles:
        statementFiles as unknown as StatementLoadResult['statementFiles'],
      transactions,
      warnings,
    };
  }
}
