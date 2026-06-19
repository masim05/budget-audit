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
  await writeFile(path, stringify(config), 'utf8');
}
