import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, relative } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { promisify } from 'node:util';
import { findInternalMovements } from '../internal-movement/index.js';
import {
  convertAmdToUsdMinor,
  isWithinDateRange,
  preferredAmount,
  previousFullCalendarMonth,
  validateDateRange,
} from '../shared/index.js';
import { CsvStatementSource } from '../statement/index.js';
import {
  classifyExternalTransaction,
  type Transaction,
} from '../transaction/index.js';

const execFileAsync = promisify(execFile);

export type ClusterApproach = 'deterministic' | 'hybrid';

export interface ClusterCommandOptions {
  statementsFolder: string;
  checksFolder: string;
  from: string | undefined;
  to: string | undefined;
  approach: string | undefined;
  verbose: boolean;
  clusterOther: boolean;
  configPath: string;
  cwd: string;
  stdout: (value: string) => void;
  stderr: (value: string) => void;
}

interface ClusterPattern {
  pattern: string;
  cluster: string;
}

interface ClusterConfig {
  mappings: Record<string, string>;
  patterns: ClusterPattern[];
}

interface ClusterLookup {
  exact: Map<string, string>;
  patterns: Array<{ regex: RegExp; cluster: string }>;
}

interface ClusteredSpend {
  transaction: Transaction;
  receiver: string;
  normalizedReceiver: string;
  cluster: string;
  amountUsdMinor: bigint;
  statementFile: string;
  checkFile?: string;
}

export async function runClusterCommand(
  options: ClusterCommandOptions,
): Promise<string> {
  const dateRange = resolveDateRange(options.from, options.to);
  const approach = parseApproach(options.approach);
  const loaded = await new CsvStatementSource(options.statementsFolder).load();
  const movementResult = findInternalMovements(loaded.transactions, 'strict');
  const excludedIds = movementResult.excludedTransactionIds;
  const spendTransactions = loaded.transactions.filter((transaction) => {
    if (!isWithinDateRange(transaction.date, dateRange)) return false;
    if (excludedIds.has(transaction.id)) return false;
    return classifyExternalTransaction(transaction) === 'spend';
  });
  const checkFileByTransaction = await loadCheckFileIndex(options.checksFolder);
  const config = await loadClusterConfig(options.configPath);
  let lookup = buildClusterLookup(config);
  let clustered = clusterTransactions(
    spendTransactions,
    approach,
    lookup,
    checkFileByTransaction,
  );

  if (options.clusterOther) {
    const changed = await assignOtherClustersInteractively(
      clustered,
      config,
      options,
    );
    /* v8 ignore start */
    if (changed) {
      lookup = buildClusterLookup(config);
      clustered = clusterTransactions(
        spendTransactions,
        approach,
        lookup,
        checkFileByTransaction,
      );
    }
    /* v8 ignore end */
  }

  return renderClusterReport(clustered, options.verbose);
}

function resolveDateRange(from: string | undefined, to: string | undefined) {
  const defaultRange = previousFullCalendarMonth();
  return validateDateRange(from ?? defaultRange.from, to ?? defaultRange.to);
}

export function parseApproach(value: string | undefined): ClusterApproach {
  if (value === undefined || value === '2' || value === 'h') return 'hybrid';
  if (value === '1' || value === 'd') return 'deterministic';
  throw new Error(`Invalid clustering approach: ${value}`);
}

