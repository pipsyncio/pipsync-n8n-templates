# Security policy

## Supported versions

Security fixes are provided for the latest release on the `main` branch.

## Reporting a vulnerability

Do not open a public issue for a leaked secret, credential reference, webhook
authentication bypass, unsafe activation default, unintended write request, or
failure of the paper/read-only boundary.

Use GitHub's **Security → Report a vulnerability** flow for this repository. If
private vulnerability reporting is unavailable, use the contact route at
<https://pipsync.io/en/contact> and send only a minimal, non-secret summary
until a private channel is established.

Include the affected release and workflow, reproduction steps using synthetic
data, expected and observed behavior, and a concise impact description. Never
include API keys, bot tokens, Slack tokens, broker credentials, customer
payloads, account identifiers, or production execution logs.

## Scope

Security-sensitive behavior includes workflow activation state, credential
export, read-only method/path enforcement, summary redaction, webhook input
validation, notification output, and any wording that could misrepresent the
local demo as authenticated or replay-safe production ingress.
