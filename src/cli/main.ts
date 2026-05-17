#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { runAudit } from '../audit/index.js';
import { parseMatchingMode } from '../internal-movement/index.js';
import {
  CsvStatementSource,
  InputFolderMissingError,
  NoStatementFilesError,
  UnsafeStatementError,
} from '../statement/index.js';
import {
  previousFullCalendarMonth,
  validateDateRange,
} from '../shared/index.js';
import {
  renderReport,
  writeOptionalOutput,
  type OutputFormat,
} from './output.js';

export interface CliIo {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
}

export async function runCli(
  argv: string[],
  cwd: string,
  io: CliIo,
): Promise<number> {
  try {
    const { positionals, values } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        'data-dir': { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
        'matching-mode': { type: 'string' },
        format: { type: 'string' },
        output: { type: 'string' },
      },
    });
    if (positionals[0] !== 'audit') throw new Error('Expected command: audit');
    const defaultRange = previousFullCalendarMonth();
    const dateRange = validateDateRange(
      values.from ?? defaultRange.from,
      values.to ?? defaultRange.to,
    );
    const matchingMode = parseMatchingMode(values['matching-mode']);
    const format = parseFormat(values.format);
    const dataDir = values['data-dir'] ?? './data';
    const report = await runAudit({
      dataDir,
      dateRange,
      matchingMode,
      statementSource: new CsvStatementSource(resolveFromCwd(cwd, dataDir)),
    });
    const output = renderReport(report, format);
    await writeOptionalOutput(values.output, output);
    io.stdout(output);
    return 0;
  } catch (error) {
    io.stderr(`${(error as Error).message}\n`);
    if (
      error instanceof InputFolderMissingError ||
      error instanceof NoStatementFilesError
    )
      return 2;
    if (error instanceof UnsafeStatementError) return 3;
    return error instanceof Error ? 1 : 4;
  }
}

function parseFormat(value: string | undefined): OutputFormat {
  if (value === undefined || value === 'text' || value === 'json')
    return value ?? 'text';
  throw new Error(`Invalid output format: ${value}`);
}

function resolveFromCwd(cwd: string, path: string): string {
  return path.startsWith('/') ? path : `${cwd}/${path.replace(/^\.\//, '')}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const code = await runCli(process.argv.slice(2), process.cwd(), {
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
  });
  process.exitCode = code;
}