export function normalizeReceiver(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildClusterLookup(config: ClusterConfig): ClusterLookup {
  const exact = new Map<string, string>();
  for (const [rawReceiver, cluster] of Object.entries(config.mappings)) {
    exact.set(normalizeReceiver(rawReceiver), cluster);
  }
  const patterns = config.patterns
    .map((entry) => {
      const regex = parseRegexLiteral(entry.pattern);
      if (!regex) return undefined;
      return { cluster: entry.cluster, regex };
    })
    .filter(
      (entry): entry is { regex: RegExp; cluster: string } =>
        entry !== undefined,
    );
  return { exact, patterns };
}

function parseRegexLiteral(value: string): RegExp | undefined {
  const match = /^\/(.+)\/([dgimsuy]*)$/.exec(value.trim());
  if (!match) return undefined;
  try {
    const safeFlags = match[2].replace(/g/g, '');
    return new RegExp(match[1], safeFlags);
  } catch {
    return undefined;
  }
}

function clusterTransactions(
  transactions: Transaction[],
  approach: ClusterApproach,
  lookup: ClusterLookup,
  checkFileByTransaction: Map<string, string>,
): ClusteredSpend[] {
  return transactions.map((transaction) => {
    const receiver = transaction.remitterOrBeneficiary;
    const normalizedReceiver = normalizeReceiver(receiver);
    const cluster = resolveCluster(
      receiver,
      normalizedReceiver,
      approach,
      lookup,
    );
    return {
      transaction,
      receiver,
      normalizedReceiver,
      cluster,
      amountUsdMinor: transactionUsdAmount(transaction),
      statementFile: basename(transaction.sourceFile),
      checkFile: checkFileByTransaction.get(transaction.transactionNumber),
    };
  });
}

function transactionUsdAmount(transaction: Transaction): bigint {
  const original = transaction.debit ?? 0n;
  if (transaction.currency === 'USD') return original;
  const normalizedAmd = preferredAmount(
    transaction.debitAmd,
    transaction.debit,
  );
  const amd = normalizedAmd !== 0n ? normalizedAmd : original;
  return convertAmdToUsdMinor(amd);
}

function resolveCluster(
  receiver: string,
  normalizedReceiver: string,
  approach: ClusterApproach,
  lookup: ClusterLookup,
): string {
  const deterministic =
    lookup.exact.get(normalizedReceiver) ?? resolvePattern(receiver, lookup);
  if (deterministic) return deterministic;
  if (approach === 'deterministic') return 'Other';
  const fuzzy = resolveFuzzy(normalizedReceiver, lookup.exact);
  return fuzzy ?? 'Other';
}

function resolvePattern(
  receiver: string,
  lookup: ClusterLookup,
): string | undefined {
  for (const { regex, cluster } of lookup.patterns) {
    if (regex.test(receiver)) return cluster;
  }
  return undefined;
}

function resolveFuzzy(
  normalizedReceiver: string,
  exact: Map<string, string>,
): string | undefined {
  let bestCluster: string | undefined;
  let bestScore = 0;
  for (const [mappedReceiver, cluster] of exact.entries()) {
    const score = tokenSimilarity(normalizedReceiver, mappedReceiver);
    if (score > bestScore) {
      bestScore = score;
      bestCluster = cluster;
    }
  }
  return bestScore >= 0.5 ? bestCluster : undefined;
}

export function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }
  const denominator = leftTokens.size + rightTokens.size - overlap;
  return denominator === 0 ? 0 : overlap / denominator;
}

async function loadCheckFileIndex(
  checksFolder: string,
): Promise<Map<string, string>> {
  try {
    const entries = await readdir(checksFolder);
    const sorted = entries.sort();
    const index = new Map<string, string>();
    for (const fileName of sorted) {
      const match = /(\d{3,})/.exec(fileName);
      if (!match) continue;
      index.set(match[1], fileName);
    }
    return index;
  } catch {
    return new Map<string, string>();
  }
}

/* v8 ignore start */
async function assignOtherClustersInteractively(
  clustered: ClusteredSpend[],
  config: ClusterConfig,
  options: ClusterCommandOptions,
): Promise<boolean> {
  const receivers = [
    ...new Set(
      clustered
        .filter((item) => item.cluster === 'Other')
        .map((item) => item.normalizedReceiver),
    ),
  ];
  if (receivers.length === 0) {
    options.stdout('No "Other" receivers found.\n');
    return false;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    options.stderr(
      'Interactive clustering requires a TTY. Skipping --cluster-other.\n',
    );
    return false;
  }

  const existingClusters = new Set<string>(
    Object.values(config.mappings).filter((cluster) => cluster !== 'Other'),
  );
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let changed = false;
  try {
    for (const receiver of receivers) {
      const samples = clustered
        .filter((item) => item.normalizedReceiver === receiver)
        .slice(0, 3);
      if (samples.length === 0) continue;
      options.stdout(`\nReceiver: ${samples[0].receiver}\n`);
      options.stdout('Sample transactions:\n');
      for (const sample of samples) {
        options.stdout(`${formatVerboseTransactionLine(sample)}\n`);
      }
      const choices = [...existingClusters].sort().join(', ') || 'none';
      const answer = (
        await rl.question(
          `Assign cluster (existing: ${choices}, Enter to skip): `,
        )
      ).trim();
      if (answer === '') continue;
      config.mappings[receiver] = answer;
      existingClusters.add(answer);
      changed = true;
    }
  } finally {
    rl.close();
  }
  if (!changed) return false;

  await saveClusterConfig(options.configPath, config);
  await commitClusterMapping(options.cwd, options.configPath, options.stderr);
  return true;
}
/* v8 ignore end */

