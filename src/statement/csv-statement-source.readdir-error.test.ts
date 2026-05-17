import { describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(() => Promise.reject('not-an-error-object')),
  readFile: vi.fn(),
}));

const { CsvStatementSource, InputFolderMissingError } =
  await import('./index.js');

describe('CSV statement source readdir diagnostics', () => {
  it('handles non-Error readdir failures without adding an error detail', async () => {
    const load = new CsvStatementSource('/mocked-folder').load();
    await expect(load).rejects.toBeInstanceOf(InputFolderMissingError);
    await expect(load).rejects.toThrow(
      'Input folder is unavailable: /mocked-folder',
    );
  });
});
