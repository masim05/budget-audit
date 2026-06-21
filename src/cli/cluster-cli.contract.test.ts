import { describe, expect, it, vi, beforeEach } from 'vitest';

const runClusterMock = vi.fn();
const loadClusterConfigMock = vi.fn();
const promptClusterOtherAssignmentsMock = vi.fn();
const resolveOpenAiApiKeyMock = vi.fn();
const parseChecksMock = vi.fn();

vi.mock('../cluster/index.js', () => ({
  PdfStatementSource: class {
    constructor(public readonly folder: string) {}
  },
  loadClusterConfig: (...args: unknown[]) => loadClusterConfigMock(...args),
  promptClusterOtherAssignments: (...args: unknown[]) =>
    promptClusterOtherAssignmentsMock(...args),
  runCluster: (...args: unknown[]) => runClusterMock(...args),
}));

vi.mock('../checks/index.js', () => ({
  OpenAiCheckParser: class {
    async parseChecks(folderPath: string) {
      return parseChecksMock(folderPath);
    }
  },
  resolveOpenAiApiKey: (...args: unknown[]) => resolveOpenAiApiKeyMock(...args),
}));

describe('cluster CLI contract', () => {
  beforeEach(() => {
    runClusterMock.mockReset();
    loadClusterConfigMock.mockReset();
    promptClusterOtherAssignmentsMock.mockReset();
    resolveOpenAiApiKeyMock.mockReset();
    parseChecksMock.mockReset();
    loadClusterConfigMock.mockResolvedValue({
      mappings: {},
      patterns: [],
      clusters: ['кафе', 'other'],
    });
    resolveOpenAiApiKeyMock.mockResolvedValue('k');
    runClusterMock.mockResolvedValue({
      auditedFolder: '/tmp/statements',
      checksFolder: '/tmp/checks',
      dateRange: { from: '2026-06-01', to: '2026-06-15' },
      clusters: [{ name: 'кафе', total: 8500n, transactions: [] }],
      unmatchedReceivers: [],
      otherRecipients: [],
      warnings: [],
    });
  });

  it('uses default date range when -f/-t are omitted', async () => {
    const { runCli } = await import('./main.js');
    let stdout = '';
    const code = await runCli(
      ['cluster', '-sf', '/s', '-cf', '/c'],
      process.cwd(),
      {
        stdout: (value) => (stdout += value),
        stderr: () => undefined,
      },
    );
    expect(code).toBe(0);
    expect(stdout).toContain('Cluster report');
  });

  it('supports cluster command aliases and renders report', async () => {
    const { runCli } = await import('./main.js');
    let stdout = '';
    const code = await runCli(
      [
        'cluster',
        '-sf',
        '/s',
        '-cf',
        '/c',
        '-f',
        '2026-06-01',
        '-t',
        '2026-06-15',
      ],
      process.cwd(),
      {
        stdout: (value) => (stdout += value),
        stderr: () => undefined,
      },
    );
    expect(code).toBe(0);
    expect(runClusterMock).toHaveBeenCalledTimes(1);
    expect(stdout).toContain('Cluster report');
  });

  it('prints cluster options in help output', async () => {
    const { runCli } = await import('./main.js');
    let stdout = '';
    const code = await runCli(['cluster', '--help'], process.cwd(), {
      stdout: (value) => (stdout += value),
      stderr: () => undefined,
    });
    expect(code).toBe(0);
    expect(stdout).toContain('-sf, --statements-folder');
    expect(stdout).toContain('-cf, --checks-folder');
    expect(stdout).toContain('-co, --cluster-other');
  });

  it('requires interactive input for -co mode', async () => {
    const { runCli } = await import('./main.js');
    let stderr = '';
    const code = await runCli(
      ['cluster', '-co', '-f', '2026-06-01', '-t', '2026-06-15'],
      process.cwd(),
      {
        stdout: () => undefined,
        stderr: (value) => (stderr += value),
      },
    );
    expect(code).toBe(1);
    expect(stderr).toContain('requires interactive input');
  });

  it('runs -co interactive flow and re-runs cluster', async () => {
    const { runCli } = await import('./main.js');
    promptClusterOtherAssignmentsMock.mockResolvedValue(undefined);
    let stdout = '';
    const code = await runCli(
      ['cluster', '-co', '-f', '2026-06-01', '-t', '2026-06-15'],
      process.cwd(),
      {
        stdout: (v) => (stdout += v),
        stderr: () => undefined,
        readLine: async () => '1',
      },
    );
    expect(code).toBe(0);
    expect(promptClusterOtherAssignmentsMock).toHaveBeenCalledTimes(1);
    expect(runClusterMock).toHaveBeenCalledTimes(2);
    expect(stdout).toContain('Cluster report');
  });
});
