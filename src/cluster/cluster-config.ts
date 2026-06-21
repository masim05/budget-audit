import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import YAML from 'yaml';

export interface ClusterConfig {
  mappings: Record<string, string>;
  patterns: Array<{ pattern: string; cluster: string }>;
  clusters: string[];
}

export const DEFAULT_CLUSTERS = [
  'дом',
  'склад',
  'машина',
  'бензин + мойка',
  'обязательные лекарства',
  'кружки (музыка, муайтай, тайский, зал)',
  'уборка',
  'коммуналка',
  'телефоны, подписки',
  'здоровье',
  'кафе',
  'продукты',
  'такси',
  'красота',
  'товары для детей',
  'развлечения',
  'животные',
  'путешествия',
  'other',
] as const;

export function normalizeReceiver(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function defaultConfig(): ClusterConfig {
  return {
    mappings: {},
    patterns: [],
    clusters: [...new Set(DEFAULT_CLUSTERS)],
  };
}

function assertConfig(
  value: unknown,
  path: string,
): asserts value is ClusterConfig {
  /* v8 ignore next 3 */
  if (!value || typeof value !== 'object') {
    throw new Error(`Invalid cluster config in ${path}: expected object`);
  }
  const typed = value as Partial<ClusterConfig>;
  if (!typed.mappings || typeof typed.mappings !== 'object') {
    throw new Error(
      `Invalid cluster config in ${path}: mappings must be object`,
    );
  }
  if (!Array.isArray(typed.clusters) || typed.clusters.length === 0) {
    throw new Error(
      `Invalid cluster config in ${path}: clusters must be non-empty array`,
    );
  }
  if (!typed.clusters.includes('other')) {
    throw new Error(
      `Invalid cluster config in ${path}: clusters must include "other"`,
    );
  }
  if (typed.patterns !== undefined && !Array.isArray(typed.patterns)) {
    throw new Error(
      `Invalid cluster config in ${path}: patterns must be array`,
    );
  }
}

export async function loadClusterConfig(path: string): Promise<ClusterConfig> {
  try {
    await access(path);
  } catch {
    const config = defaultConfig();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, YAML.stringify(config), 'utf8');
    return config;
  }

  const content = await readFile(path, 'utf8');
  const parsed = YAML.parse(content);
  assertConfig(parsed, path);
  const mappings: Record<string, string> = {};
  for (const [key, cluster] of Object.entries(parsed.mappings)) {
    if (typeof cluster === 'string') {
      mappings[normalizeReceiver(key)] = cluster;
    }
  }
  return {
    mappings,
    patterns: Array.isArray(parsed.patterns)
      ? parsed.patterns.filter(
          (value): value is { pattern: string; cluster: string } =>
            Boolean(
              value &&
              typeof value === 'object' &&
              typeof (value as { pattern?: unknown }).pattern === 'string' &&
              typeof (value as { cluster?: unknown }).cluster === 'string',
            ),
        )
      : [],
    clusters: [...new Set(parsed.clusters)],
  };
}

export async function saveClusterMapping(
  path: string,
  receiver: string,
  cluster: string,
): Promise<void> {
  const config = await loadClusterConfig(path);
  if (!config.clusters.includes(cluster)) {
    throw new Error(`Unknown cluster "${cluster}"`);
  }
  config.mappings[normalizeReceiver(receiver)] = cluster;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, YAML.stringify(config), 'utf8');
}
