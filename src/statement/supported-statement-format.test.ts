import { describe, expect, it } from 'vitest';
import {
  detectStatementCurrency,
  expectedStatementHeader,
  isSupportedStatementHeader,
  normalizeStatementHeader,
} from './supported-statement-format.js';

const header = expectedStatementHeader().split(',');

describe('supported statement format', () => {
  it('strips repeated leading BOM markers only from the first header column', () => {
    expect(
      normalizeStatementHeader(['\uFEFF\uFEFFDate', 'Transaction Type']),
    ).toEqual(['Date', 'Transaction Type']);
    expect(
      normalizeStatementHeader(['Date', '\uFEFFTransaction Type']),
    ).toEqual(['Date', '\uFEFFTransaction Type']);
    expect(normalizeStatementHeader([undefined as unknown as string])).toEqual([
      '',
    ]);
  });

  it('recognizes only the exact normalized statement header', () => {
    expect(isSupportedStatementHeader(['\uFEFFDate', ...header.slice(1)])).toBe(
      true,
    );
    expect(isSupportedStatementHeader([...header, 'Extra'])).toBe(false);
    expect(
      isSupportedStatementHeader(['Posted Date', ...header.slice(1)]),
    ).toBe(false);
  });

  it('detects supported currency filename markers', () => {
    expect(detectStatementCurrency('IE_USD_1001.csv')).toBe('USD');
    expect(detectStatementCurrency('IE_AMD_5600.csv')).toBe('AMD');
    expect(detectStatementCurrency('TH_THB_1001.csv')).toBe('THB');
    expect(detectStatementCurrency('statement.csv')).toBeNull();
  });
});
