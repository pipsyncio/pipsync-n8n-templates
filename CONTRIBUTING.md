# Contributing

Thank you for improving the PipSync n8n templates.

## Non-negotiable safety rules

- keep every exported workflow inactive
- keep synthetic mode enabled by default
- use only standard built-in n8n nodes
- permit only documented read-only PipSync `GET` paths
- ship every HTTP, Slack, and Telegram node disabled
- remove credential objects, IDs, tokens, route keys, and pinned execution data
- do not add brokers, order actions, PipSync write routes, or live-trade logic
- do not include customer signals, account data, or production screenshots
- preserve explicit wording that Workflow 01 has no production authentication
  or durable replay protection

## Development

Node.js 20 or newer is sufficient; this repository has no runtime dependency.

```sh
npm run validate
npm run scan:secrets
npm test
```

Add a negative test for every safety boundary you change. Keep JSON exports
pretty-printed with two spaces and a final newline. Add or update the matching
SVG flow diagram and setup documentation when nodes or connections change.

By contributing, you agree that your contribution is licensed under
Apache-2.0 and that you have the right to submit it.
