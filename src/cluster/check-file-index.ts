import { readdir } from 'node:fs/promises';

export async function buildCheckFileIndex(
  folderPath: string,
): Promise<Map<string, string[]>> {
  const index = new Map<string, string[]>();
  const files = await readdir(folderPath);
  for (const fileName of files.sort()) {
    // Extract transaction-number-like token: sequence of 3+ digits
    // at word boundary (start of filename or after non-digit)
    const match = /(?:^|[^\d])(\d{3,})/.exec(fileName);
    if (!match) continue;
    const txNumber = match[1];
    index.set(txNumber, [...(index.get(txNumber) ?? []), fileName]);
  }
  return index;
}
