---
name: Start Code Review
description: Review a PR, leave inline comments for significant issues, request changes when blockers exist, and approve when clean.
argument-hint: PR URL or number, plus optional review focus
agent: agent
---

Task: Start a code review for the target pull request and update the review state.

Use the prompt argument as PR context (for example: PR URL, PR number, focus areas, risk constraints, or files to prioritize).

Process:
1. Identify the target PR from the argument or current workspace context.
2. Review the current PR diff with a code-review mindset focused on bugs, regressions, security issues, and missing tests.
3. For each significant issue found:
   - Add an inline comment on the relevant file/line.
   - Explain impact and provide a concrete fix suggestion.
4. If one or more blocking issues are found:
   - Submit a review with decision REQUEST_CHANGES.
   - Group feedback by severity (high, medium, low).
5. If no blocking issues are found:
   - Submit an APPROVE review.
6. Return a short summary with:
   - Number of findings by severity.
   - Files/areas reviewed.
   - Final review decision taken (REQUEST_CHANGES or APPROVE).

Execution rules:
- Prioritize actionable, specific feedback tied to exact code locations.
- Avoid nitpicks unless they affect correctness, security, maintainability, or test reliability.
- Never approve if blocking issues remain unresolved.
- Use the `gh` CLI for all pull request discovery, diff inspection, inline comments, and review submission actions.
- Do not use MCP tools for this workflow.
