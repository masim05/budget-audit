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

  it('throws when key is not in env or .env', async () => {
    await expect(
      resolveOpenAiApiKey({}, '/tmp/nonexistent-xyz.env'),
    ).rejects.toThrow('OPENAI_API_KEY is required');
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

  it('falls back to output[].content[].text when output_text is absent', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'checks-'));
    await writeFile(join(folder, '2026-06-01 08-22-54.JPEG'), Buffer.from([1]));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            content: [
              {
                type: 'text',
                text: '{"recipient":"LOTUS","recipient_english":"Lotus","amount_thb":"100.00"}',
              },
            ],
          },
        ],
      }),
    });
    const parser = new OpenAiCheckParser(
      'k',
      fetchMock as unknown as typeof fetch,
    );
    const checks = await parser.parseChecks(folder);
    expect(checks[0].recipient).toBe('LOTUS');
    expect(checks[0].amountMinor).toBe(10000n);
  });

  it('throws on non-ok HTTP response', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'checks-'));
    await writeFile(join(folder, '2026-06-01 08-22-54.JPEG'), Buffer.from([1]));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    const parser = new OpenAiCheckParser(
      'k',
      fetchMock as unknown as typeof fetch,
    );
    await expect(parser.parseChecks(folder)).rejects.toThrow('401');
  });

  it('throws when response has no output content', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'checks-'));
    await writeFile(join(folder, '2026-06-01 08-22-54.JPEG'), Buffer.from([1]));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output: [] }),
    });
    const parser = new OpenAiCheckParser(
      'k',
      fetchMock as unknown as typeof fetch,
    );
    await expect(parser.parseChecks(folder)).rejects.toThrow(
      'did not contain output_text',
    );
  });

  it('throws on invalid amount in parsed check JSON', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'checks-'));
    await writeFile(join(folder, '2026-06-01 08-22-54.JPEG'), Buffer.from([1]));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text:
          '{"recipient":"X","recipient_english":"X","amount_thb":"not-a-number"}',
      }),
    });
    const parser = new OpenAiCheckParser(
      'k',
      fetchMock as unknown as typeof fetch,
    );
    await expect(parser.parseChecks(folder)).rejects.toThrow(
      'Invalid check amount',
    );
  });
});
