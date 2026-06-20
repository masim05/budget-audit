import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  OpenAiCheckParser,
  resolveOpenAiApiKey,
} from './openai-check-parser.js';

describe('resolveOpenAiApiKey', () => {
  it('uses process env key first', async () => {
    await expect(
      resolveOpenAiApiKey({ OPENAI_API_KEY: 'test-key' }, '/tmp/missing.env'),
    ).resolves.toBe('test-key');
  });

  it('loads key from .env path', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'openai-key-'));
    const envPath = join(folder, '.env');
    await writeFile(envPath, 'OPENAI_API_KEY=file-key\n', 'utf8');

    await expect(resolveOpenAiApiKey({}, envPath)).resolves.toBe('file-key');
  });
});

describe('OpenAiCheckParser', () => {
  it('parses check payload from mocked OpenAI response', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'checks-'));
    const file = join(folder, '2026-06-01 08-22-54.JPEG');
    await writeFile(file, Buffer.from([1, 2, 3]));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text:
          '{"recipient":"VELO CAFE","recipient_english":"VELO CAFE","amount_thb":"85.00"}',
      }),
    });
    const parser = new OpenAiCheckParser(
      'k',
      fetchMock as unknown as typeof fetch,
    );

    const checks = await parser.parseChecks(folder);
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({
      recipient: 'VELO CAFE',
      recipientEnglish: 'VELO CAFE',
      date: '2026-06-01',
      time: '08:22',
    });
    expect(checks[0].amountMinor).toBe(8500n);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
