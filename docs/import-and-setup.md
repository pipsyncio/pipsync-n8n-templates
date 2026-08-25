# Import and setup

## Requirements

- n8n 2.x
- Node.js is needed only for repository validation, not for importing JSON
- a PipSync account with access to the published read-only API for remote mode
- optionally, one Telegram bot credential or one Slack OAuth credential stored
  in n8n

Never paste an API key, bot token, Slack token, or incoming webhook URL into an
Edit Fields, Code, HTTP header, sticky note, or exported workflow parameter.

## 1. TradingView paper signal validator

Import
[`01-tradingview-paper-signal-validator.json`](../workflows/01-tradingview-paper-signal-validator.json),
open the Webhook node, and choose **Listen for test event**. Use the temporary
test URL shown by your own n8n instance:

```sh
curl --fail-with-body \
  -H 'Content-Type: application/json' \
  --data-binary @fixtures/tradingview-paper-signal.json \
  "$N8N_TEST_WEBHOOK_URL"
```

The expected result has `accepted: true` and `execution: disabled`. Changing
`environment` to `live` returns a rejection. Unknown fields, malformed values,
and invalid stop/target geometry are also rejected.

This is a local demo endpoint. It does not authenticate TradingView, verify an
HMAC, apply a timestamp freshness window, or durably claim an idempotency key.
It must not be exposed as production webhook infrastructure.

## 2. Read-only signals to Telegram or Slack

Import
[`02-read-only-signals-to-chat.json`](../workflows/02-read-only-signals-to-chat.json)
and execute it without edits. The synthetic branch produces a preview summary,
while both notification nodes remain disabled.

To opt in to the remote read-only path:

1. In n8n Credentials, create a **Header Auth** credential.
2. Set the header name to `Authorization` and store the bearer value there.
3. Select that credential in **GET PipSync Signals - ENABLE AFTER SETUP**.
4. Enable that GET node.
5. Change `useSyntheticData` in **Configuration** from `true` to `false`.
6. Execute manually and inspect the redacted summary before configuring chat.
7. Add either a Telegram credential and chat ID or a Slack OAuth credential and
   channel ID.
8. Enable exactly one notification node and run another manual test.

The notification includes only counts, directions, a capped instrument list,
and the latest received timestamp. Signal IDs, prices, channel names, and
provider names are intentionally omitted.

## 3. Read-only usage, health, and report alert

Import
[`03-read-only-usage-health-report-alert.json`](../workflows/03-read-only-usage-health-report-alert.json)
and execute it while `useSyntheticData` remains `true`. The synthetic response
crosses the default 80% threshold so the warning branch is easy to inspect.

To opt in to remote reads:

1. Reuse the n8n Header Auth credential for **GET Account Usage** and
   **GET Report Catalog**.
2. Enable those two nodes and the public **GET Health** node.
3. Change `useSyntheticData` to `false`.
4. Set `warnAtPercent` to a number from 1 through 100.
5. Execute manually and inspect the result. Error response bodies and headers
   are not forwarded into the notification result.
6. Configure and enable exactly one chat node.
7. Only after successful manual tests, activate the workflow to enable its
   six-hour schedule.

The threshold is applied to the finite limit with the highest utilization.
Unlimited entries with a `null` maximum do not trigger a percentage warning.

## Exporting changes safely

Before contributing an edited workflow:

1. deactivate the workflow
2. disable every HTTP, Slack, and Telegram node
3. remove all credential references during export
4. restore synthetic mode as the default
5. remove pinned execution data
6. run `npm run validate`, `npm run scan:secrets`, and `npm test`

An n8n credential object can contain secrets even when the canvas looks safe.
Review the exported JSON itself before publishing it.
