import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderReport, writeOptionalOutput } from './output.js';
import { sampleReport } from '../report/sample-report.test-helper.js';

describe('CLI output helpers', () => {
  it('renders text and JSON formats', () => {
    expect(renderReport(sampleReport(), 'text')).toContain('USD income total');
    expect(JSON.parse(renderReport(sampleReport(), 'json')).matching_mode).toBe(
      'strict',
    );
  });

  it('writes optional report files when requested', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'budget-audit-'));
    const path = join(folder, 'reports', 'audit.txt');
    await writeOptionalOutput(undefined, 'ignored');
    await writeOptionalOutput(path, 'report');
    expect(await readFile(path, 'utf8')).toBe('report');
  });
});
