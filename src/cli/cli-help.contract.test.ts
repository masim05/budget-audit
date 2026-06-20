import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

describe('CLI help contract', () => {
  it.each([
    ['audit --help', ['audit', '--help']],
    ['audit -h', ['audit', '-h']],
    ['--help', ['--help']],
    ['-h', ['-h']],
  ])('prints audit help for %s', async (_label, argv) => {
    let stdout = '';
    let stderr = '';

    const code = await runCli(argv, process.cwd(), {
      stdout: (value) => (stdout += value),
      stderr: (value) => (stderr += value),
    });

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Usage: budget-audit audit');
    expect(stdout).toContain('--data-dir');
    expect(stdout).toContain('-f, --from');
    expect(stdout).toContain('-t, --to');
    expect(stdout).toContain('--matching-mode');
    expect(stdout).toContain('--format');
    expect(stdout).toContain('-o, --output');
    expect(stdout).toContain('-h, --help');
  });

  it.each([
    ['cluster --help', ['cluster', '--help']],
    ['cluster -h', ['cluster', '-h']],
  ])('prints cluster help for %s', async (_label, argv) => {
    let stdout = '';
    let stderr = '';

    const code = await runCli(argv, process.cwd(), {
      stdout: (value) => (stdout += value),
      stderr: (value) => (stderr += value),
    });

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Usage: budget-audit cluster');
    expect(stdout).toContain('-f, --from');
    expect(stdout).toContain('-t, --to');
    expect(stdout).toContain('-h, --help');
    expect(stdout).toContain('npm run cluster');
  });

  it('prints help without requiring statement inputs or running an audit', async () => {
    let stdout = '';
    let stderr = '';

    const code = await runCli(
      ['audit', '-h', '--data-dir', '/missing-folder'],
      process.cwd(),
      {
        stdout: (value) => (stdout += value),
        stderr: (value) => (stderr += value),
      },
    );

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Usage: budget-audit audit');
  });

  it('keeps unknown commands invalid even when help is requested', async () => {
    let stdout = '';
    let stderr = '';

    const code = await runCli(['wrong', '-h'], process.cwd(), {
      stdout: (value) => (stdout += value),
      stderr: (value) => (stderr += value),
    });

    expect(code).toBe(1);
    expect(stdout).toBe('');
    expect(stderr).toContain('Expected command: audit');
  });
});
