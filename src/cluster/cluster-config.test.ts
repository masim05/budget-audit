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

  it('loads patterns and ignores malformed entries', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-config-'));
    const path = join(folder, 'mapping.yml');
    await writeFile(
      path,
      `mappings: {}\nclusters: [кафе, other]\npatterns:\n  - pattern: "/CAFE/i"\n    cluster: кафе\n  - invalid: true\n`,
      'utf8',
    );
    const loaded = await loadClusterConfig(path);
    expect(loaded.patterns).toHaveLength(1);
    expect(loaded.patterns[0].cluster).toBe('кафе');
  });

  it('loads config without patterns field', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-config-'));
    const path = join(folder, 'mapping.yml');
    await writeFile(path, 'mappings: {}\nclusters: [кафе, other]\n', 'utf8');
    const loaded = await loadClusterConfig(path);
    expect(loaded.patterns).toEqual([]);
  });

  it('throws on saveClusterMapping with unknown cluster', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-config-'));
    const path = join(folder, 'mapping.yml');
    await loadClusterConfig(path);
    await expect(
      saveClusterMapping(path, 'VELO CAFE', 'nonexistent'),
    ).rejects.toThrow('Unknown cluster');
  });

  it('throws when mappings field is not an object', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-config-'));
    const path = join(folder, 'mapping.yml');
    await writeFile(
      path,
      'mappings: "not-an-object"\nclusters: [other]\n',
      'utf8',
    );
    await expect(loadClusterConfig(path)).rejects.toThrow(
      /mappings must be object/,
    );
  });

  it('throws when clusters does not include other', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-config-'));
    const path = join(folder, 'mapping.yml');
    await writeFile(path, 'mappings: {}\nclusters: [кафе]\n', 'utf8');
    await expect(loadClusterConfig(path)).rejects.toThrow(
      /clusters must include "other"/,
    );
  });

  it('throws when patterns is not an array', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-config-'));
    const path = join(folder, 'mapping.yml');
    await writeFile(
      path,
      'mappings: {}\nclusters: [other]\npatterns: "bad"\n',
      'utf8',
    );
    await expect(loadClusterConfig(path)).rejects.toThrow(
      /patterns must be array/,
    );
  });
});
