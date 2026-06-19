import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCheckFileIndex } from './check-file-index.js';

describe('buildCheckFileIndex', () => {
  it('indexes check files by transaction number', async () => {
    const folder = join(
      process.cwd(),
      'test-output',
      'check-file-index-test-' + Date.now(),
    );
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, '1001-slip.jpg'), '', 'utf8');
    await writeFile(join(folder, '1001-receipt.pdf'), '', 'utf8');
    await writeFile(join(folder, '2002-slip.jpg'), '', 'utf8');
    await writeFile(join(folder, 'readme.txt'), '', 'utf8');

    const index = await buildCheckFileIndex(folder);

    expect(index.get('1001')).toEqual(['1001-receipt.pdf', '1001-slip.jpg']);
    expect(index.get('2002')).toEqual(['2002-slip.jpg']);
    expect(index.has('readme')).toBe(false);
  });

  it('returns empty map for folder with no check files', async () => {
    const folder = join(
      process.cwd(),
      'test-output',
      'check-file-index-empty-' + Date.now(),
    );
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, 'readme.txt'), '', 'utf8');

    const index = await buildCheckFileIndex(folder);

    expect(index.size).toBe(0);
  });

  it('extracts transaction numbers at word boundaries safely', async () => {
    const folder = join(
      process.cwd(),
      'test-output',
      'check-file-index-boundary-' + Date.now(),
    );
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, '12345-receipt.pdf'), '', 'utf8');
    await writeFile(join(folder, 'IMG_67890.jpg'), '', 'utf8');
    await writeFile(join(folder, 'file12.txt'), '', 'utf8'); // Should not match (only 2 digits)
    await writeFile(join(folder, '999slip.jpg'), '', 'utf8'); // Should match at start

    const index = await buildCheckFileIndex(folder);

    expect(index.get('12345')).toEqual(['12345-receipt.pdf']);
    expect(index.get('67890')).toEqual(['IMG_67890.jpg']);
    expect(index.get('999')).toEqual(['999slip.jpg']);
    expect(index.has('12')).toBe(false); // Too short
  });
});
