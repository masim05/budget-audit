#!/usr/bin/env node
import { isAbsolute, resolve } from 'node:path';
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

const cliOptions = {
  'data-dir': { type: 'string' },
  from: { type: 'string', short: 'f' },
  to: { type: 'string', short: 't' },
  'matching-mode': { type: 'string' },
  format: { type: 'string' },
  output: { type: 'string', short: 'o' },
  help: { type: 'boolean', short: 'h' },
} as const;

const helpMessage = `Usage: budget-audit audit [options]

Options:
  --data-dir <path>        Statement folder path (default: ./data/statements)
  -f, --from <date>        Audit range start date (YYYY-MM-DD)
  -t, --to <date>          Audit range end date (YYYY-MM-DD)
  --matching-mode <mode>   Internal movement matching mode: strict or permissive
  --format <format>        Output format: text or json (default: text)
  -o, --output <path>      Write the report to a file
  -h, --help               Show this help message
`;

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
      options: cliOptions,
    });
    const command = positionals[0];
    if (values.help === true) {
      if (command !== undefined && command !== 'audit')
        throw new Error('Expected command: audit');
      io.stdout(helpMessage);
      return 0;
    }
    if (command !== 'audit') throw new Error('Expected command: audit');
    const defaultRange = previousFullCalendarMonth();
    const dateRange = validateDateRange(
      values.from ?? defaultRange.from,
      values.to ?? defaultRange.to,
    );
    const matchingMode = parseMatchingMode(values['matching-mode']);
    const format = parseFormat(values.format);
    const dataDir = values['data-dir'] ?? './data/statements';
    const resolvedDataDir = resolveFromCwd(cwd, dataDir);
    const report = await runAudit({
      dataDir: resolvedDataDir,
      dateRange,
      matchingMode,
      statementSource: new CsvStatementSource(resolvedDataDir),
    });
    const output = renderReport(report, format);
    await writeOptionalOutput(
      values.output === undefined
        ? undefined
        : resolveFromCwd(cwd, values.output),
      output,
    );
    io.stdout(output);
    return 0;
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
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
  return isAbsolute(path) ? path : resolve(cwd, path);
}

/* v8 ignore next 8 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const code = await runCli(process.argv.slice(2), process.cwd(), {
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
  });
  process.exitCode = code;
}
