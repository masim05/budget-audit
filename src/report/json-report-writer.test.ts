import { describe, expect, it } from 'vitest';
import { JsonReportWriter } from './json-report-writer.js';
import { sampleReport } from './sample-report.test-helper.js';

describe('JSON report writer', () => {
  it('renders the audit report contract shape', () => {
    const json = JSON.parse(new JsonReportWriter().write(sampleReport()));
    expect(json.totals.income_usd).toBe('10.00');
    expect(json.processed_files[0].transactions_read).toBe(1);
    expect(json.excluded_internal_transfers[0].match_id).toBe('transfer-1');
  });
});
