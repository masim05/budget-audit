---
name: Address Code Review Comments
description: Address PR review comments with technical judgment, implement validated fixes, and push follow-up commits.
argument-hint: PR URL or number, plus optional focus or constraints
agent: agent
---

Task: Address code review comments on the target pull request and prepare the branch for another review pass.

Use the prompt argument as PR context (for example: PR URL, PR number, files to prioritize, constraints, or comments to focus on).

Use workspace context, including [README](../../README.md), [AGENTS](../../AGENTS.md), and any relevant specs or tests, to understand the intended behavior before changing code.

Process:
1. Identify the target PR from the argument or current workspace context.
2. Gather unresolved review comments, open threads, and recent review decisions for that PR using the `gh` CLI.
3. Triage each comment with technical rigor:
   - Apply changes when the comment identifies a real bug, regression risk, missing test, or maintainability issue.
   - If a comment is unclear, partially correct, or conflicts with the codebase design, investigate and choose the technically correct response instead of blindly implementing it.
4. Implement the necessary code and test changes in the local branch.
5. Prepare note-by-note responses so each addressed comment gets a direct explanation tied to the specific fix or decision.
6. Run the narrowest local validation that proves the addressed comments are actually fixed, including the same CI checks that are expected to pass remotely before pushing.
7. Push the follow-up commit(s) to the PR branch.
8. Verify the remote CI status for the pushed commit using the `gh` CLI and wait until the relevant checks are green before considering the work complete.
9. Post the note-by-note replies on the review comments and resolve only the threads that are fully addressed.
10. Return a short summary with:
   - Comments addressed.
   - Comments intentionally not changed and why.
   - Threads resolved or left open.
   - Local validation performed.
   - Remote CI result.
   - Commit hash or push result.

Execution rules:
- Prefer minimal fixes that address the root issue without widening scope.
- Add or update tests when review feedback exposes a missing guard or regression risk.
- Do not claim a comment is addressed without fresh verification evidence.
- Do not batch thread replies into one generic response when note-by-note replies are possible.
- Do not push until the required local CI-equivalent checks have passed.
- Do not resolve threads that are only partially addressed or still need reviewer confirmation.
- Do not treat the task as complete while remote CI is still failing or pending.
- Surface blockers clearly if a comment cannot be resolved safely.
- Use the `gh` CLI for pull request and review-thread discovery, posting replies, resolving threads, and checking remote CI status.
- Do not use MCP tools for this workflow.
