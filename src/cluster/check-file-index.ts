import { readdir } from 'node:fs/promises';

export async function buildCheckFileIndex(
  folderPath: string,
): Promise<Map<string, string[]>> {
  const index = new Map<string, string[]>();
  const files = await readdir(folderPath);
  for (const fileName of files.sort()) {
    const match = /\d+/.exec(fileName);
    if (!match) continue;
    index.set(match[0], [...(index.get(match[0]) ?? []), fileName]);
  }
  return index;
}
