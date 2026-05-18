# Research: CLI Help and Aliases

## Decision: Use Node parseArgs alias support for short options

**Rationale**: The CLI already uses `node:util` `parseArgs`, so the smallest reliable change is to add `short` aliases to the existing option definitions. This keeps parsing inside the current CLI adapter, avoids adding dependencies, and preserves long-option behavior.

**Alternatives considered**: Adding a CLI framework was rejected because the feature is small and the constitution favors simple readable code. Manual argv rewriting was rejected because it would duplicate parser behavior already available in the standard library.

## Decision: Treat help as an early successful CLI response

**Rationale**: Help is guidance, not an audit request. Returning the help message before date defaults, statement source construction, or report writing proves `npm run audit -- -h` works even without statement inputs and prevents accidental business logic changes.

**Alternatives considered**: Letting help flow through normal audit validation was rejected because it would require data folders for help output. Printing help only after failed validation was rejected because help should be deterministic and successful.

## Decision: Keep help text deterministic and owned by the CLI adapter

**Rationale**: Tests can assert required option names, aliases, and command usage when the help text is stable. Keeping it in the CLI adapter matches the current architecture: terminal-facing presentation belongs at the edge.

**Alternatives considered**: Generating help from a third-party framework was rejected because it adds dependency weight. Building a generic help renderer was rejected because there is one command and a small option set.

## Decision: Verify aliases through observable equivalence

**Rationale**: The feature promises no business logic change. Tests should compare short-option invocations with their long-option equivalents through exit codes, output files, and report content rather than reaching into parser internals.

**Alternatives considered**: Unit-testing parser internals alone was rejected because it would not prove CLI contract behavior. Updating existing tests was rejected because the requirement explicitly says existing tests must not change.
