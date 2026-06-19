import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test-helper.ts',
        'src/**/index.ts',
        'src/audit/audit-report.ts',
        'src/audit/audit-run.ts',
        'src/internal-movement/internal-match.ts',
        'src/statement/statement-file.ts',
        'src/transaction/transaction.ts',
        'src/cluster/cluster-report.ts',
      ],
      thresholds: {
        lines: 98,
        functions: 98,
        branches: 98,
        statements: 98,
      },
    },
  },
});
