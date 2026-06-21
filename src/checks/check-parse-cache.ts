import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Raw OpenAI extraction payload for a single check image. These are the only
 * fields that require an API call; filename-derived fields (date, time,
 * warnings) are recomputed on every run and therefore not cached.
 */
export interface CheckPayload {
  recipient: string;
  recipient_english: string;
  amount_thb: string;
}

interface CacheFile {
  version: number;
  entries: Record<string, CheckPayload>;
}

const CACHE_VERSION = 1;

/**
 * On-disk cache of OpenAI check-parsing results keyed by image content hash.
 * Identical check images skip the OpenAI request on subsequent runs.
 */
export class CheckParseCache {
  private entries = new Map<string, CheckPayload>();
  private loaded = false;
  private dirty = false;

  constructor(private readonly cacheFilePath: string) {}

  /** Stable cache key for an image: the SHA-256 hex digest of its bytes. */
  static keyForImage(image: Buffer): string {
    return createHash('sha256').update(image).digest('hex');
  }

  /** Load entries from disk. Missing or unreadable caches start empty. */
  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    let raw: string;
    try {
      raw = await readFile(this.cacheFilePath, 'utf8');
    } catch {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as CacheFile;
      if (parsed.version !== CACHE_VERSION || !parsed.entries) return;
      this.entries = new Map(Object.entries(parsed.entries));
    } catch {
      /* Corrupt cache is ignored and rebuilt on the next save. */
    }
  }

  get(key: string): CheckPayload | undefined {
    return this.entries.get(key);
  }

  set(key: string, payload: CheckPayload): void {
    this.entries.set(key, payload);
    this.dirty = true;
  }

  /** Persist entries to disk. No-op when nothing changed since load. */
  async save(): Promise<void> {
    if (!this.dirty) return;
    const file: CacheFile = {
      version: CACHE_VERSION,
      entries: Object.fromEntries(this.entries),
    };
    await mkdir(dirname(this.cacheFilePath), { recursive: true });
    await writeFile(
      this.cacheFilePath,
      `${JSON.stringify(file, null, 2)}\n`,
      'utf8',
    );
    this.dirty = false;
  }
}
