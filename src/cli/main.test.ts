import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  renderClusterReport,
  renderReport,
  writeOptionalOutput,
} from './output.js';
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

  it('renders cluster reports with totals and unmatched recipients', () => {
    const output = renderClusterReport(
      {
        auditedFolder: '/tmp/statements',
        checksFolder: '/tmp/checks',
        dateRange: { from: '2026-06-01', to: '2026-06-15' },
        clusters: [{ name: 'кафе', total: 17000n, transactions: [] }],
        unmatchedReceivers: ['UNKNOWN'],
        otherRecipients: [],
        warnings: ['warn'],
      },
      true,
    );
    expect(output).toContain('кафе: 170.00 THB');
    expect(output).toContain('other recipients');
    expect(output).toContain('warnings:');
  });

  it('sorts clusters by total descending', () => {
    const output = renderClusterReport(
      {
        auditedFolder: '/tmp/statements',
        checksFolder: '/tmp/checks',
        dateRange: { from: '2026-06-01', to: '2026-06-15' },
        clusters: [
          { name: 'кафе', total: 5000n, transactions: [] },
          { name: 'продукты', total: 20000n, transactions: [] },
          { name: 'такси', total: 1000n, transactions: [] },
        ],
        unmatchedReceivers: [],
        otherRecipients: [],
        warnings: [],
      },
      false,
    );
    const pos1 = output.indexOf('продукты');
    const pos2 = output.indexOf('кафе');
    const pos3 = output.indexOf('такси');
    expect(pos1).toBeLessThan(pos2);
    expect(pos2).toBeLessThan(pos3);
  });
});
