# Verification

## Fast deterministic gate

The default CI job uses only Node.js built-ins and runs on Node.js 20 and 24:

```sh
npm run validate
npm run scan:secrets
npm test
```

The gate verifies the workflow envelope and repository-specific safety
invariants more strictly than n8n's CLI import preflight:

- exactly three deterministic JSON exports
- inactive workflow state and empty pinned data
- unique node names and UUIDs, valid connection sources and targets
- standard built-in node allowlist
- credential objects absent
- every remote request disabled, `GET`-only, and limited to a published path
- every Slack and Telegram node disabled
- synthetic mode enabled by default
- explicit live rejection and honest replay limitation in Workflow 01
- redaction behavior, fixture safety, local Markdown links, and SVG accessibility

The official n8n 2.36.7 importer first requires workflow objects to contain
`nodes` and `connections`; the pinned source is available in
[`packages/cli/src/commands/import/workflow.ts`](https://github.com/n8n-io/n8n/blob/n8n%402.36.7/packages/cli/src/commands/import/workflow.ts).
Per-node parameter behavior still belongs to the selected n8n runtime, so the
optional runtime smoke below remains a separate check.

## Reproducible n8n import smoke

With Docker available:

```sh
./scripts/smoke-import.sh
```

The script creates a temporary container from `n8nio/n8n:2.36.7`, copies the
three exports into it without mounting the repository, invokes the official
`import:workflow --separate` command with its safe default inactive state, and
removes the container. Expected output includes:

```text
Successfully imported 3 workflows.
```

The same pinned smoke is available as the manual **n8n Import Smoke** GitHub
Actions workflow. It is manual because the n8n image is much larger than this
source repository and is not required for every documentation-only change.

## Local runtime evidence

During the 0.1.2 preparation on 2026-08-25, a clean temporary installation of
the official n8n 2.36.7 runtime was launched with Node.js 24.19.0. After its
native SQLite and isolated-expression dependencies were built for that runtime,
n8n initialized a fresh local database, applied its migrations, and ran:

```sh
n8n import:workflow --input=/absolute/path/to/workflows --separate
```

The command exited successfully with:

```text
Importing 3 workflows...
Successfully imported 3 workflows.
```

Earlier attempts with a stalled Docker Desktop instance, Node.js 25, and an
install that deliberately skipped every lifecycle script did not reach the
workflow parser. Those environment-specific failures are not counted as product
test failures. The final Node.js 24 run closes the local import evidence gap;
the Docker script and manual Actions workflow remain the reproducible maintainer
path for repeating the same official importer check.
