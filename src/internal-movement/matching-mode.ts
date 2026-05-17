export type MatchingMode = 'strict' | 'permissive';

export function parseMatchingMode(value = 'strict'): MatchingMode {
  if (value === 'strict' || value === 'permissive') return value;
  throw new Error(`Invalid matching mode: ${value}`);
}
