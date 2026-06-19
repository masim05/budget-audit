import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadClusterConfig, saveClusterConfig } from './cluster-config.js';

describe('cluster config', () => {
  it('loads YAML mappings and rewrites them deterministically', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const configPath = join(folder, 'clusters.yml');
    await writeFile(
      configPath,
      'mappings:\n  "Cafe 123": "food"\npatterns:\n  - pattern: "/^LOTUS/i"\n    cluster: "groceries"\nclusters:\n  - "food"\n  - "groceries"\n',
      'utf8',
    );

    const config = await loadClusterConfig(configPath);
    expect(config.mappings['CAFE 123']).toBe('food');
    await saveClusterConfig(configPath, config);
    const saved = await readFile(configPath, 'utf8');
    expect(saved).toContain('CAFE 123: food');
  });
});
