import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('project constraints', () => {
  it('does not declare database or MCP runtime dependencies', async () => {
    const pkg = JSON.parse(await readFile('package.json', 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencies = Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
    }).join(' ');
    expect(dependencies).not.toMatch(/sqlite|postgres|mysql|mongodb|mcp/i);
  });
});
