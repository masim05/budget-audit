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
  let changed = false;

  for (const receiver of options.receivers) {
    // Build context info for the prompt
    const sampleInfo = options.receivers.find(
      (r) => r.normalizedReceiver === receiver.normalizedReceiver,
    );
    let contextLines = [`\nReceiver: ${receiver.normalizedReceiver}`];
    
    if (sampleInfo && sampleInfo.samples.length > 0) {
      contextLines.push('Samples:');
      for (const sample of sampleInfo.samples) {
        contextLines.push(
          `  - Txn ${sample.transactionNumber} (${sample.statementFile})${sample.checkFile ? ` [check: ${sample.checkFile}]` : ''}`,
        );
      }
    }
    
    const promptText = `${contextLines.join('\n')}\nAssign ${receiver.normalizedReceiver}`;

    const firstChoice = await options.prompt(promptText);

    if (firstChoice === 'skip') {
      continue;
    }

    if (firstChoice.startsWith('create:')) {
      next.clusters.push(firstChoice.slice('create:'.length));
      changed = true;

      // Prompt again for the actual assignment
      const assignChoice = await options.prompt(
        `Assign ${receiver.normalizedReceiver}`,
      );
      if (assignChoice.startsWith('assign:')) {
        const targetCluster = assignChoice.slice('assign:'.length);
        if (!next.clusters.includes(targetCluster)) {
          throw new Error(`Unknown cluster: ${targetCluster}`);
        }
        next.mappings[receiver.normalizedReceiver] = targetCluster;
      }
    } else if (firstChoice.startsWith('assign:')) {
      const targetCluster = firstChoice.slice('assign:'.length);
      if (!next.clusters.includes(targetCluster)) {
        throw new Error(`Unknown cluster: ${targetCluster}`);
      }
      next.mappings[receiver.normalizedReceiver] = targetCluster;
      changed = true;
    }
  }

  // Only persist and commit if there were actual changes
  if (changed) {
    await saveClusterConfig(options.configPath, next);
    await options.runGit(['git', 'add', options.configPath]);
    await options.runGit([
      'git',
      'commit',
      '-m',
      'chore: update cluster mappings',
    ]);
  }

  return next;
}
