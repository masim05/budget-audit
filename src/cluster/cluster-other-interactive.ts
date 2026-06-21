import { saveClusterMapping, type ClusterConfig } from './cluster-config.js';
import type { ClusterReport } from './cluster-report.js';

export interface ClusterInteractiveIo {
  stdout: (value: string) => void;
  readLine: () => Promise<string>;
}

function formatAmount(minor: bigint): string {
  const whole = minor / 100n;
  const fraction = (minor % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

export async function promptClusterOtherAssignments(
  report: ClusterReport,
  config: ClusterConfig,
  configPath: string,
  io: ClusterInteractiveIo,
): Promise<void> {
  for (const receiver of report.otherRecipients) {
    io.stdout(`recipient: ${receiver.recipient}\n`);
    io.stdout(`recipient (english): ${receiver.recipientEnglish}\n`);
    io.stdout('transactions:\n');
    for (const tx of receiver.transactions) {
      io.stdout(` - ${tx.date}, ${formatAmount(tx.debit ?? 0n)} THB\n`);
    }
    io.stdout('what cluster is that?\n');
    config.clusters.forEach((cluster, index) => {
      io.stdout(`(${index + 1}) ${cluster}\n`);
    });
    while (true) {
      let input: string;
      try {
        input = (await io.readLine()).trim();
      } catch {
        // EOF or non-interactive input — skip this recipient
        break;
      }
      if (input === '') break;
      const selected = Number(input);
      if (
        Number.isInteger(selected) &&
        selected >= 1 &&
        selected <= config.clusters.length
      ) {
        const cluster = config.clusters[selected - 1];
        await saveClusterMapping(configPath, receiver.recipient, cluster);
        break;
      }
      io.stdout('invalid selection, try again\n');
    }
  }
}
