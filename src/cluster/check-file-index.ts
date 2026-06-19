import { readdir } from 'node:fs/promises';

export async function buildCheckFileIndex(
  folderPath: string,
): Promise<Map<string, string[]>> {
  const index = new Map<string, string[]>();
  const files = await readdir(folderPath);
  for (const fileName of files.sort()) {
    // Find all digit sequences at word boundaries
    const matches = Array.from(fileName.matchAll(/(?:^|[^\d])(\d+)/g));
    if (matches.length === 0) continue;
    
    // Index every numeric token found so exact lookups by transaction
    // number can match even when filenames also contain dates, camera IDs,
    // or page numbers.
    for (const m of matches) {
      const token = m[1];
      index.set(token, [...(index.get(token) ?? []), fileName]);
    }
  }
  return index;
}
