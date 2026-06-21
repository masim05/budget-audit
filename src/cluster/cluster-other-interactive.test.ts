import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadClusterConfig } from './cluster-config.js';
import { promptClusterOtherAssignments } from './cluster-other-interactive.js';
import type { ClusterReport } from './cluster-report.js';

describe('promptClusterOtherAssignments', () => {
  it('prints prompt and stores selected mapping', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-co-'));
    const configPath = join(folder, 'mapping.yml');
    const config = await loadClusterConfig(configPath);
    let stdout = '';
    const inputs = ['1'];
    const report: ClusterReport = {
      auditedFolder: '/tmp/s',
      checksFolder: '/tmp/c',
      dateRange: { from: '2026-06-01', to: '2026-06-15' },
      clusters: [],
      unmatchedReceivers: ['VELO CAFE'],
      otherRecipients: [
        {
          recipient: 'VELO CAFE',
          recipientEnglish: 'VELO CAFE',
          transactions: [
            {
              id: '1',
              date: '2026-06-01',
              transactionType: 'PMT',
              transactionNumber: '1',
              accountNumber: 'A',
              currency: 'THB',
              debit: 8500n,
              credit: 0n,
              creditAmd: 0n,
              debitAmd: 0n,
              remitterOrBeneficiary: 'VELO CAFE',
              details: 'mPhone',
              directionType: 'Outgoing',
              sourceFile: 'statement.pdf',
              classification: 'invalid',
            },
          ],
        },
      ],
      warnings: [],
    };

    await promptClusterOtherAssignments(report, config, configPath, {
      stdout: (value) => (stdout += value),
      readLine: async () => inputs.shift() ?? '',
    });

    const updated = await loadClusterConfig(configPath);
    expect(stdout).toContain('recipient: VELO CAFE');
    expect(updated.mappings['VELO CAFE']).toBe(config.clusters[0]);
  });

  it('re-prompts on invalid selection', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-co-'));
    const configPath = join(folder, 'mapping.yml');
    const config = await loadClusterConfig(configPath);
    let stdout = '';
    const inputs = ['abc', '999', '1'];
    const report: ClusterReport = {
      auditedFolder: '/tmp/s',
      checksFolder: '/tmp/c',
      dateRange: { from: '2026-06-01', to: '2026-06-15' },
      clusters: [],
      unmatchedReceivers: ['VELO CAFE'],
      otherRecipients: [
        {
          recipient: 'VELO CAFE',
          recipientEnglish: 'VELO CAFE',
          transactions: [
            {
              id: '1',
              date: '2026-06-01',
              transactionType: 'PMT',
              transactionNumber: '1',
              accountNumber: 'A',
              currency: 'THB',
              debit: undefined,
              credit: 8500n,
              creditAmd: 0n,
              debitAmd: 0n,
              remitterOrBeneficiary: 'VELO CAFE',
              details: 'mPhone',
              directionType: 'Incoming',
              sourceFile: 'statement.pdf',
              classification: 'invalid',
            },
          ],
        },
      ],
      warnings: [],
    };

    await promptClusterOtherAssignments(report, config, configPath, {
      stdout: (value) => (stdout += value),
      readLine: async () => inputs.shift() ?? '',
    });

    expect(stdout).toContain('invalid selection');
    expect(stdout).toContain('0.00 THB');
    const updated = await loadClusterConfig(configPath);
    expect(updated.mappings['VELO CAFE']).toBe(config.clusters[0]);
  });

  it('skips recipient when readLine throws (EOF / non-interactive)', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-co-'));
    const configPath = join(folder, 'mapping.yml');
    const config = await loadClusterConfig(configPath);
    let stdout = '';
    const report: ClusterReport = {
      auditedFolder: '/tmp/s',
      checksFolder: '/tmp/c',
      dateRange: { from: '2026-06-01', to: '2026-06-15' },
      clusters: [],
      unmatchedReceivers: ['VELO CAFE'],
      otherRecipients: [
        {
          recipient: 'VELO CAFE',
          recipientEnglish: 'VELO CAFE',
          transactions: [],
        },
      ],
      warnings: [],
    };

    await promptClusterOtherAssignments(report, config, configPath, {
      stdout: (value) => (stdout += value),
      readLine: async () => {
        throw new Error('EOF');
      },
    });

    expect(stdout).toContain('recipient: VELO CAFE');
    const unchanged = await loadClusterConfig(configPath);
    expect(unchanged.mappings['VELO CAFE']).toBeUndefined();
  });

  it('breaks on empty input (user skips)', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cluster-co-'));
    const configPath = join(folder, 'mapping.yml');
    const config = await loadClusterConfig(configPath);
    const report: ClusterReport = {
      auditedFolder: '/tmp/s',
      checksFolder: '/tmp/c',
      dateRange: { from: '2026-06-01', to: '2026-06-15' },
      clusters: [],
      unmatchedReceivers: ['VELO CAFE'],
      otherRecipients: [
        {
          recipient: 'VELO CAFE',
          recipientEnglish: 'VELO CAFE',
          transactions: [],
        },
      ],
      warnings: [],
    };

    await promptClusterOtherAssignments(report, config, configPath, {
      stdout: () => undefined,
      readLine: async () => '',
    });

    const unchanged = await loadClusterConfig(configPath);
    expect(unchanged.mappings['VELO CAFE']).toBeUndefined();
  });
});
