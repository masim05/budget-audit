import { describe, expect, it } from 'vitest';
import { matchCluster } from './cluster-match.js';
import type { ClusterConfig } from './cluster-config.js';

const config: ClusterConfig = {
  mappings: { 'CAFE MARKET': 'food' },
  patterns: [{ pattern: '/^LOTUS/i', cluster: 'groceries' }],
  clusters: ['food', 'groceries', 'other'],
};

describe('cluster matcher', () => {
  it('prefers exact mappings and falls back to fuzzy matches only in hybrid mode', () => {
    expect(matchCluster('Cafe Market', config, 'deterministic')).toMatchObject({
      cluster: 'food',
      matchedBy: 'mapping',
    });
    expect(matchCluster('Lotus Rama 9', config, 'deterministic')).toMatchObject(
      {
        cluster: 'groceries',
        matchedBy: 'pattern',
      },
    );
    expect(matchCluster('Cafe Maket', config, 'hybrid')).toMatchObject({
      cluster: 'food',
      matchedBy: 'fuzzy',
    });
  });
});
