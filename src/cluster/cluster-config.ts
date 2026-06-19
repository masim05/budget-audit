import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parse, stringify } from 'yaml';
import { normalizeReceiver } from './normalize-receiver.js';

export type ClusterConfig = {
  mappings: Record<string, string>;
  patterns: Array<{ pattern: string; cluster: string }>;
  clusters: string[];
};

export async function loadClusterConfig(path: string): Promise<ClusterConfig> {
  const raw = parse(
    await readFile(path, 'utf8'),
  ) as Partial<ClusterConfig> | null;
  return {
    mappings: Object.fromEntries(
      Object.entries(raw?.mappings ?? {}).map(([receiver, cluster]) => [
        normalizeReceiver(receiver),
        cluster,
      ]),
    ),
    patterns: (raw?.patterns ?? []).map(({ pattern, cluster }) => ({
      pattern,
      cluster,
    })),
    clusters: [...new Set(raw?.clusters ?? [])].sort(),
  };
}

export async function saveClusterConfig(
  path: string,
  config: ClusterConfig,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });

  // Canonicalize config for deterministic YAML output:
  // - mappings sorted by normalized receiver key
  // - patterns sorted by pattern string
  // - clusters unique and sorted
  // Deterministic, locale-independent sort using code-point ordering
  const mappings = Object.fromEntries(
    Object.entries(config.mappings ?? {})
      .map(([k, v]) => [normalizeReceiver(k), v])
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  const patterns = (config.patterns ?? []).slice().sort((a, b) => {
    const pa = String(a.pattern);
    const pb = String(b.pattern);
    return pa < pb ? -1 : pa > pb ? 1 : 0;
  });
  const clusters = Array.from(new Set(config.clusters ?? [])).sort();

  const canonical = { mappings, patterns, clusters };
  await writeFile(path, stringify(canonical), 'utf8');
}
