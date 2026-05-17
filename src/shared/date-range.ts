export interface DateRange {
  from: string;
  to: string;
}

export function parseCliDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date: ${value}`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Invalid date: ${value}`);
  }
  return value;
}

export function parseStatementDate(value: string): string {
  const trimmed = value.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) return parseCliDate(trimmed);
  const [, day, month, year] = match;
  return parseCliDate(`${year}-${month}-${day}`);
}

export function validateDateRange(from: string, to: string): DateRange {
  const parsedFrom = parseCliDate(from);
  const parsedTo = parseCliDate(to);
  if (parsedFrom > parsedTo) {
    throw new Error('Start date must be on or before end date');
  }
  return { from: parsedFrom, to: parsedTo };
}

export function previousFullCalendarMonth(now = new Date()): DateRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const firstOfCurrent = new Date(Date.UTC(year, month, 1));
  const lastOfPrevious = new Date(
    firstOfCurrent.getTime() - 24 * 60 * 60 * 1000,
  );
  const firstOfPrevious = new Date(
    Date.UTC(lastOfPrevious.getUTCFullYear(), lastOfPrevious.getUTCMonth(), 1),
  );
  return {
    from: firstOfPrevious.toISOString().slice(0, 10),
    to: lastOfPrevious.toISOString().slice(0, 10),
  };
}

export function isWithinDateRange(date: string, range: DateRange): boolean {
  return date >= range.from && date <= range.to;
}
