import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

describe('cluster help contract', () => {
  it('shows cluster help with --help flag', async () => {
    let stdout = '';
    const code = await runCli(['cluster', '--help'], process.cwd(), {
      stdout: (value) => (stdout += value),
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(stdout).toContain('Usage: budget-audit cluster');
    expect(stdout).toContain('--statements-folder');
    expect(stdout).toContain('--checks-folder');
    expect(stdout).toContain('--from');
    expect(stdout).toContain('--to');
    expect(stdout).toContain('--approach');
    expect(stdout).toContain('--cluster-other');
    expect(stdout).toContain('--verbose');
    expect(stdout).toContain('--help');
  });

  it('shows cluster help with -h flag', async () => {
    let stdout = '';
    const code = await runCli(['cluster', '-h'], process.cwd(), {
      stdout: (value) => (stdout += value),
      stderr: () => undefined,
    });

    expect(code).toBe(0);
    expect(stdout).toContain('Usage: budget-audit cluster');
  });
});
