import { saveClusterConfig, type ClusterConfig } from './cluster-config.js';

export interface InteractiveClusteringOptions {
  configPath: string;
  config: ClusterConfig;
  receivers: Array<{
    normalizedReceiver: string;
    samples: Array<{
      transactionNumber: string;
      statementFile: string;
      checkFile: string | null;
    }>;
  }>;
  prompt: (question: string) => Promise<string>;
  runGit: (args: string[]) => Promise<void>;
}

export async function clusterOtherReceivers(
  options: InteractiveClusteringOptions,
): Promise<ClusterConfig> {
  const next = structuredClone(options.config);
  for (const receiver of options.receivers) {
    const firstChoice = await options.prompt(
      `Assign ${receiver.normalizedReceiver}`,
    );

    if (firstChoice === 'skip') {
      continue;
    }

    if (firstChoice.startsWith('create:')) {
      next.clusters.push(firstChoice.slice('create:'.length));

      // Prompt again for the actual assignment
      const assignChoice = await options.prompt(
        `Assign ${receiver.normalizedReceiver}`,
      );
      if (assignChoice.startsWith('assign:')) {
        next.mappings[receiver.normalizedReceiver] = assignChoice.slice(
          'assign:'.length,
        );
      }
    } else if (firstChoice.startsWith('assign:')) {
      next.mappings[receiver.normalizedReceiver] = firstChoice.slice(
        'assign:'.length,
      );
    }
  }
  await saveClusterConfig(options.configPath, next);
  await options.runGit(['git', 'add', options.configPath]);
  await options.runGit([
    'git',
    'commit',
    '-m',
    'chore: update cluster mappings',
  ]);
  return next;
}
