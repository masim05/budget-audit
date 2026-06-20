# Contributing

## Work Item Artifact Location Rules

All work-item artifacts must be created and maintained in the matching directory:

- `specs/<id>-<work-item-short-name>/`

This includes all related artifacts such as:

- `spec.md`
- `plan.md`
- `tasks.md`
- `research.md`
- `data-model.md`
- `quickstart.md`
- `checklists/`
- `contracts/`

Do not place work-item artifacts outside their matching `specs/<id>-<work-item-short-name>/` directory.

## Worktree Rules

All implementation work must be done in Git worktrees.

- Feature work and bug-fix work must be done in separate worktrees.
- Do not mix feature changes and bug-fix changes in the same worktree.
- Create and use worktrees only under `tmp/wts/`.

Examples:

```bash
mkdir -p tmp/wts

git worktree add tmp/wts/feature-my-change -b feature/my-change
# work on feature changes only

git worktree add tmp/wts/fix-my-bug -b fix/my-bug
# work on bug-fix changes only
```

## Testing Rules

- Every new class must have unit tests.
- Unit tests for a new class must cover its public methods.

If you introduce a class, add or update tests in the corresponding `*.test.ts` files before opening a pull request.
