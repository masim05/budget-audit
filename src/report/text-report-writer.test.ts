import { describe, expect, it } from 'vitest';
import { TextReportWriter } from './text-report-writer.js';
import { sampleReport } from './sample-report.test-helper.js';

describe('text report writer', () => {
  it('renders required text report sections', () => {
    const text = new TextReportWriter().write(sampleReport());
    expect(text).toContain('Audited folder: ./data');
    expect(text).toContain('USD income total: 10.00');
    expect(text).toContain('Excluded internal transfers: 1');
    expect(text).toContain('Warnings:');
  });

  it('renders empty summaries clearly', () => {
    const text = new TextReportWriter().write({
      ...sampleReport(),
      accountCurrenciesFound: [],
      processedFiles: [],
      warnings: [],
    });
    expect(text).toContain('Account currencies found: None');
    expect(text).toContain('No files processed');
    expect(text).toContain('Warnings:\nNone');
  });
});
