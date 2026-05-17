import { describe, expect, it } from 'vitest';
import {
  isWithinDateRange,
  parseCliDate,
  parseStatementDate,
  previousFullCalendarMonth,
  validateDateRange,
} from './date-range.js';

describe('date range helpers', () => {
  it('calculates the previous full calendar month', () => {
    expect(previousFullCalendarMonth(new Date('2026-05-17T00:00:00Z'))).toEqual(
      { from: '2026-04-01', to: '2026-04-30' },
    );
  });

  it('parses CLI and statement dates and validates inclusive ranges', () => {
    expect(parseCliDate('2026-05-01')).toBe('2026-05-01');
    expect(parseStatementDate('15/05/2026')).toBe('2026-05-15');
    expect(validateDateRange('2026-05-01', '2026-05-31')).toEqual({
      from: '2026-05-01',
      to: '2026-05-31',
    });
    expect(
      isWithinDateRange('2026-05-31', { from: '2026-05-01', to: '2026-05-31' }),
    ).toBe(true);
  });

  it('rejects invalid dates and inverted ranges', () => {
    expect(() => parseCliDate('2026-02-30')).toThrow('Invalid date');
    expect(() => parseStatementDate('05-15-2026')).toThrow('Invalid date');
    expect(() => validateDateRange('2026-05-31', '2026-05-01')).toThrow(
      'Start date',
    );
  });
});
