import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CheckParseCache, type CheckPayload } from './check-parse-cache.js';

const payload: CheckPayload = {
  recipient: 'VELO CAFE',
  recipient_english: 'Velo Cafe',
  amount_thb: '85.00',
};

async function tempCachePath(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'check-cache-'));
  return join(folder, 'nested', '.openai-parse-cache.json');
}

describe('CheckParseCache.keyForImage', () => {
  it('is deterministic for identical bytes', () => {
    const a = CheckParseCache.keyForImage(Buffer.from([1, 2, 3]));
    const b = CheckParseCache.keyForImage(Buffer.from([1, 2, 3]));
    expect(a).toBe(b);
  });

  it('differs for different bytes', () => {
    const a = CheckParseCache.keyForImage(Buffer.from([1, 2, 3]));
    const b = CheckParseCache.keyForImage(Buffer.from([4, 5, 6]));
    expect(a).not.toBe(b);
  });
});

describe('CheckParseCache', () => {
  it('returns undefined for a missing key', async () => {
    const cache = new CheckParseCache(await tempCachePath());
    await cache.load();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('persists and reloads entries across instances', async () => {
    const path = await tempCachePath();
    const writer = new CheckParseCache(path);
    await writer.load();
    writer.set('abc', payload);
    await writer.save();

    const reader = new CheckParseCache(path);
    await reader.load();
    expect(reader.get('abc')).toEqual(payload);
  });

  it('creates parent directories when saving', async () => {
    const path = await tempCachePath();
    const cache = new CheckParseCache(path);
    await cache.load();
    cache.set('abc', payload);
    await cache.save();

    const onDisk = JSON.parse(await readFile(path, 'utf8')) as {
      version: number;
      entries: Record<string, CheckPayload>;
    };
    expect(onDisk.version).toBe(1);
    expect(onDisk.entries.abc).toEqual(payload);
  });

  it('does not write the file when nothing changed', async () => {
    const path = await tempCachePath();
    const cache = new CheckParseCache(path);
    await cache.load();
    await cache.save();
    await expect(readFile(path, 'utf8')).rejects.toThrow();
  });

  it('load is idempotent and only reads once', async () => {
    const path = await tempCachePath();
    const writer = new CheckParseCache(path);
    await writer.load();
    writer.set('abc', payload);
    await writer.save();

    const reader = new CheckParseCache(path);
    await reader.load();
    // A second load must not clobber in-memory state with a fresh disk read.
    reader.set('def', { ...payload, recipient: 'OTHER' });
    await reader.load();
    expect(reader.get('def')?.recipient).toBe('OTHER');
  });

  it('ignores a corrupt cache file', async () => {
    const path = await tempCachePath();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, '{ not valid json', 'utf8');
    const cache = new CheckParseCache(path);
    await cache.load();
    expect(cache.get('abc')).toBeUndefined();
  });

  it('ignores a cache file without an entries map', async () => {
    const path = await tempCachePath();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify({ version: 1 }), 'utf8');
    const cache = new CheckParseCache(path);
    await cache.load();
    expect(cache.get('abc')).toBeUndefined();
  });

  it('reuses entries when the signature matches', async () => {
    const path = await tempCachePath();
    const writer = new CheckParseCache(path, 'sig-v1');
    await writer.load();
    writer.set('abc', payload);
    await writer.save();

    const reader = new CheckParseCache(path, 'sig-v1');
    await reader.load();
    expect(reader.get('abc')).toEqual(payload);
  });

  it('discards entries written under a different signature', async () => {
    const path = await tempCachePath();
    const writer = new CheckParseCache(path, 'sig-v1');
    await writer.load();
    writer.set('abc', payload);
    await writer.save();

    const reader = new CheckParseCache(path, 'sig-v2');
    await reader.load();
    expect(reader.get('abc')).toBeUndefined();
  });

  it('ignores stored signatures when none is configured', async () => {
    const path = await tempCachePath();
    const writer = new CheckParseCache(path, 'sig-v1');
    await writer.load();
    writer.set('abc', payload);
    await writer.save();

    const reader = new CheckParseCache(path);
    await reader.load();
    expect(reader.get('abc')).toEqual(payload);
  });

  it('ignores a cache file with an unknown version', async () => {
    const path = await tempCachePath();
    const seed = new CheckParseCache(path);
    await seed.load();
    seed.set('abc', payload);
    await seed.save();
    await writeFile(
      path,
      JSON.stringify({ version: 999, entries: { abc: payload } }),
      'utf8',
    );

    const cache = new CheckParseCache(path);
    await cache.load();
    expect(cache.get('abc')).toBeUndefined();
  });
});