export function renderClusterReport(
  clustered: ClusteredSpend[],
  verbose: boolean,
): string {
  if (clustered.length === 0) {
    return 'No spend transactions found for selected range.\n';
  }
  const grouped = new Map<string, ClusteredSpend[]>();
  for (const item of clustered) {
    const existing = grouped.get(item.cluster) ?? [];
    existing.push(item);
    grouped.set(item.cluster, existing);
  }
  const summaries = [...grouped.entries()].map(([cluster, entries]) => ({
    cluster,
    entries: entries.sort((left, right) =>
      left.transaction.date.localeCompare(right.transaction.date),
    ),
    total: entries.reduce((sum, entry) => sum + entry.amountUsdMinor, 0n),
  }));
  summaries.sort((left, right) => {
    if (left.total === right.total)
      return left.cluster.localeCompare(right.cluster);
    return left.total > right.total ? -1 : 1;
  });

  const lines = ['Cluster summary (USD):'];
  let total = 0n;
  for (const summary of summaries) {
    total += summary.total;
    lines.push(`- ${summary.cluster}: ${formatMinorAmount(summary.total)}`);
    if (!verbose) continue;
    for (const entry of summary.entries) {
      lines.push(`  ${formatVerboseTransactionLine(entry)}`);
    }
  }
  lines.push(`Total spend (USD): ${formatMinorAmount(total)}`);
  lines.push('');
  return lines.join('\n');
}

function formatMinorAmount(minorUnits: bigint): string {
  const sign = minorUnits < 0n ? '-' : '';
  const absolute = minorUnits < 0n ? -minorUnits : minorUnits;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

function formatVerboseTransactionLine(entry: ClusteredSpend): string {
  return `${entry.transaction.date} 00:00 — ${formatMinorAmount(entry.amountUsdMinor)} — ${entry.receiver} — ${entry.statementFile}${entry.checkFile ? ` — ${entry.checkFile}` : ''}`;
}

async function loadClusterConfig(path: string): Promise<ClusterConfig> {
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { mappings: {}, patterns: [] };
    }
    /* v8 ignore next 2 */
    throw error;
  }

  const mappings: Record<string, string> = {};
  const patterns: ClusterPattern[] = [];
  let section: 'none' | 'mappings' | 'patterns' = 'none';
  let pendingPattern: string | undefined;

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    if (trimmed === 'mappings:') {
      section = 'mappings';
      continue;
    }
    if (trimmed === 'patterns:') {
      section = 'patterns';
      continue;
    }
    if (trimmed === '{}' || trimmed === '[]') continue;

    if (section === 'mappings' && line.startsWith('  ')) {
      const parsed = parseKeyValue(line.slice(2));
      if (parsed)
        mappings[parseYamlValue(parsed.key)] = parseYamlValue(parsed.value);
      continue;
    }
    if (section === 'patterns' && line.startsWith('  - pattern:')) {
      pendingPattern = parseYamlValue(line.replace('  - pattern:', '').trim());
      continue;
    }
    if (section === 'patterns' && line.startsWith('    cluster:')) {
      const cluster = parseYamlValue(line.replace('    cluster:', '').trim());
      if (pendingPattern) {
        patterns.push({ pattern: pendingPattern, cluster });
        pendingPattern = undefined;
      }
    }
  }

  return { mappings, patterns };
}

function parseKeyValue(
  value: string,
): { key: string; value: string } | undefined {
  let separator = -1;
  let inSingle = false;
  let inDouble = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "'" && !inDouble) inSingle = !inSingle;
    if (char === '"' && !inSingle) inDouble = !inDouble;
    if (char === ':' && !inSingle && !inDouble) {
      separator = index;
      break;
    }
  }
  if (separator === -1) return undefined;
  return {
    key: value.slice(0, separator).trim(),
    value: value.slice(separator + 1).trim(),
  };
}

function parseYamlValue(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return JSON.parse(value) as string;
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
}

/* v8 ignore start */
async function saveClusterConfig(
  path: string,
  config: ClusterConfig,
): Promise<void> {
  const mappingKeys = Object.keys(config.mappings).sort();
  const lines = [
    '# receiver normalization rules and direct mappings',
    'mappings:',
  ];
  if (mappingKeys.length === 0) {
    lines.push('  {}');
  } else {
    for (const key of mappingKeys) {
      lines.push(
        `  ${JSON.stringify(key)}: ${JSON.stringify(config.mappings[key])}`,
      );
    }
  }
  lines.push('patterns:');
  if (config.patterns.length === 0) {
    lines.push('  []');
  } else {
    for (const entry of config.patterns) {
      lines.push(`  - pattern: ${JSON.stringify(entry.pattern)}`);
      lines.push(`    cluster: ${JSON.stringify(entry.cluster)}`);
    }
  }
  lines.push('');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, lines.join('\n'), 'utf8');
}

async function commitClusterMapping(
  cwd: string,
  configPath: string,
  stderr: (value: string) => void,
): Promise<void> {
  const configPathForGit = relative(cwd, configPath);
  try {
    await execFileAsync('git', ['-C', cwd, 'add', configPathForGit]);
    await execFileAsync('git', [
      '-C',
      cwd,
      'commit',
      '-m',
      'Update receiver clusters mapping',
      '--',
      configPathForGit,
    ]);
  } catch (error) {
    const message =
      error instanceof Error && error.message.length > 0
        ? error.message
        : 'Unable to auto-commit cluster mapping changes';
    stderr(`${message}\n`);
  }
}
/* v8 ignore end */
