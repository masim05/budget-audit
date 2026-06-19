---
name: Check New Commits
description: Review only newly pushed PR commits, request changes for new issues, resolve addressed threads, and approve when clean.
argument-hint: PR URL or number, plus optional review focus
agent: agent
---

Task: Check newly pushed commits on a pull request and update the review state.

Use the prompt argument as PR context (for example: PR URL, PR number, focus areas, or constraints).

Process:
1. Identify the target PR from the argument or current workspace context.
2. Detect what is new since the last review (new commits, changed files, and unresolved threads).
3. Review the new changes with a code-review mindset focused on bugs, regressions, security, and missing tests.
4. If new issues are found:
   - Add inline comments on the relevant lines.
   - Submit a review with decision REQUEST_CHANGES.
   - Group feedback by severity and include concrete fixes.
5. If previously reported issues are now fixed:
   - Resolve the corresponding review conversations/threads.
   - Do not resolve threads that are only partially addressed.
6. If all known issues are addressed and no new blocking issues remain:
   - Submit an APPROVE review.
7. Return a short summary with:
   - Whether new commits were found.
   - Issues opened, issues resolved, and remaining blockers.
   - Final review decision taken (REQUEST_CHANGES or APPROVE).

Execution rules:
- Prefer reviewing only the delta from newly pushed commits, but include surrounding context needed to judge correctness.
- Keep comments actionable and specific to code locations.
- Never approve while unresolved blocking threads or fresh blocking issues still exist.
- Use the `gh` CLI for all GitHub interactions required by this workflow.
- Do not use MCP tools for pull request, review, or thread operations in this workflow.
