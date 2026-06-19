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
  const mappings = Object.fromEntries(
    Object.entries(config.mappings ?? {}).sort(([a], [b]) => a.localeCompare(b)),
  );
  const patterns = (config.patterns ?? []).slice().sort((a, b) =>
    String(a.pattern).localeCompare(String(b.pattern)),
  );
  const clusters = Array.from(new Set(config.clusters ?? [])).sort();

  const canonical = { mappings, patterns, clusters };
  await writeFile(path, stringify(canonical), 'utf8');
}
