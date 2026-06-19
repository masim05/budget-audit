import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCheckFileIndex } from './check-file-index.js';

describe('buildCheckFileIndex', () => {
  it('indexes check files by transaction number', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(join(folder, '1001-slip.jpg'), '', 'utf8');
    await writeFile(join(folder, '1001-receipt.pdf'), '', 'utf8');
    await writeFile(join(folder, '1001-slip-2.jpg'), '', 'utf8');
    await writeFile(join(folder, 'invoice-2026-05-1001.jpg'), '', 'utf8');
    await writeFile(join(folder, '2002-slip.jpg'), '', 'utf8');
    await writeFile(join(folder, 'readme.txt'), '', 'utf8');

    const index = await buildCheckFileIndex(folder);

    const files1001 = (index.get('1001') ?? []).slice().sort();
    expect(files1001).toEqual([
      '1001-receipt.pdf',
      '1001-slip-2.jpg',
      '1001-slip.jpg',
      'invoice-2026-05-1001.jpg',
    ].slice().sort());
    expect(index.get('2002')).toEqual(['2002-slip.jpg']);
    expect(index.has('readme')).toBe(false);
  });

  it('returns empty map for folder with no check files', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(join(folder, 'readme.txt'), '', 'utf8');

    const index = await buildCheckFileIndex(folder);

    expect(index.size).toBe(0);
  });

  it('indexes the last numeric token and supports 1-2 digits', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    await writeFile(join(folder, '12345-receipt.pdf'), '', 'utf8');
    await writeFile(join(folder, 'IMG_67890.jpg'), '', 'utf8');
    await writeFile(join(folder, '12_slip_9999.jpg'), '', 'utf8'); // numeric before 'slip' -> treated as txn 12
    await writeFile(join(folder, '99slip.jpg'), '', 'utf8'); // 2-digit at start
    await writeFile(join(folder, '5.jpg'), '', 'utf8'); // 1-digit at start
    await writeFile(join(folder, 'file12.txt'), '', 'utf8'); // 2 digits after text

    const index = await buildCheckFileIndex(folder);

    expect(index.get('12345')).toEqual(['12345-receipt.pdf']);
    expect(index.get('67890')).toEqual(['IMG_67890.jpg']);
    expect(index.get('12')).toEqual(expect.arrayContaining(['12_slip_9999.jpg', 'file12.txt']));
    expect(index.get('99')).toEqual(['99slip.jpg']); // 2-digit supported
    expect(index.get('5')).toEqual(['5.jpg']); // 1-digit supported
  });
});
