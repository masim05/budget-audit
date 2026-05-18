import { basename } from 'node:path';

export interface InputDiagnosticIssue {
  filePath: string;
  reason: string;
  expected?: string;
  received?: string;
}

export function formatInputDiagnostics(issues: InputDiagnosticIssue[]): string {
  const lines = [
    'Input error: statement folder contains unsupported files.',
    '',
    'Unsupported files:',
  ];

  for (const issue of issues) {
    lines.push(`- ${basename(issue.filePath)}: ${issue.reason}`);
    if (issue.expected !== undefined)
      lines.push(`  Expected: ${issue.expected}`);
    if (issue.received !== undefined)
      lines.push(`  Received: ${issue.received}`);
  }

  return lines.join('\n');
}
