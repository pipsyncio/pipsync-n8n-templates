# Verification

## Fast deterministic gate

The default CI job uses only Node.js built-ins and runs on Node.js 20 and 22:

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

## Local environment note

During the 0.1.0 preparation on 2026-08-25, the deterministic gates, Node.js
20/22 tests, Action workflow lint, XML parsing, and rendered SVG review all
passed. An additional local n8n runtime smoke could not reach n8n: Docker
Desktop left newly created containers in `Created` state, and the fallback
one-off npm installation stopped during dependency cleanup. Both attempts were
aborted before workflow import began, so they are recorded as environment gaps,
not as passing or failing import evidence. Use the script or manual Actions job
on a healthy Docker runner to close that optional runtime evidence gap.
