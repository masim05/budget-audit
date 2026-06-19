import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './main.js';

describe('cluster CLI flow', () => {
  it('clusters fixture statements and renders verbose grouped output', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'cluster-flow-'));
    const configDir = join(testDir, 'config');
    await mkdir(configDir);

    // Create config with mappings for the fixture data
    await writeFile(
      join(configDir, 'clusters.yml'),
      `mappings:
  "CAFE MARKET": "food"
  "LOTUS RAMA 9": "groceries"
  "7-ELEVEN": "food"
  "BIG C": "groceries"
patterns: []
clusters:
  - "Other"
  - "food"
  - "groceries"
`,
      'utf8',
    );

    const root = process.cwd();
    let stdout = '';

    const code = await runCli(
      [
        'cluster',
        '--statements-folder',
        join(root, 'tests/fixtures/cluster/basic'),
        '--checks-folder',
        join(root, 'tests/fixtures/cluster/checks'),
        '--from',
        '2026-05-01',
        '--to',
        '2026-05-31',
        '--verbose',
        '--approach',
        '2',
      ],
      testDir,
      {
        stdout: (value) => (stdout += value),
        stderr: () => undefined,
        prompt: async () => 'skip',
      },
    );

    expect(code).toBe(0);
    expect(stdout).toContain('food');
    expect(stdout).toContain('groceries');
    expect(stdout).toContain('2026-05-15');
    expect(stdout).toContain('TH_THB_1001.csv');
  });
});
