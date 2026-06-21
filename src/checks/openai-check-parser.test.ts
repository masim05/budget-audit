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

  it('returns warning on non-ok HTTP response', async () => {
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
    const result = await parser.parseChecks(folder);
    expect(result).toHaveLength(1);
    expect(result[0].warnings[0]).toContain('401');
  });

  it('returns warning when response has no output content', async () => {
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
    const result = await parser.parseChecks(folder);
    expect(result).toHaveLength(1);
    expect(result[0].warnings[0]).toContain('did not contain output_text');
  });

  it('returns warning on invalid amount in parsed check JSON', async () => {
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
    const result = await parser.parseChecks(folder);
    expect(result).toHaveLength(1);
    expect(result[0].warnings[0]).toContain('Invalid check amount');
  });

  it('returns empty array when folder does not exist', async () => {
    const fetchMock = vi.fn();
    const parser = new OpenAiCheckParser(
      'k',
      fetchMock as unknown as typeof fetch,
    );
    const result = await parser.parseChecks('/nonexistent/checks-folder-xyz');
    expect(result).toHaveLength(0);
  });

  it('returns warning entry when parsing an image fails', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'checks-'));
    await writeFile(join(folder, '2026-06-01 08-22-54.JPEG'), Buffer.from([1]));

    const fetchMock = vi.fn().mockRejectedValue(new Error('network error'));
    const parser = new OpenAiCheckParser(
      'k',
      fetchMock as unknown as typeof fetch,
    );
    const result = await parser.parseChecks(folder);
    expect(result).toHaveLength(1);
    expect(result[0].warnings[0]).toContain('network error');
    expect(result[0].amountMinor).toBe(0n);
  });
});
