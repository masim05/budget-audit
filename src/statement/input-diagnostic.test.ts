import { describe, expect, it } from 'vitest';
import { formatInputDiagnostics } from './input-diagnostic.js';
import { expectedStatementHeader } from './supported-statement-format.js';

describe('input diagnostics', () => {
  it('formats grouped file diagnostics across readable lines', () => {
    const output = formatInputDiagnostics([
      {
        filePath: '/tmp/bad-header.csv',
        reason: 'unsupported CSV header',
        expected: expectedStatementHeader(),
        received: 'Posted Date,Description,Amount',
      },
      {
        filePath: '/tmp/card-export.csv',
        reason: 'unsupported filename',
        expected: 'Filename containing `_AMD_` or `_USD_`',
        received: 'card-export.csv',
      },
    ]);

    expect(output).toContain(
      'Input error: statement folder contains unsupported files.',
    );
    expect(output).toContain('- bad-header.csv: unsupported CSV header');
    expect(output).toContain(`  Expected: ${expectedStatementHeader()}`);
    expect(output).toContain('  Received: Posted Date,Description,Amount');
    expect(output).toContain('- card-export.csv: unsupported filename');
    expect(output).toContain('`_AMD_` or `_USD_`');
    expect(output.split('\n').length).toBeGreaterThan(5);
  });
});
