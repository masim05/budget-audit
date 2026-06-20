#!/usr/bin/env node
import { isAbsolute, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { runAudit } from '../audit/index.js';
import { runClusterCommand } from '../cluster/index.js';
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
  'statements-folder': { type: 'string' },
  'checks-folder': { type: 'string' },
  from: { type: 'string', short: 'f' },
  to: { type: 'string', short: 't' },
  'matching-mode': { type: 'string' },
  format: { type: 'string' },
  output: { type: 'string', short: 'o' },
  verbose: { type: 'boolean', short: 'v' },
  'cluster-other': { type: 'boolean' },
  approach: { type: 'string', short: 'a' },
  help: { type: 'boolean', short: 'h' },
} as const;

const auditHelpMessage = `Usage: budget-audit audit [options]

Options:
  --data-dir <path>        Statement folder path (default: ./data/statements)
  -f, --from <date>        Audit range start date (YYYY-MM-DD)
  -t, --to <date>          Audit range end date (YYYY-MM-DD)
  --matching-mode <mode>   Internal movement matching mode: strict or permissive
  --format <format>        Output format: text or json (default: text)
  -o, --output <path>      Write the report to a file
  -h, --help               Show this help message
`;

const clusterHelpMessage = `Usage: budget-audit cluster [options]

Options:
  -sf, --statements-folder <path>  Statement folder path (default: ./data/statements)
  -cf, --checks-folder <path>      Checks folder path (default: ./data/checks)
  -f, --from <date>                Cluster range start date (YYYY-MM-DD)
  -t, --to <date>                  Cluster range end date (YYYY-MM-DD)
  -v, --verbose                    Show payments listed under each cluster
  -co, --cluster-other             Interactively re-assign receivers currently in Other
  -a, --approach <1|2|d|h>         Clustering mode: deterministic(1/d) or hybrid(2/h)
  -h, --help                       Show this help message

Examples:
  budget-audit cluster -f 2026-05-01 -t 2026-05-31
  budget-audit cluster -a d --verbose
  budget-audit cluster --cluster-other
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
    const normalizedArgv = normalizeShortAliases(argv);
    const { positionals, values } = parseArgs({
      args: normalizedArgv,
      allowPositionals: true,
      options: cliOptions,
    });
    const command = positionals[0];
    if (values.help === true) {
      if (command === undefined || command === 'audit')
        io.stdout(auditHelpMessage);
      else if (command === 'cluster') io.stdout(clusterHelpMessage);
      else throw new Error('Expected command: audit or cluster');
      return 0;
    }
    if (command === 'audit') {
      validateNoClusterOptions(values);
      return await runAuditCommand(values, cwd, io);
    }
    if (command === 'cluster') {
      validateNoAuditOptions(values);
      return await runClusterCli(values, cwd, io);
    }
    throw new Error('Expected command: audit or cluster');
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

async function runAuditCommand(
  values: Record<string, string | boolean | undefined>,
  cwd: string,
  io: CliIo,
): Promise<number> {
  const defaultRange = previousFullCalendarMonth();
  const dateRange = validateDateRange(
    asString(values.from) ?? defaultRange.from,
    asString(values.to) ?? defaultRange.to,
  );
  const matchingMode = parseMatchingMode(asString(values['matching-mode']));
  const format = parseFormat(asString(values.format));
  const dataDir = asString(values['data-dir']) ?? './data/statements';
  const resolvedDataDir = resolveFromCwd(cwd, dataDir);
  const report = await runAudit({
    dataDir: resolvedDataDir,
    dateRange,
    matchingMode,
    statementSource: new CsvStatementSource(resolvedDataDir),
  });
  const output = renderReport(report, format);
  const outputPath = asString(values.output);
  await writeOptionalOutput(
    outputPath === undefined ? undefined : resolveFromCwd(cwd, outputPath),
    output,
  );
  io.stdout(output);
  return 0;
}

async function runClusterCli(
  values: Record<string, string | boolean | undefined>,
  cwd: string,
  io: CliIo,
): Promise<number> {
  const output = await runClusterCommand({
    statementsFolder: resolveFromCwd(
      cwd,
      asString(values['statements-folder']) ?? './data/statements',
    ),
    checksFolder: resolveFromCwd(
      cwd,
      asString(values['checks-folder']) ?? './data/checks',
    ),
    from: asString(values.from),
    to: asString(values.to),
    approach: asString(values.approach),
    verbose: values.verbose === true,
    clusterOther: values['cluster-other'] === true,
    configPath: resolveFromCwd(cwd, './config/clusters.yml'),
    cwd,
    stdout: io.stdout,
    stderr: io.stderr,
  });
  io.stdout(output);
  return 0;
}

function asString(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseFormat(value: string | undefined): OutputFormat {
  if (value === undefined || value === 'text' || value === 'json')
    return value ?? 'text';
  throw new Error(`Invalid output format: ${value}`);
}

function validateNoClusterOptions(
  values: Record<string, string | boolean | undefined>,
): void {
  if (
    values['statements-folder'] !== undefined ||
    values['checks-folder'] !== undefined ||
    values.approach !== undefined ||
    values['cluster-other'] !== undefined ||
    values.verbose !== undefined
  ) {
    throw new Error('Unexpected cluster-only options for audit command');
  }
}

function validateNoAuditOptions(
  values: Record<string, string | boolean | undefined>,
): void {
  if (
    values['data-dir'] !== undefined ||
    values['matching-mode'] !== undefined ||
    values.format !== undefined ||
    values.output !== undefined
  ) {
    throw new Error('Unexpected audit-only options for cluster command');
  }
}

function resolveFromCwd(cwd: string, path: string): string {
  return isAbsolute(path) ? path : resolve(cwd, path);
}

function normalizeShortAliases(argv: string[]): string[] {
  return argv.map((arg) => {
    if (arg === '-sf') return '--statements-folder';
    if (arg.startsWith('-sf=')) return `--statements-folder=${arg.slice(4)}`;
    if (arg === '-cf') return '--checks-folder';
    if (arg.startsWith('-cf=')) return `--checks-folder=${arg.slice(4)}`;
    if (arg === '-co') return '--cluster-other';
    return arg;
  });
}

/* v8 ignore next 8 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const code = await runCli(process.argv.slice(2), process.cwd(), {
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
  });
  process.exitCode = code;
}
