import { describe, expect, it } from 'vitest';
import { JsonReportWriter } from './json-report-writer.js';
import { sampleReport } from './sample-report.test-helper.js';

describe('audit report contract', () => {
  it('uses snake_case JSON fields expected by the contract', () => {
    const json = JSON.parse(new JsonReportWriter().write(sampleReport()));
    expect(Object.keys(json)).toEqual([
      'audited_folder',
      'date_range',
      'matching_mode',
      'account_currencies_found',
      'totals',
      'processed_files',
      'excluded_internal_transfers',
      'excluded_internal_conversions',
      'warnings',
    ]);
  });
});
