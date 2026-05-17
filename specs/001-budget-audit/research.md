# Research: Budget Audit

## Decision: Node.js 22 CLI using TypeScript and standard-library runtime components

**Rationale**: Node.js keeps the CLI lightweight, ships a strong standard library for filesystem traversal, streams, JSON, and command-line argument parsing, and pairs well with TypeScript for clear domain models and future web-interface reuse. Runtime parsing and formatting can stay dependency-light while exact money arithmetic is represented with integer minor units. A standard-library runtime avoids unnecessary dependencies and keeps the clean-code teaching surface small.

**Alternatives considered**:

- JavaScript without TypeScript: viable for a small CLI, but weaker for documenting ports, adapters, and domain models.
- Rust: excellent correctness profile, but higher demo complexity and more boilerplate for this small audit tool.
- Shell scripts: too weak for domain modeling, robust parsing, and testable transfer matching.

## Decision: No runtime database; local files only

**Rationale**: The feature reads CSV statements from `./data` by default and can produce a report directly to stdout. No persistent application state is required for v1. If a future story needs saved outputs or configuration, it should use service files such as JSON or CSV at the adapter edge, not a database.

**Alternatives considered**:

- SQLite: unnecessary for a simple demo and conflicts with the user's no-DB constraint.
- In-memory only: acceptable for v1 execution, but file adapters remain useful for statement input, fixtures, and optional report export.
- Cloud storage: outside scope and violates the simple reproducible demo intent.

## Decision: Hexagonal layout with CSV and CLI as inbound adapters

**Rationale**: The constitution requires CLI-first delivery while preserving future web interface support. Core audit behavior will expose use cases independent of CLI formatting. The CSV statement source is an adapter behind an input boundary so a future bank API adapter can provide the same normalized transactions without changing the core.

**Alternatives considered**:

- Put parsing and auditing in a single CLI script: simpler initially, but would couple domain behavior to terminal concerns and make future web support harder.
- Build a web-ready service layer now: premature for v1 and less suitable for a simple CLI demo.

## Decision: Strict CSV header contract with exact minor-unit money parsing

**Rationale**: The clarified CSV header is fixed as `Date,Transaction Type,Transaction Number,Account Number,Credit,Debit,Credit(AMD),Debit(AMD),Remitter/Beneficiary,Details,Type`. Strict validation catches export drift early. `Credit` and `Debit` contain original AMD or USD amounts, while `Credit(AMD)` and `Debit(AMD)` are always AMD-normalized. Amounts should be parsed into exact integer minor units to avoid floating-point errors in financial totals.

**Alternatives considered**:

- Configurable column mapping: flexible, but adds setup complexity before there is evidence of multiple formats.
- Accept any similar header: convenient, but risks silently misreading bank exports.

## Decision: Final totals reported in USD using AMD-normalized CSV columns

**Rationale**: The user clarified that everything should be reported in USD. The CSV includes AMD-normalized credit/debit columns, so the audit can aggregate in AMD first and then convert the final totals to USD once the AMD-to-USD conversion rule is specified. Original amounts still remain part of the normalized transaction for matching and diagnostics.

**Alternatives considered**:

- Report per-currency totals: superseded by clarification.
- Fetch exchange rates: introduces external dependencies and is outside the no-network local demo direction.
- Require account currency configuration: unnecessary for the clarified final report, though account currency may still be inferred for warnings.

## Decision: Vitest coverage, ESLint, and Prettier for development quality

**Rationale**: The project requires comprehensive unit coverage with a CI gate of at least 98%. Vitest supports concise TypeScript unit and contract tests, V8 coverage enforces the branch coverage gate, ESLint catches code-quality issues, and Prettier keeps formatting predictable.

**Alternatives considered**:

- Node's built-in test runner: standard-library, but Vitest provides smoother TypeScript ergonomics and coverage configuration.
- No linter: weakens the clean-code demo goal.

## Decision: Strict matching is default, permissive matching is explicit

**Rationale**: Strict matching avoids undercounting real income or spend by excluding only high-confidence internal movements. Permissive matching remains available per run for users who prefer likely internal-transfer cleanup with warnings.

**Alternatives considered**:

- Always permissive: can hide real external transactions.
- Stop on ambiguity: safe, but frustrating for statement sets with benign fuzzy matches.
