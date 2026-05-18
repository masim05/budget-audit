# Quickstart: CLI Help and Aliases

## Prerequisites

Install dependencies if needed:

```sh
npm install
```

## Build

```sh
npm run build
```

## Manual Smoke Checks

The audit examples below use dummy statement files committed in `examples/statements` so they work from a fresh checkout.

Request help through the package audit script:

```sh
npm run audit -- -h
```

Expected result:

- Exit code is `0`.
- Help is printed to stdout.
- No report file is written.
- No statement folder is required for help.

Request help with the long option:

```sh
npm run audit -- --help
```

Run an audit with short date aliases:

```sh
npm run audit -- --data-dir examples/statements -f 2026-05-01 -t 2026-05-31
```

Run an audit with a short output alias:

```sh
npm run audit -- --data-dir examples/statements -f 2026-05-01 -t 2026-05-31 -o reports/audit.txt
```

## Validation

Run the local CI checks:

```sh
npm run build
npm run lint
npm run format:check
npm run test:coverage
```

All checks must pass before committing and pushing the implementation.
