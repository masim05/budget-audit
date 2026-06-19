import { readdir } from 'node:fs/promises';
import { parse } from 'node:path';

export async function buildCheckFileIndex(
  folderPath: string,
): Promise<Map<string, string[]>> {
  const index = new Map<string, string[]>();
  const files = await readdir(folderPath);
  for (const fileName of files.sort()) {
    // Use the filename *basename* (no extension) and index only the
    // LAST numeric token found. This prevents overmatching when names
    // contain dates or camera IDs, e.g. invoice-2026-05-1001.jpg -> 1001
    // Extract the filename without extension and index only the last numeric token.
    const name = parse(fileName).name;
    // Find numeric tokens in the basename (with positions). We will prefer
    // a numeric token that is immediately followed by an indicator segment
    // like `slip`, `receipt`, or `check`. Otherwise we fall back to the last
    // numeric token found in the basename. This preserves behavior for names
    // like `file12.txt` (matches '12') and `12_slip_9999.jpg`.
    const matches = Array.from(name.matchAll(/\d+/g));
    if (matches.length === 0) continue;

    const indicator = /^(?:slip|receipt|check)$/i;

    // Helper to find the next basename segment after a match position
    const nextSegment = (matchIndex: number, matchLen: number): string | null => {
      const rest = name.slice(matchIndex + matchLen);
      const m = rest.match(/[^A-Za-z0-9]*([A-Za-z0-9]+)/);
      return m ? m[1] : null;
    };

    // Prefer the first numeric token that is immediately followed by an
    // indicator segment; otherwise use the last numeric token.
    let chosen = matches[matches.length - 1][0];
    for (const m of matches) {
      const idx = (m as RegExpMatchArray).index ?? -1;
      const val = m[0];
      if (idx >= 0) {
        const next = nextSegment(idx, val.length);
        if (next && indicator.test(next)) {
          chosen = val;
          break;
        }
      }
    }

    index.set(chosen, [...(index.get(chosen) ?? []), fileName]);
  }
  return index;
}
