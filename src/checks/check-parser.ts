export interface ParsedCheck {
  filePath: string;
  recipient: string;
  recipientEnglish: string;
  amountMinor: bigint;
  date: string;
  time: string;
  warnings: string[];
}

export interface CheckParser {
  parseChecks(folderPath: string): Promise<ParsedCheck[]>;
}
