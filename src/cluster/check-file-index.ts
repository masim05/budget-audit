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
    const matches = Array.from(name.matchAll(/\d+/g));
    if (matches.length === 0) continue;

    const last = matches[matches.length - 1][0];
    index.set(last, [...(index.get(last) ?? []), fileName]);
  }
  return index;
}
