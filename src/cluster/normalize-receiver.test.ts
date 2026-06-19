import { describe, expect, it } from 'vitest';
import { normalizeReceiver } from './normalize-receiver.js';

describe('receiver normalization and THB support', () => {
  it('normalizes case, whitespace, and accents for matching', () => {
    expect(normalizeReceiver('  Café   Market  ')).toBe('CAFE MARKET');
  });
});
