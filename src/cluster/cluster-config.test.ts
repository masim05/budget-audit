import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadClusterConfig,
  normalizeReceiver,
  saveClusterMapping,
} from './cluster-config.js';

describe('cluster config', () => {
  it('creates defaults when config does not exist', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-config-'));
    const path = join(folder, 'mapping.yml');

    const loaded = await loadClusterConfig(path);

    expect(loaded.clusters).toContain('other');
    expect(loaded.mappings).toEqual({});
    expect((await readFile(path, 'utf8')).length).toBeGreaterThan(0);
  });

  it('normalizes keys and persists mappings', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-config-'));
    const path = join(folder, 'mapping.yml');
    await loadClusterConfig(path);

    await saveClusterMapping(path, ' velo   cafe ', 'кафе');
    const loaded = await loadClusterConfig(path);

    expect(loaded.mappings['VELO CAFE']).toBe('кафе');
    expect(normalizeReceiver('  Velo   Cafe ')).toBe('VELO CAFE');
  });

  it('rejects malformed yaml config', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-config-'));
    const path = join(folder, 'mapping.yml');
    await writeFile(path, 'clusters: []\nmappings: {}\n', 'utf8');

    await expect(loadClusterConfig(path)).rejects.toThrow(
      /clusters must be non-empty array/,
    );
  });
});
