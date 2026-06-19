import { describe, expect, it } from 'vitest';
import {
  convertAmdToUsdMinor,
  formatMoney,
  formatUsd,
  parseAmount,
  preferredAmount,
} from './money.js';

describe('money helpers', () => {
  it('parses exact minor units and formats USD', () => {
    expect(parseAmount('1,234.50')).toBe(123450n);
    expect(parseAmount('-1.25')).toBe(-125n);
    expect(parseAmount('')).toBeUndefined();
    expect(formatUsd(-123450n)).toBe('-1234.50');
  });

  it('formats money amounts', () => {
    expect(formatMoney(12345n)).toBe('123.45');
  });

  it('converts AMD to USD using the local deterministic rate', () => {
    expect(convertAmdToUsdMinor(40000n)).toBe(100n);
    expect(convertAmdToUsdMinor(200n, 300n)).toBe(67n);
    expect(convertAmdToUsdMinor(-200n, 300n)).toBe(-67n);
  });

  it('rejects invalid amounts and rates', () => {
    expect(() => parseAmount('12.345')).toThrow('Invalid amount');
    expect(() => convertAmdToUsdMinor(1n, 0n)).toThrow('greater than zero');
  });

  it('selects non-zero primary amounts before fallbacks', () => {
    expect(preferredAmount(5n, 10n)).toBe(5n);
    expect(preferredAmount(-5n, 10n)).toBe(-5n);
    expect(preferredAmount(0n, 10n)).toBe(10n);
    expect(preferredAmount(undefined, 10n)).toBe(10n);
    expect(preferredAmount(undefined, undefined, 7n)).toBe(7n);
  });
});
