import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { clusterOtherReceivers } from './interactive-clustering.js';

describe('interactive clustering', () => {
  it('persists new assignments and auto-commits config changes', async () => {
    const folder = join(
      process.cwd(),
      'test-output',
      'interactive-clustering-test-' + Date.now(),
    );
    await mkdir(folder, { recursive: true });
    const configPath = join(folder, 'clusters.yml');
    await writeFile(
      configPath,
      'mappings: {}\npatterns: []\nclusters:\n  - "Other"\n',
      'utf8',
    );

    const runGit = vi.fn().mockResolvedValue(undefined);
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('create:food')
      .mockResolvedValueOnce('assign:food');

    const updated = await clusterOtherReceivers({
      configPath,
      config: { mappings: {}, patterns: [], clusters: ['Other'] },
      receivers: [
        {
          normalizedReceiver: 'CAFE MARKET',
          samples: [
            {
              transactionNumber: '1001',
              statementFile: 'TH_THB_1001.csv',
              checkFile: '1001-slip.jpg',
            },
          ],
        },
      ],
      prompt,
      runGit,
    });

    expect(updated.mappings['CAFE MARKET']).toBe('food');
    expect(runGit).toHaveBeenCalledWith(['git', 'add', configPath]);
    expect(runGit).toHaveBeenCalledWith([
      'git',
      'commit',
      '-m',
      'chore: update cluster mappings',
    ]);
  });

  it('includes transaction and check context in prompts', async () => {
    const folder = join(
      process.cwd(),
      'test-output',
      'interactive-clustering-context-' + Date.now(),
    );
    await mkdir(folder, { recursive: true });
    const configPath = join(folder, 'clusters.yml');
    await writeFile(
      configPath,
      'mappings: {}\npatterns: []\nclusters:\n  - "Other"\n',
      'utf8',
    );

    const runGit = vi.fn().mockResolvedValue(undefined);
    const promptCalls: string[] = [];
    const prompt = vi.fn().mockImplementation((question: string) => {
      promptCalls.push(question);
      return Promise.resolve('skip');
    });

    await clusterOtherReceivers({
      configPath,
      config: { mappings: {}, patterns: [], clusters: ['Other'] },
      receivers: [
        {
          normalizedReceiver: 'TEST VENDOR',
          samples: [
            {
              transactionNumber: '2001',
              statementFile: 'TH_THB_2001.csv',
              checkFile: '2001-slip.jpg',
            },
            {
              transactionNumber: '2002',
              statementFile: 'TH_THB_2002.csv',
              checkFile: null,
            },
          ],
        },
      ],
      prompt,
      runGit,
    });

    expect(promptCalls).toHaveLength(1);
    const promptText = promptCalls[0];
    expect(promptText).toContain('Receiver: TEST VENDOR');
    expect(promptText).toContain('Samples:');
    expect(promptText).toContain('Txn 2001 (TH_THB_2001.csv) [check: 2001-slip.jpg]');
    expect(promptText).toContain('Txn 2002 (TH_THB_2002.csv)');
  });

  it('skips receivers with skip action', async () => {
    const folder = join(
      process.cwd(),
      'test-output',
      'interactive-clustering-skip-' + Date.now(),
    );
    await mkdir(folder, { recursive: true });
    const configPath = join(folder, 'clusters.yml');
    await writeFile(
      configPath,
      'mappings: {}\npatterns: []\nclusters:\n  - "Other"\n',
      'utf8',
    );

    const runGit = vi.fn().mockResolvedValue(undefined);
    const prompt = vi.fn().mockResolvedValueOnce('skip');

    const updated = await clusterOtherReceivers({
      configPath,
      config: { mappings: {}, patterns: [], clusters: ['Other'] },
      receivers: [
        {
          normalizedReceiver: 'UNKNOWN VENDOR',
          samples: [
            {
              transactionNumber: '2001',
              statementFile: 'TH_THB_2001.csv',
              checkFile: null,
            },
          ],
        },
      ],
      prompt,
      runGit,
    });

    expect(updated.mappings['UNKNOWN VENDOR']).toBeUndefined();
    // Since we skipped, the config didn't change, so no git operations
    expect(runGit).not.toHaveBeenCalled();
  });

  it('creates cluster and assigns in single flow', async () => {
    const folder = join(
      process.cwd(),
      'test-output',
      'interactive-clustering-create-' + Date.now(),
    );
    await mkdir(folder, { recursive: true });
    const configPath = join(folder, 'clusters.yml');
    await writeFile(
      configPath,
      'mappings: {}\npatterns: []\nclusters:\n  - "Other"\n',
      'utf8',
    );

    const runGit = vi.fn().mockResolvedValue(undefined);
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('create:groceries')
      .mockResolvedValueOnce('assign:groceries');

    const updated = await clusterOtherReceivers({
      configPath,
      config: { mappings: {}, patterns: [], clusters: ['Other'] },
      receivers: [
        {
          normalizedReceiver: 'BIG C SUPERMARKET',
          samples: [
            {
              transactionNumber: '3001',
              statementFile: 'TH_THB_3001.csv',
              checkFile: null,
            },
          ],
        },
      ],
      prompt,
      runGit,
    });

    expect(updated.clusters).toContain('groceries');
    expect(updated.mappings['BIG C SUPERMARKET']).toBe('groceries');
  });

  it('assigns directly to existing cluster', async () => {
    const folder = join(
      process.cwd(),
      'test-output',
      'interactive-clustering-direct-' + Date.now(),
    );
    await mkdir(folder, { recursive: true });
    const configPath = join(folder, 'clusters.yml');
    await writeFile(
      configPath,
      'mappings: {}\npatterns: []\nclusters:\n  - "Other"\n  - "transport"\n',
      'utf8',
    );

    const runGit = vi.fn().mockResolvedValue(undefined);
    const prompt = vi.fn().mockResolvedValueOnce('assign:transport');

    const updated = await clusterOtherReceivers({
      configPath,
      config: { mappings: {}, patterns: [], clusters: ['Other', 'transport'] },
      receivers: [
        {
          normalizedReceiver: 'TAXI SERVICE',
          samples: [
            {
              transactionNumber: '4001',
              statementFile: 'TH_THB_4001.csv',
              checkFile: null,
            },
          ],
        },
      ],
      prompt,
      runGit,
    });

    expect(updated.mappings['TAXI SERVICE']).toBe('transport');
    expect(updated.clusters).toContain('transport');
    expect(updated.clusters).not.toContain('create');
  });

  it('does not commit when all receivers are skipped', async () => {
    const folder = join(
      process.cwd(),
      'test-output',
      'interactive-clustering-all-skip-' + Date.now(),
    );
    await mkdir(folder, { recursive: true });
    const configPath = join(folder, 'clusters.yml');
    await writeFile(
      configPath,
      'mappings: {}\npatterns: []\nclusters:\n  - "Other"\n',
      'utf8',
    );

    const runGit = vi.fn().mockResolvedValue(undefined);
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('skip')
      .mockResolvedValueOnce('skip');

    const updated = await clusterOtherReceivers({
      configPath,
      config: { mappings: {}, patterns: [], clusters: ['Other'] },
      receivers: [
        {
          normalizedReceiver: 'VENDOR ONE',
          samples: [
            {
              transactionNumber: '5001',
              statementFile: 'TH_THB_5001.csv',
              checkFile: null,
            },
          ],
        },
        {
          normalizedReceiver: 'VENDOR TWO',
          samples: [
            {
              transactionNumber: '5002',
              statementFile: 'TH_THB_5002.csv',
              checkFile: null,
            },
          ],
        },
      ],
      prompt,
      runGit,
    });

    expect(Object.keys(updated.mappings)).toHaveLength(0);
    expect(runGit).not.toHaveBeenCalled();
  });
});
