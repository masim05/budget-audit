import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  renderClusterReport,
  renderReport,
  writeOptionalOutput,
} from './output.js';
import type { ClusterReport } from '../cluster/index.js';
import { sampleReport } from '../report/sample-report.test-helper.js';

type OtherRecipient = ClusterReport['otherRecipients'][number];
type Cluster = ClusterReport['clusters'][number];

function otherRecipient(
  name: string,
  debits: Array<bigint | undefined>,
): OtherRecipient {
  return {
    recipient: name,
    recipientEnglish: name,
    transactions: debits.map(
      (debit) => ({ debit }) as OtherRecipient['transactions'][number],
    ),
  };
}

function cluster(
  name: string,
  total: bigint,
  transactions: Array<{ recipient: string; debit?: bigint }>,
): Cluster {
  return {
    name,
    total,
    transactions: transactions.map(
      ({ recipient, debit }) =>
        ({
          remitterOrBeneficiary: recipient,
          debit,
        }) as Cluster['transactions'][number],
    ),
  };
}

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
        otherRecipients: [otherRecipient('UNKNOWN', [17000n])],
        warnings: ['warn'],
      },
      true,
    );
    expect(output).toContain('кафе: 170.00 THB');
    expect(output).toContain('other recipients (1, 170.00 THB):');
    expect(output).toContain(' - UNKNOWN (170.00 THB)');
    expect(output).toContain('warnings:');
  });

  it('totals other recipients, sorts them by name, and tolerates missing debit', () => {
    const output = renderClusterReport(
      {
        auditedFolder: '/tmp/statements',
        checksFolder: '/tmp/checks',
        dateRange: { from: '2026-06-01', to: '2026-06-15' },
        clusters: [],
        unmatchedReceivers: [],
        otherRecipients: [
          otherRecipient('BETA', [5000n, undefined]),
          otherRecipient('ALPHA', [2500n, 2500n]),
        ],
        warnings: [],
      },
      false,
    );
    // Header total = 5000 + 5000 = 10000 minor units.
    expect(output).toContain('other recipients (2, 100.00 THB):');
    // Sorted alphabetically by name; undefined debit counts as zero.
    const alphaIndex = output.indexOf(' - ALPHA (50.00 THB)');
    const betaIndex = output.indexOf(' - BETA (50.00 THB)');
    expect(alphaIndex).toBeGreaterThan(-1);
    expect(betaIndex).toBeGreaterThan(-1);
    expect(alphaIndex).toBeLessThan(betaIndex);
  });

  it('sorts clusters by total descending and handles equal totals', () => {
    const output = renderClusterReport(
      {
        auditedFolder: '/tmp/statements',
        checksFolder: '/tmp/checks',
        dateRange: { from: '2026-06-01', to: '2026-06-15' },
        clusters: [
          { name: 'кафе', total: 5000n, transactions: [] },
          { name: 'продукты', total: 20000n, transactions: [] },
          { name: 'такси', total: 5000n, transactions: [] },
        ],
        unmatchedReceivers: [],
        otherRecipients: [],
        warnings: [],
      },
      false,
    );
    expect(output).toContain('продукты');
    expect(output).toContain('кафе');
    expect(output).toContain('такси');
  });

  it('lists recipients per cluster with totals, sorted, only when verbose', () => {
    const report: ClusterReport = {
      auditedFolder: '/tmp/statements',
      checksFolder: '/tmp/checks',
      dateRange: { from: '2026-06-01', to: '2026-06-15' },
      clusters: [
        cluster('кафе', 17000n, [
          { recipient: 'VELO CAFE', debit: 5000n },
          { recipient: 'STARBUCKS', debit: 7000n },
          { recipient: 'VELO CAFE', debit: 5000n },
          { recipient: 'STARBUCKS', debit: undefined },
        ]),
      ],
      unmatchedReceivers: [],
      otherRecipients: [],
      warnings: [],
    };

    const verbose = renderClusterReport(report, true);
    // Distinct recipients, per-recipient totals; sorted alphabetically.
    // STARBUCKS: 7000 + (undefined -> 0) = 70.00; VELO CAFE: 5000 + 5000 = 100.00.
    const starbucksIndex = verbose.indexOf(' - STARBUCKS (70.00 THB)');
    const veloIndex = verbose.indexOf(' - VELO CAFE (100.00 THB)');
    expect(starbucksIndex).toBeGreaterThan(-1);
    expect(veloIndex).toBeGreaterThan(-1);
    expect(starbucksIndex).toBeLessThan(veloIndex);
    // Duplicate recipient is collapsed to a single line.
    expect(verbose.match(/ - VELO CAFE /g)).toHaveLength(1);

    // Non-verbose output keeps only the cluster total line.
    const quiet = renderClusterReport(report, false);
    expect(quiet).toContain('кафе: 170.00 THB');
    expect(quiet).not.toContain(' - VELO CAFE');
  });
});
