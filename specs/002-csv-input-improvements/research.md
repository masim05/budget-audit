# Research: CSV Input Improvements

## Decision: Normalize only leading UTF-8 BOM markers in the first header column

**Rationale**: The current local sample exports visibly match the required header but contain repeated UTF-8 BOM bytes before `Date`. Stripping leading BOM markers from the first parsed header cell fixes the real failure without loosening the CSV contract for other columns or reordered fields.

**Alternatives considered**:

- Trim whitespace and BOM markers from every column: rejected because it could hide malformed exports and make diagnostics less precise.
- Accept aliases or reordered columns: rejected because the feature only needs the current export family and exact column semantics protect audit correctness.
- Preprocess raw file text globally: rejected because normalization belongs at the parsed-header comparison point and should not alter row content.

## Decision: Require `_AMD_` or `_USD_` filename markers for supported CSV files

**Rationale**: The existing currency inference depends on filename markers, and the clarified requirement makes a file unsupported unless its currency can be determined from `_AMD_` or `_USD_`. This prevents files with correct-looking columns but unknown currency from silently entering totals or warning paths.

**Alternatives considered**:

- Header-only support with `UNKNOWN` currency: rejected by clarification because supported CSVs must include a filename currency marker.
- Match `AMD` or `USD` anywhere in the filename: rejected because anchored markers reduce false positives in unrelated filenames.
- Add a CLI currency override: rejected as extra scope for a minor input-format improvement.

## Decision: Treat any unsupported file in the statement folder as a blocker

**Rationale**: The user explicitly clarified that unsupported files should fail the run. This prevents silent omission of files and reinforces the statement folder as a curated audit input boundary.

**Alternatives considered**:

- Ignore non-CSV files and reject unsupported CSVs only: rejected by clarification.
- Warn but continue: rejected because totals could be incomplete without strong user attention.
- Move unsupported files aside automatically: rejected because the tool should not mutate user statement folders.

## Decision: Render unsafe input diagnostics as grouped multi-line messages

**Rationale**: Current single-line diagnostics are unreadable when several files fail. A grouped message with one bullet or line per file keeps terminal output useful while preserving exit code behavior.

**Alternatives considered**:

- Keep one long error string: rejected due poor usability.
- Write a separate error report file: rejected as unnecessary for CLI diagnostics.
- Only show the first file failure: rejected because users need to fix all blockers in one pass.

## Decision: Use `./data/statements` as the default input folder

**Rationale**: A dedicated default folder separates statement inputs from other local data artifacts and makes unsupported-file blocking practical. Explicit `--data-dir` remains available for other layouts.

**Alternatives considered**:

- Continue defaulting to `./data`: rejected because the folder may contain non-statement artifacts.
- Require `--data-dir` every time: rejected because the CLI already has a default-audit workflow.
- Auto-discover `./data` vs `./data/statements`: rejected because deterministic defaults are clearer and easier to test.
