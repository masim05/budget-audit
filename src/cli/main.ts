#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { runAudit } from '../audit/index.js';
import { OpenAiCheckParser, resolveOpenAiApiKey } from '../checks/index.js';
import {
  loadClusterConfig,
  PdfStatementSource,
  promptClusterOtherAssignments,
  runCluster,
} from '../cluster/index.js';
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
  renderClusterReport,
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
  'statements-folder': { type: 'string' },
  'checks-folder': { type: 'string' },
  verbose: { type: 'boolean', short: 'v' },
  'cluster-other': { type: 'boolean' },
} as const;

const helpMessage = `Usage: budget-audit <command> [options]

Commands:
  audit                       Run budget audit report
  cluster                     Cluster spend by recipient

Audit options:
  --data-dir <path>           Statement folder path (default: ./data/statements)
  -f, --from <date>           Audit range start date (YYYY-MM-DD)
  -t, --to <date>             Audit range end date (YYYY-MM-DD)
  --matching-mode <mode>      Internal movement matching mode: strict or permissive
  --format <format>           Output format: text or json (default: text)
  -o, --output <path>         Write the report to a file
  -h, --help                  Show this help message

Cluster options:
  -sf, --statements-folder    Statements folder path (default: data/statements)
  -cf, --checks-folder        Checks folder path (default: data/checks)
  -f, --from <date>           Cluster range start date (YYYY-MM-DD)
  -t, --to <date>             Cluster range end date (YYYY-MM-DD)
  -v, --verbose               Show additional warnings and details
  -co, --cluster-other        Prompt to assign clusters for unmapped recipients
`;

export interface CliIo {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
  readLine?: () => Promise<string>;
}

function normalizeClusterShortFlags(argv: string[]): string[] {
  return argv.map((value) => {
    if (value === '-sf') return '--statements-folder';
    if (value === '-cf') return '--checks-folder';
    if (value === '-co') return '--cluster-other';
    return value;
  });
}

export async function runCli(
  argv: string[],
  cwd: string,
  io: CliIo,
): Promise<number> {
  try {
    const normalizedArgs = normalizeClusterShortFlags(argv);
    const { positionals, values } = parseArgs({
      args: normalizedArgs,
      allowPositionals: true,
      options: cliOptions,
    });
    const command = positionals[0];
    if (values.help === true || normalizedArgs.includes('--help')) {
      if (
        command !== undefined &&
        command !== 'audit' &&
        command !== 'cluster'
      ) {
        throw new Error('Expected command: audit | cluster');
      }
      io.stdout(helpMessage);
      return 0;
    }
    if (command === 'audit') {
      return await runAuditCommand(values, cwd, io);
    }
    if (command === 'cluster') {
      return await runClusterCommand(values, cwd, io);
    }
    throw new Error('Expected command: audit | cluster');
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
    (values.from as string | undefined) ?? defaultRange.from,
    (values.to as string | undefined) ?? defaultRange.to,
  );
  const matchingMode = parseMatchingMode(
    values['matching-mode'] as string | undefined,
  );
  const format = parseFormat(values.format as string | undefined);
  const dataDir =
    (values['data-dir'] as string | undefined) ?? './data/statements';
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
      : resolveFromCwd(cwd, values.output as string),
    output,
  );
  io.stdout(output);
  return 0;
}

