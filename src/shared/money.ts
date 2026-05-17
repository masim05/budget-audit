export type Currency = 'AMD' | 'USD' | 'UNKNOWN';

export const DEFAULT_AMD_PER_USD_MINOR = 40_000n;

export function parseAmount(value: string): bigint | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const normalized = trimmed.replaceAll(',', '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Invalid amount: ${value}`);
  }
  const [whole, fraction = ''] = normalized.split('.');
  const sign = whole.startsWith('-') ? -1n : 1n;
  const absoluteWhole = whole.replace('-', '');
  return (
    sign * (BigInt(absoluteWhole) * 100n + BigInt(fraction.padEnd(2, '0')))
  );
}

export function formatUsd(minorUnits: bigint): string {
  const sign = minorUnits < 0n ? '-' : '';
  const absolute = minorUnits < 0n ? -minorUnits : minorUnits;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

export function convertAmdToUsdMinor(
  amdMinorUnits: bigint,
  amdPerUsdMinorUnits = DEFAULT_AMD_PER_USD_MINOR,
): bigint {
  if (amdPerUsdMinorUnits <= 0n) {
    throw new Error('AMD to USD rate must be greater than zero');
  }
  const sign = amdMinorUnits < 0n ? -1n : 1n;
  const numerator =
    (amdMinorUnits < 0n ? -amdMinorUnits : amdMinorUnits) * 100n;
  const quotient = numerator / amdPerUsdMinorUnits;
  const remainder = numerator % amdPerUsdMinorUnits;
  const rounded =
    remainder * 2n >= amdPerUsdMinorUnits ? quotient + 1n : quotient;
  return sign * rounded;
}

export function preferredAmount(
  primary: bigint | undefined,
  secondary: bigint | undefined,
  fallback = 0n,
): bigint {
  if (primary !== undefined && primary !== 0n) return primary;
  if (secondary !== undefined) return secondary;
  return fallback;
}
