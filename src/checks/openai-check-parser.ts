import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import dotenv from 'dotenv';
import type { CheckParser, ParsedCheck } from './check-parser.js';

interface OpenAiResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

export async function resolveOpenAiApiKey(
  env: NodeJS.ProcessEnv,
  dotEnvPath = '.env',
): Promise<string> {
  const direct = env.OPENAI_API_KEY?.trim();
  if (direct) return direct;
  const result = dotenv.config({ path: dotEnvPath });
  const fileKey = result.parsed?.OPENAI_API_KEY?.trim();
  if (fileKey) return fileKey;
  throw new Error('OPENAI_API_KEY is required in environment or .env');
}

function parseTimestampFromFileName(filePath: string): {
  date: string;
  time: string;
} {
  const base = basename(filePath, extname(filePath));
  const matched = /^(\d{4}-\d{2}-\d{2}) (\d{2})-(\d{2})-\d{2}$/.exec(base);
  if (!matched) return { date: '1970-01-01', time: '00:00' };
  return { date: matched[1], time: `${matched[2]}:${matched[3]}` };
}

function parseAmountMinor(value: string): bigint {
  const normalized = value.trim().replaceAll(',', '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Invalid check amount: ${value}`);
  }
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function extractJsonText(response: OpenAiResponse): string {
  if (!response.output_text) {
    const parts =
      response.output
        ?.flatMap((item) => item.content ?? [])
        .map((content) => content.text?.trim())
        .filter((value): value is string => Boolean(value)) ?? [];
    if (parts.length > 0) {
      return parts.join('\n');
    }
    throw new Error('OpenAI response did not contain output_text');
  }
  return response.output_text;
}

export class OpenAiCheckParser implements CheckParser {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async parseChecks(folderPath: string): Promise<ParsedCheck[]> {
    let entries: string[];
    try {
      entries = (await readdir(folderPath))
        .filter((value) => /\.(jpe?g|png)$/i.test(value))
        .sort();
    } catch {
      return [];
    }

    const result: ParsedCheck[] = [];
    for (const name of entries) {
      const filePath = join(folderPath, name);
      try {
        const image = await readFile(filePath);
        const parsed = await this.parseSingle(filePath, image);
        result.push(parsed);
      } catch (error) {
        result.push({
          filePath,
          recipient: '',
          recipientEnglish: '',
          amountMinor: 0n,
          date: '1970-01-01',
          time: '00:00',
          warnings: [
            `Failed to parse ${basename(filePath)}: ${(error as Error).message}`,
          ],
        });
      }
    }
    return result;
  }

  private async parseSingle(
    filePath: string,
    image: Buffer,
  ): Promise<ParsedCheck> {
    const timestamp = parseTimestampFromFileName(filePath);
    const base64 = image.toString('base64');
    const mime =
      extname(filePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    const response = await this.fetchImpl(
      'https://api.openai.com/v1/responses',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: 'Extract payment recipient and amount from this Thai check image. Return JSON: {"recipient":"...","recipient_english":"...","amount_thb":"123.45"}',
                },
                {
                  type: 'input_image',
                  image_url: `data:${mime};base64,${base64}`,
                },
              ],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'check_extract',
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  recipient: { type: 'string' },
                  recipient_english: { type: 'string' },
                  amount_thb: { type: 'string' },
                },
                required: ['recipient', 'recipient_english', 'amount_thb'],
              },
            },
          },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `OpenAI request failed for ${basename(filePath)}: ${response.status}`,
      );
    }
    const raw = (await response.json()) as OpenAiResponse;
    const jsonText = extractJsonText(raw)
      .replace(/^```json\s*/i, '')
      .replace(/```$/, '');
    const parsed = JSON.parse(jsonText) as {
      recipient: string;
      recipient_english: string;
      amount_thb: string;
    };
    return {
      filePath,
      recipient: parsed.recipient.trim(),
      recipientEnglish:
        parsed.recipient_english.trim() || parsed.recipient.trim(),
      amountMinor: parseAmountMinor(parsed.amount_thb),
      date: timestamp.date,
      time: timestamp.time,
      warnings: [],
    };
  }
}
