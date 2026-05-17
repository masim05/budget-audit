<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- Placeholder Principle 1 -> I. Clean Code as Teaching Artifact
- Placeholder Principle 2 -> II. Unit-Tested Behavior
- Placeholder Principle 3 -> III. CLI-First, Interface-Ready Delivery
- Placeholder Principle 4 -> IV. Hexagonal Boundaries
- Placeholder Principle 5 -> V. No MCP Dependency
Added sections:
- Project Constraints
- Development Workflow and Quality Gates
Removed sections:
- None
Templates requiring updates:
- Updated: .specify/templates/plan-template.md
- Updated: .specify/templates/spec-template.md
- Updated: .specify/templates/tasks-template.md
- Reviewed: .specify/templates/checklist-template.md
- Not present: .specify/templates/commands/*.md
Follow-up TODOs: None
-->
# Budget Audit Constitution

## Core Principles

### I. Clean Code as Teaching Artifact

This project MUST remain a simple demo that demonstrates clean code principles in
ordinary, readable production-style code. Names MUST describe intent, functions
and modules MUST stay small and cohesive, duplication MUST be removed when it
obscures behavior, and abstractions MUST exist only when they clarify the domain
or protect a boundary. Rationale: the project is an example first, so every
implementation choice must help future readers understand the system quickly.

### II. Unit-Tested Behavior

All application behavior MUST be covered by unit tests, and the project MUST
maintain 100% unit test coverage for lines and branches that belong to the
application code. Tests MUST be deterministic, isolated from external services,
and written close to the behavior they verify. Any intentionally untestable glue
code MUST be kept minimal and justified in the implementation plan. Rationale:
the demo must prove design quality through fast, exhaustive feedback.

### III. CLI-First, Interface-Ready Delivery

The first supported interface MUST be a CLI with clear arguments, exit codes,
stdout for successful output, and stderr for diagnostics. Core behavior MUST NOT
depend on CLI framework types, terminal state, or presentation formatting. The
same use cases MUST remain callable from future adapters, including a possible
web interface. Rationale: starting with a CLI keeps the demo small while preserving
a scalable path to additional delivery mechanisms.

### IV. Hexagonal Boundaries

When a feature has meaningful domain behavior or external interaction, it MUST
demonstrate Ports and Adapters / Hexagonal Architecture. Domain rules and use
cases MUST live in the application core; inbound adapters MUST translate user or
system input into use case calls; outbound ports MUST define external needs; and
outbound adapters MUST implement those ports at the edge. Rationale: explicit
boundaries make the demo scalable without coupling business behavior to delivery
or infrastructure details.

### V. No MCP Dependency

Development workflow, generated specifications, application code, tests, and
runtime behavior MUST NOT require MCP servers, MCP clients, MCP protocols, or MCP
tooling. Any automation required by the project MUST be available through local
scripts, standard language tooling, or documented commands that do not depend on
MCP. Rationale: the demo must be reproducible and understandable without external
agent infrastructure.

## Project Constraints

The project MUST stay intentionally small and suitable for demonstration. New
dependencies MUST be justified by concrete value to the CLI, test suite, or
architecture example. Public behavior MUST be specified through user scenarios,
CLI contracts, and unit tests before implementation. Data persistence,
networking, or web delivery MAY be added only behind ports so that the core
application remains testable without those technologies.

## Development Workflow and Quality Gates

Every feature plan MUST pass the Constitution Check before design proceeds and
again before implementation tasks are accepted. Plans MUST identify the core use
cases, inbound adapters, outbound ports, and outbound adapters when hexagonal
architecture applies. Tasks MUST include unit tests for every behavior-bearing
module and MUST include a coverage verification step proving 100% unit coverage.
Reviews MUST reject changes that introduce unclear names, avoidable duplication,
untested behavior, CLI coupling in the core, infrastructure coupling in the core,
or MCP dependencies.

## Governance

This constitution supersedes conflicting project practices, templates, and
generated plans. Amendments MUST be proposed as explicit documentation changes
that include the rationale, the semantic version impact, and updates to dependent
templates. Compliance MUST be checked during planning, task generation, and code
review. Versioning follows semantic versioning: MAJOR for incompatible governance
or principle changes, MINOR for new principles or materially expanded guidance,
and PATCH for clarifications that do not change obligations.

**Version**: 1.0.0 | **Ratified**: 2026-05-17 | **Last Amended**: 2026-05-17
