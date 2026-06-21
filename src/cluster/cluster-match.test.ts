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

  it('returns other in hybrid mode when no fuzzy match found', () => {
    expect(
      matchCluster('COMPLETELY DIFFERENT SHOP', config, 'hybrid'),
    ).toMatchObject({
      cluster: 'other',
      matchedBy: 'other',
    });
  });

  it('skips patterns with invalid format and falls back to other', () => {
    const badPatternConfig: ClusterConfig = {
      mappings: {},
      patterns: [{ pattern: 'NOT_A_REGEX', cluster: 'food' }],
      clusters: ['food', 'other'],
    };
    expect(
      matchCluster('NOT_A_REGEX', badPatternConfig, 'deterministic'),
    ).toMatchObject({
      cluster: 'other',
      matchedBy: 'other',
    });
  });

  it('matches alias variants by mapping prefix with boundary', () => {
    const aliasConfig: ClusterConfig = {
      mappings: { 'MS. SUPHASITA BOONTHERNG': 'кружки' },
      patterns: [],
      clusters: ['кружки', 'other'],
    };

    expect(
      matchCluster(
        'MS. SUPHASITA BOONTHERNG PROMPTPAY TOP UP / G-WALLET K PLUS WALLET',
        aliasConfig,
        'deterministic',
      ),
    ).toMatchObject({
      cluster: 'кружки',
      matchedBy: 'mapping',
    });

    expect(
      matchCluster(
        'MS. SUPHASITA BOONTHERNG (PROMPTPAY TOP UP / G-WALLET)',
        aliasConfig,
        'deterministic',
      ),
    ).toMatchObject({
      cluster: 'кружки',
      matchedBy: 'mapping',
    });
  });

  it('does not match partial-name prefixes without boundary', () => {
    const aliasConfig: ClusterConfig = {
      mappings: { 'MR JOHN': 'other' },
      patterns: [],
      clusters: ['other'],
    };

    expect(
      matchCluster('MR JOHNSON', aliasConfig, 'deterministic'),
    ).toMatchObject({
      cluster: 'other',
      matchedBy: 'other',
    });
  });
});
