import { normalizeReceiver, type ClusterConfig } from './cluster-config.js';

export type ClusterApproach = 'deterministic' | 'hybrid';

export function matchCluster(
  receiver: string,
  config: ClusterConfig,
  approach: ClusterApproach,
) {
  const hasBoundaryAt = (value: string, index: number): boolean => {
    if (index >= value.length) return true;
    return /[\s\-/().,]/.test(value[index]);
  };

  const normalizedReceiver = normalizeReceiver(receiver);
  const exact = config.mappings[normalizedReceiver];
  if (exact)
    return {
      cluster: exact,
      matchedBy: 'mapping',
      normalizedReceiver,
    } as const;

  // Treat mapping keys as aliases for the same recipient when one form is a
  // prefix of the other and the next character is a token boundary.
  for (const [key, cluster] of Object.entries(config.mappings)) {
    const receiverStartsWithKey =
      normalizedReceiver.startsWith(key) &&
      hasBoundaryAt(normalizedReceiver, key.length);
    const keyStartsWithReceiver =
      key.startsWith(normalizedReceiver) &&
      hasBoundaryAt(key, normalizedReceiver.length);
    if (receiverStartsWithKey || keyStartsWithReceiver) {
      return {
        cluster,
        matchedBy: 'mapping',
        normalizedReceiver,
      } as const;
    }
  }

  for (const { pattern, cluster } of config.patterns) {
    const m = /^\/(.+)\/([a-z]*)$/.exec(pattern);
    if (!m) continue;
    const [, body, flags = ''] = m;
    if (body && new RegExp(body, flags).test(receiver)) {
      return { cluster, matchedBy: 'pattern', normalizedReceiver } as const;
    }
  }

  if (approach === 'hybrid') {
    // fuzzy: use a small Levenshtein distance on normalized strings
    function lev(a: string, b: string): number {
      const al = a.length;
      const bl = b.length;
      const dp: number[][] = Array.from({ length: al + 1 }, () =>
        Array(bl + 1).fill(0),
      );
      for (let i = 0; i <= al; i++) dp[i][0] = i;
      for (let j = 0; j <= bl; j++) dp[0][j] = j;
      for (let i = 1; i <= al; i++) {
        for (let j = 1; j <= bl; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + cost,
          );
        }
      }
      return dp[al][bl];
    }

    for (const [key, cluster] of Object.entries(
      /* v8 ignore next */ config.mappings ?? {},
    )) {
      const distance = lev(key, normalizedReceiver);
      if (distance <= 2)
        return { cluster, matchedBy: 'fuzzy', normalizedReceiver } as const;
    }
  }

  return { cluster: 'other', matchedBy: 'other', normalizedReceiver } as const;
}
