import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

const header =
  'Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type';

describe('cluster CLI contract', () => {
  it('runs the cluster command with statement and checks folder aliases', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'budget-audit-test-'));
    const statements = join(testDir, 'statements');
    const checks = join(testDir, 'checks');
    const config = join(testDir, 'config');
    await mkdir(statements);
    await mkdir(checks);
    await mkdir(config);

    await writeFile(
      join(statements, 'TH_THB_1001.csv'),
      `${header}\n2026-05-15,Card,1001,ACC,0.00,123.45,0.00,0.00,Cafe Market,Lunch,Outgoing\n`,
      'utf8',
    );

    await writeFile(
      join(config, 'clusters.yml'),
      `mappings: {}
patterns: []
clusters:
  - "Other"
  - "food"
`,
      'utf8',
    );

    let stdout = '';
    const code = await runCli(
      [
        'cluster',
        '-sf',
        statements,
        '-cf',
        checks,
        '-f',
        '2026-05-01',
        '-t',
        '2026-05-31',
      ],
      testDir,
      {
        stdout: (value) => (stdout += value),
        stderr: () => undefined,
        prompt: async () => 'skip',
      },
    );

    expect(code).toBe(0);
    expect(stdout).toContain('Cluster:');
  });

  it('supports -co alias for --cluster-other', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'budget-audit-test-'));
    const statements = join(testDir, 'statements');
    const checks = join(testDir, 'checks');
    const config = join(testDir, 'config');
    await mkdir(statements);
    await mkdir(checks);
    await mkdir(config);

    await writeFile(
      join(statements, 'TH_THB_1001.csv'),
      `${header}\n2026-05-15,Card,1001,ACC,0.00,123.45,0.00,0.00,Cafe Market,Lunch,Outgoing\n`,
      'utf8',
    );

    await writeFile(
      join(config, 'clusters.yml'),
      `mappings: {}
patterns: []
clusters:
  - "Other"
  - "food"
`,
      'utf8',
    );

    let stdout = '';
    const code = await runCli(
      [
        'cluster',
        '-sf',
        statements,
        '-cf',
        checks,
        '-co',
        '-f',
        '2026-05-01',
        '-t',
        '2026-05-31',
      ],
      testDir,
      {
        stdout: (value) => (stdout += value),
        stderr: () => undefined,
        prompt: async () => 'skip',
      },
    );

    expect(code).toBe(0);
    expect(stdout).toContain('Cluster:');
  });

  it('runs the cluster command with long folder options', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'budget-audit-test-'));
    const statements = join(testDir, 'statements');
    const checks = join(testDir, 'checks');
    const config = join(testDir, 'config');
    await mkdir(statements);
    await mkdir(checks);
    await mkdir(config);

    await writeFile(
      join(statements, 'TH_THB_1001.csv'),
      `${header}\n2026-05-15,Card,1001,ACC,0.00,123.45,0.00,0.00,Cafe Market,Lunch,Outgoing\n`,
      'utf8',
    );

    await writeFile(
      join(config, 'clusters.yml'),
      `mappings: {}
patterns: []
clusters:
  - "Other"
  - "food"
`,
      'utf8',
    );

    let stdout = '';
    const code = await runCli(
      [
        'cluster',
        '--statements-folder',
        statements,
        '--checks-folder',
        checks,
        '-f',
        '2026-05-01',
        '-t',
        '2026-05-31',
      ],
      testDir,
      {
        stdout: (value) => (stdout += value),
        stderr: () => undefined,
        prompt: async () => 'skip',
      },
    );

    expect(code).toBe(0);
    expect(stdout).toContain('Cluster:');
  });

  it('supports --cluster-other with no unmatched receivers', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'budget-audit-test-'));
    const statements = join(testDir, 'statements');
    const checks = join(testDir, 'checks');
    const config = join(testDir, 'config');
    await mkdir(statements);
    await mkdir(checks);
    await mkdir(config);

    await writeFile(
      join(statements, 'TH_THB_1001.csv'),
      `${header}\n2026-05-15,Card,1001,ACC,0.00,123.45,0.00,0.00,Cafe Market,Lunch,Outgoing\n`,
      'utf8',
    );

    await writeFile(
      join(config, 'clusters.yml'),
      `mappings: {}
patterns: []
clusters:
  - "Other"
  - "food"
`,
      'utf8',
    );

    let stdout = '';
    const code = await runCli(
      [
        'cluster',
        '-sf',
        statements,
        '-cf',
        checks,
        '--cluster-other',
        '-f',
        '2026-05-01',
        '-t',
        '2026-05-31',
      ],
      testDir,
      {
        stdout: (value) => (stdout += value),
        stderr: () => undefined,
        prompt: async () => 'skip',
      },
    );

    expect(code).toBe(0);
    expect(stdout).toContain('Cluster:');
  });

  it('runs interactive clustering with unmatched receivers', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'budget-audit-interactive-'));
    const statements = join(testDir, 'statements');
    const checks = join(testDir, 'checks');
    const config = join(testDir, 'config');
    await mkdir(statements);
    await mkdir(checks);
    await mkdir(config);

    // Initialize git repo
    await writeFile(join(testDir, '.gitignore'), '', 'utf8');
    const { spawn: nodeSpawn } = await import('node:child_process');
    await new Promise<void>((resolve, reject) => {
      const proc = nodeSpawn('git', ['init'], { cwd: testDir });
      proc.on('close', (code) => (code === 0 ? resolve() : reject()));
    });
    await new Promise<void>((resolve, reject) => {
      const proc = nodeSpawn(
        'git',
        ['config', 'user.email', 'test@example.com'],
        { cwd: testDir },
      );
      proc.on('close', (code) => (code === 0 ? resolve() : reject()));
    });
    await new Promise<void>((resolve, reject) => {
      const proc = nodeSpawn('git', ['config', 'user.name', 'Test User'], {
        cwd: testDir,
      });
      proc.on('close', (code) => (code === 0 ? resolve() : reject()));
    });

    // Create a config with only "Other" cluster
    await writeFile(
      join(config, 'clusters.yml'),
      'mappings: {}\npatterns: []\nclusters:\n  - "Other"\n',
      'utf8',
    );

    // Create statement with unmatched receiver
    await writeFile(
      join(statements, 'TH_THB_2001.csv'),
      `${header}\n2026-05-15,Card,2001,ACC,0.00,50.00,0.00,0.00,Unknown Cafe,Coffee,Outgoing\n`,
      'utf8',
    );

    // Create a check file
    await writeFile(join(checks, '2001-slip.jpg'), '', 'utf8');

    let stdout = '';
    let promptCalls = 0;
    const code = await runCli(
      [
        'cluster',
        '-sf',
        statements,
        '-cf',
        checks,
        '--cluster-other',
        '-f',
        '2026-05-01',
        '-t',
        '2026-05-31',
      ],
      testDir,
      {
        stdout: (value) => (stdout += value),
        stderr: () => undefined,
        prompt: async () => {
          promptCalls++;
          return 'skip';
        },
      },
    );

    expect(code).toBe(0);
    expect(promptCalls).toBeGreaterThan(0);
    expect(stdout).toContain('Cluster:');
  });

  it('prints cluster help without loading statements', async () => {
    let stdout = '';
    const code = await runCli(['cluster', '--help'], process.cwd(), {
      stdout: (value) => (stdout += value),
      stderr: () => undefined,
      prompt: async () => 'skip',
    });

    expect(code).toBe(0);
    expect(stdout).toContain('Usage: budget-audit cluster');
    expect(stdout).toContain('--statements-folder');
    expect(stdout).toContain('--checks-folder');
    expect(stdout).toContain('--cluster-other');
    expect(stdout).toContain('--approach');
  });

  it('handles git spawn errors gracefully', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'budget-audit-spawn-error-'));
    const statements = join(testDir, 'statements');
    const checks = join(testDir, 'checks');
    const config = join(testDir, 'config');
    await mkdir(statements);
    await mkdir(checks);
    await mkdir(config);

    // Initialize git repo
    await writeFile(join(testDir, '.gitignore'), '', 'utf8');
    const { spawn: nodeSpawn } = await import('node:child_process');
    await new Promise<void>((resolve, reject) => {
      const proc = nodeSpawn('git', ['init'], { cwd: testDir });
      proc.on('close', (code) => (code === 0 ? resolve() : reject()));
    });
    await new Promise<void>((resolve, reject) => {
      const proc = nodeSpawn(
        'git',
        ['config', 'user.email', 'test@example.com'],
        { cwd: testDir },
      );
      proc.on('close', (code) => (code === 0 ? resolve() : reject()));
    });
    await new Promise<void>((resolve, reject) => {
      const proc = nodeSpawn('git', ['config', 'user.name', 'Test User'], {
        cwd: testDir,
      });
      proc.on('close', (code) => (code === 0 ? resolve() : reject()));
    });

    // Create a config with only "Other" cluster and "transport" cluster for the prompt
    await writeFile(
      join(config, 'clusters.yml'),
      'mappings: {}\npatterns: []\nclusters:\n  - "Other"\n  - "transport"\n',
      'utf8',
    );

    // Create statement with unmatched receiver
    await writeFile(
      join(statements, 'TH_THB_3001.csv'),
      `${header}\n2026-05-15,Card,3001,ACC,0.00,50.00,0.00,0.00,Test Vendor,Test,Outgoing\n`,
      'utf8',
    );

    // Create a check file
    await writeFile(join(checks, '3001-slip.jpg'), '', 'utf8');

    // Corrupt the git repo by removing .git/objects to cause git commands to fail
    const { rmdir } = await import('node:fs/promises');
    await rmdir(join(testDir, '.git', 'objects'), { recursive: true });

    let stderr = '';
    const code = await runCli(
      [
        'cluster',
        '-sf',
        statements,
        '-cf',
        checks,
        '--cluster-other',
        '-f',
        '2026-05-01',
        '-t',
        '2026-05-31',
      ],
      testDir,
      {
        stdout: () => undefined,
        stderr: (value) => (stderr += value),
        prompt: async () => 'assign:transport',
      },
    );

    expect(code).toBe(1);
    expect(stderr).toBeTruthy();
  });

  it('rejects invalid cluster approach values', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'budget-audit-test-'));
    const statements = join(testDir, 'statements');
    const checks = join(testDir, 'checks');
    const config = join(testDir, 'config');
    await mkdir(statements);
    await mkdir(checks);
    await mkdir(config);

    await writeFile(
      join(statements, 'TH_THB_1001.csv'),
      `${header}\n2026-05-15,Card,1001,ACC,0.00,123.45,0.00,0.00,Cafe Market,Lunch,Outgoing\n`,
      'utf8',
    );

    await writeFile(
      join(config, 'clusters.yml'),
      `mappings: {}
patterns: []
clusters:
  - "Other"
  - "food"
`,
      'utf8',
    );

    let stderr = '';
    const code = await runCli(
      [
        'cluster',
        '-sf',
        statements,
        '-cf',
        checks,
        '-a',
        'invalid-approach',
        '-f',
        '2026-05-01',
        '-t',
        '2026-05-31',
      ],
      testDir,
      {
        stdout: () => undefined,
        stderr: (value) => (stderr += value),
        prompt: async () => 'skip',
      },
    );

    expect(code).toBe(1);
    expect(stderr).toContain('Invalid cluster approach');
  });
});
