# Design: `cluster` command (npm run cluster)

Summary
-------
Adds a `cluster` CLI command to group external spend transactions into human-friendly clusters (categories) by payment receiver. The command supports deterministic YAML mapping, fuzzy fallback, and interactive clustering for unmatched receivers.

Worktree
--------
All work and commits are on branch `004-spend-categories` inside the worktree at `.worktrees/004-spend-categories`.

Goals
-----
- Provide spend-by-cluster summaries in human-readable text.
- Allow verbose listing of payments per cluster.
- Maintain a tracked, editable mapping of receiver → cluster.
- Support interactive assignment for unmatched receivers and persist updates.

CLI
---
npm script: `cluster` (runs `node dist/cli/main.js cluster` or similar)
Options:
- -sf, --statements-folder <path>  (default: data/statements)
- -cf, --checks-folder <path>      (default: data/checks)
- -f, --from <date>                (same format as `audit`)
- -t, --to <date>
- -v, --verbose                    (show payments per cluster)
- -co, --cluster-other             (interactive mode: cluster receivers currently mapped to "Other")
- -a, --approach <1|2|d|h>         (1/d = deterministic YAML-only; 2/h = hybrid YAML + fuzzy + interactive)

Mapping storage
---------------
Path: `config/clusters.yml` (YAML), tracked in git. Format:

```yaml
# receiver normalisation rules and direct mappings
mappings:
  "COMPANY LTD": "Дом"
  "OIL STATION #12": "бензин + мойка"
patterns:
  - pattern: "/^CAF?E/i"
    cluster: "кафе/рестораны"
```

Behavior
--------
Approach modes:
- Deterministic: normalize receiver string -> exact lookup in mappings -> cluster or Other.
- Hybrid: deterministic lookup; if no match, run fuzzy matching/token similarity; still if unmatched, mark as Other.

Interactive (-co):
- Present list of receivers currently assigned to Other (or unmatched). For each selected receiver show: sample transactions (date, time, amount, statement filename, check filename if available), and allow:
  - assign to existing cluster
  - create new cluster and assign
  - skip (leave as Other)
- When assigning, persist to `config/clusters.yml` and auto-commit the file (no remote push).

Output
------
Human readable summary grouped by cluster with totals in base currency (THB). With `-v`, list each transaction under its cluster as `YYYY-MM-DD HH:MM — <amount> — <receiver> — <statement>`.

Help & README
-------------
- Update `README.md` adding usage examples for `npm run cluster` with exemplar commands and explanation of `config/clusters.yml` location and format.
- Implement CLI help message: `budget-audit cluster --help` to document options and examples.

Testing
-------
- Unit tests for normalization, deterministic lookup, and fuzzy matcher.
- Integration test that runs `cluster` against sample statements in `tests/fixtures` and asserts cluster totals and sample output format.

Migration & UX notes
--------------------
- Default clusters should be case-insensitive normalized strings; consider transliteration/Unicode normalization for non-Latin receivers.
- Create `config/clusters.example.yml` as a template for users.

Next steps
----------
1. Implement CLI scaffolding and add `cluster` command (writing-plans will flesh tasks).
2. Implement mapping loader and matching functions.
3. Implement interactive clustering and persistence.
4. Update README and CLI help messages.
5. Add tests and run CI locally.