async function runClusterCommand(
  values: Record<string, string | boolean | undefined>,
  cwd: string,
  io: CliIo,
): Promise<number> {
  const verbose = values.verbose === true;
  const startMs = Date.now();
  const logVerbose = (message: string): void => {
    if (!verbose) return;
    io.stderr(`[cluster] ${message}\n`);
  };

  const defaultRange = previousFullCalendarMonth();
  const dateRange = validateDateRange(
    (values.from as string | undefined) ?? defaultRange.from,
    (values.to as string | undefined) ?? defaultRange.to,
  );
  const statementsFolder = resolveFromCwd(
    cwd,
    (values['statements-folder'] as string | undefined) ?? 'data/statements',
  );
  const checksFolder = resolveFromCwd(
    cwd,
    (values['checks-folder'] as string | undefined) ?? 'data/checks',
  );
  const configPath = resolveFromCwd(cwd, 'data/clusters/mapping.yml');
  logVerbose(
    `Starting cluster run for ${dateRange.from}..${dateRange.to} (statements=${statementsFolder}, checks=${checksFolder})`,
  );
  logVerbose(`Loading cluster config from ${configPath}`);
  const config = await loadClusterConfig(configPath);
  logVerbose('Resolving OpenAI API key');
  const apiKey = await resolveOpenAiApiKey(
    process.env,
    resolveFromCwd(cwd, '.env'),
  );

  // Parse checks once; re-use the results on the second run to avoid
  // redundant OpenAI API calls when --cluster-other triggers a re-cluster.
  const checkParser = new OpenAiCheckParser(apiKey);
  const totalChecks = await countCheckImages(checksFolder);
  logVerbose(
    totalChecks === undefined
      ? 'Parsing checks'
      : `Parsing checks (${totalChecks})`,
  );
  const parsedChecks = await checkParser.parseChecks(checksFolder);
  const parsedCheckCount = Array.isArray(parsedChecks)
    ? parsedChecks.length
    : 0;
  logVerbose(`Parsed ${parsedCheckCount} checks`);

  logVerbose('Running cluster aggregation');
  let report = await runCluster({
    statementsFolder,
    checksFolder,
    dateRange,
    approach: 'deterministic',
    statementSource: new PdfStatementSource(statementsFolder),
    checkParser,
    parsedChecks,
    config,
  });

  if (values['cluster-other'] === true) {
    if (!io.readLine) {
      throw new Error('--cluster-other requires interactive input');
    }
    logVerbose('Starting --cluster-other interactive assignment flow');
    await promptClusterOtherAssignments(report, config, configPath, {
      stdout: io.stdout,
      readLine: io.readLine,
    });
    logVerbose('Reloading config and re-running cluster after assignments');
    const updated = await loadClusterConfig(configPath);
    report = await runCluster({
      statementsFolder,
      checksFolder,
      dateRange,
      approach: 'deterministic',
      statementSource: new PdfStatementSource(statementsFolder),
      checkParser,
      parsedChecks,
      config: updated,
    });
  }

  const clusterCount = report.clusters.length;
  const unmatchedCount = report.unmatchedReceivers.length;
  const warningCount = report.warnings.length;
  const elapsedMs = Date.now() - startMs;
  logVerbose(
    `Cluster run completed in ${elapsedMs}ms (clusters=${clusterCount}, unmatched=${unmatchedCount}, warnings=${warningCount})`,
  );

  const output = renderClusterReport(report, verbose);
  io.stdout(output);
  return 0;
}

function parseFormat(value: string | undefined): OutputFormat {
  if (value === undefined || value === 'text' || value === 'json')
    return value ?? 'text';
  throw new Error(`Invalid output format: ${value}`);
}

function resolveFromCwd(cwd: string, path: string): string {
  return isAbsolute(path) ? path : resolve(cwd, path);
}

async function countCheckImages(folderPath: string): Promise<number | undefined> {
  try {
    const entries = await readdir(folderPath);
    return entries.filter((value) => /\.(jpe?g|png)$/i.test(value)).length;
  } catch {
    return undefined;
  }
}

/* v8 ignore next 16 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const code = await runCli(process.argv.slice(2), process.cwd(), {
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
    readLine: async () => {
      const chunks: Buffer[] = [];
      return new Promise((resolveInput) => {
        process.stdin.once('data', (chunk) => {
          chunks.push(chunk);
          resolveInput(Buffer.concat(chunks).toString('utf8').trim());
        });
      });
    },
  });
  process.exitCode = code;
}
