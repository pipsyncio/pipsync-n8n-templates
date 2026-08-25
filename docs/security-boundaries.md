# Security boundaries

## Verified properties of these exports

- all three workflow documents have `active: false`
- all fixtures and inline examples are synthetic
- no exported workflow contains a credential object or credential identifier
- every HTTP Request node ships disabled and uses `GET`
- the allowlist contains only standard `n8n-nodes-base` nodes
- Slack and Telegram nodes ship disabled and contain only channel placeholders
- no workflow includes a broker node, execution endpoint, or write request
- notification summaries omit raw headers, error bodies, tokens, signal IDs,
  prices, channel names, and provider names

These are repository-level properties enforced by tests. They do not prove the
security of a user's n8n deployment, credential store, reverse proxy, network,
Slack workspace, Telegram bot, or PipSync account.

## Webhook authenticity and replay

Workflow 01 intentionally has no webhook authentication. Its purpose is local
payload validation, not origin verification. It also has no durable storage,
atomic idempotency claim, or replay receipt.

A production TradingView ingress requires an independently reviewed route-key
or signature contract, payload-size limits at the edge, authenticated tenant
context, durable tenant-scoped receipts, an atomic uniqueness constraint before
side effects, explicit retry behavior, and redacted logs. An in-memory Set or a
timestamp field inside JSON is not durable replay protection.

## Read-only does not mean risk-free

The authenticated GET routes can return account or trading-related information.
Use a least-privilege API key, keep it in n8n's credential store, restrict who
can view workflow executions, and configure execution-data retention according
to your own privacy and security requirements. Never include full API responses
in chat notifications or public issue reports.

The `/health` endpoint is public in the published OpenAPI contract. The
`/signals`, `/account/usage`, and `/reports` routes require bearer
authentication. This repository neither provisions nor tests an account's
permissions.

## Activation checklist

- [ ] Imported JSON reviewed locally
- [ ] Synthetic execution succeeds
- [ ] Read-only credential created outside the workflow
- [ ] Credential scope and account access reviewed
- [ ] Only documented GET nodes enabled
- [ ] Exactly one notification node enabled
- [ ] Notification preview contains no sensitive fields
- [ ] n8n execution access and retention reviewed
- [ ] Workflow activated only after a manual remote test

If any step is unclear, leave the workflow inactive.
