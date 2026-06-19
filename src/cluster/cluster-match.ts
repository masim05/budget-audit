import { normalizeReceiver } from './normalize-receiver.js';
import type { ClusterConfig } from './cluster-config.js';

export type ClusterApproach = 'deterministic' | 'hybrid';

export type MatchedBy = 'mapping' | 'pattern' | 'fuzzy' | 'other';

export interface ClusterMatch {
  cluster: string;
  matchedBy: MatchedBy;
  normalizedReceiver: string;
}

export function matchCluster(
  receiver: string,
  config: ClusterConfig,
  approach: ClusterApproach,
): ClusterMatch {
  const normalizedReceiver = normalizeReceiver(receiver);

  const exact = config.mappings[normalizedReceiver];
  if (exact) {
    return { cluster: exact, matchedBy: 'mapping', normalizedReceiver };
  }

  for (const { pattern, cluster } of config.patterns) {
    const match = /^\/(.+)\/([a-z]*)$/.exec(pattern);
    if (match) {
      const [, body, flags = ''] = match;
      if (body && new RegExp(body, flags).test(receiver)) {
        return { cluster, matchedBy: 'pattern', normalizedReceiver };
      }
    }
  }

  if (approach === 'hybrid') {
    const fuzzy = bestFuzzyCluster(normalizedReceiver, config.mappings);
    if (fuzzy) {
      return { cluster: fuzzy, matchedBy: 'fuzzy', normalizedReceiver };
    }
  }

  return { cluster: 'Other', matchedBy: 'other', normalizedReceiver };
}

function bestFuzzyCluster(
  normalizedReceiver: string,
  mappings: Record<string, string>,
): string | null {
  let bestMatch: { key: string; distance: number } | null = null;

  for (const key of Object.keys(mappings)) {
    const distance = levenshteinDistance(normalizedReceiver, key);
    const maxLength = Math.max(normalizedReceiver.length, key.length);
    const similarity = 1 - distance / maxLength;

    if (similarity >= 0.8) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { key, distance };
      }
    }
  }

  return bestMatch ? mappings[bestMatch.key] : null;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
