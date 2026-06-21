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

function extractCheckTime(details: string): string | undefined {
  const matched = /\|\s*check\s+(\d{2}:\d{2})\s*$/i.exec(details);
  return matched?.[1];
}

function orderedClusters(clusters: string[]): string[] {
  const withoutOther = clusters.filter((cluster) => cluster !== 'other');
  return clusters.includes('other')
    ? ['other', ...withoutOther]
    : [...withoutOther];
}

export async function promptClusterOtherAssignments(
  report: ClusterReport,
  config: ClusterConfig,
  configPath: string,
  io: ClusterInteractiveIo,
): Promise<void> {
  const selectableClusters = orderedClusters(config.clusters);
  for (const receiver of report.otherRecipients) {
    io.stdout('>>>>>>>>\n');
    io.stdout(`recipient: ${receiver.recipient}\n`);
    io.stdout(`recipient (english): ${receiver.recipientEnglish}\n`);
    io.stdout('transactions:\n');
    for (const tx of receiver.transactions) {
      const checkTime = extractCheckTime(tx.details);
      const dateTime = checkTime ? `${tx.date} ${checkTime}` : tx.date;
      io.stdout(` - ${dateTime}, ${formatAmount(tx.debit ?? 0n)} THB\n`);
    }
    io.stdout('what cluster is that?\n');
    selectableClusters.forEach((cluster, index) => {
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
        selected <= selectableClusters.length
      ) {
        const cluster = selectableClusters[selected - 1];
        await saveClusterMapping(configPath, receiver.recipient, cluster);
        break;
      }
      io.stdout('invalid selection, try again\n');
    }
  }
}
