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
    
    // Prefer the longest number (most transaction-like)
    // If equal length, prefer the first one
    const txNumber = matches
      .map((m) => m[1])
      .reduce((longest, current) =>
        current.length > longest.length ? current : longest
      );
    
    index.set(txNumber, [...(index.get(txNumber) ?? []), fileName]);
  }
  return index;
}
