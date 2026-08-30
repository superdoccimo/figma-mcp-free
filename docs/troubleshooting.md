# Troubleshooting

Start with the offline gate:

```bash
pnpm install --frozen-lockfile
pnpm check
```

Then diagnose the live URL without sharing secrets:

```bash
pnpm --filter figma-mcp-free dev -- doctor "<FIGMA_URL>" --json
```

## Token is missing

Symptoms:

- configuration reports no token
- live REST commands fail before an API response

Fix:

```bash
pnpm --filter figma-mcp-free dev -- init
```

or set `FIGMA_TOKEN` for the process.

Do not paste a token into a command that will be stored in shell history when a safer environment or local config is available.

## 401 or 403

Possible causes:

- token is invalid, expired or revoked
- token lacks access to the file
- the file belongs to a team or project the token owner cannot read
- a plan or endpoint restriction applies

Revoke and replace a token if exposure is possible. Do not send the token or raw private response in a public issue.

## 404 or missing node

Check:

- the file ID belongs to the selected link
- the selected node still exists
- `node-id` is present when a node-specific command requires it
- a manually supplied node ID uses `1:2`
- the share link uses `/file` or `/design`

The parser normalizes a common numeric `1-2` share-link ID to `1:2`. It deliberately avoids rewriting arbitrary hyphenated strings.

## `/slides` is rejected

The current REST backend supports `/file` and `/design` links. It does not claim slide-node support. Copy a link to a supported file/design selection or use an appropriate official workflow.

## 429 rate limit

`FigmaRateLimitError` can include:

- `retryAfterMs`
- `planTier`
- `rateLimitType`
- `upgradeLink`
- `requestId`
- `retryable`

The client retries only within configured limits. A response that appears long-lived, plan-related or beyond `maxRetryDelayMs` fails immediately instead of sleeping through a useless short backoff loop.

Ways to reduce calls:

- pass a narrow `depth`
- use `getNodes()` for multiple nodes instead of repeated `getNode()` calls
- avoid duplicate node IDs
- keep the default short memory cache when freshness permits
- reuse one client instance within a job
- set an explicit `requestBudget` for quota-sensitive automation
- run the offline demo while debugging code generation

Check current official Figma documentation because plan and endpoint allowances can change.

## Request budget exhausted

`FigmaRequestBudgetError` is local protection. It means the client reached the configured network-attempt cap, not necessarily that Figma rejected the account.

Inspect:

```ts
client.getRequestBudgetState();
client.getStats();
```

Retries consume the budget. Cache hits and coalesced identical requests do not.

Increase the budget only after removing accidental duplicate work.

## Timeout or network failure

The default request timeout is bounded per attempt. A proxy, VPN, DNS issue, firewall or temporary Figma outage can produce a network failure.

Try:

- confirm ordinary HTTPS access to Figma
- check proxy environment and corporate TLS interception
- use a reasonable `requestTimeoutMs`
- keep `maxRetries` small
- do not convert an unreachable service into an infinite retry loop

## Changes are not visible immediately

The client uses a short process-local memory cache. Call `client.clearCache()`, set `cacheTtlMs: 0`, or start a new process when testing immediate design changes.

The cache is not persisted to disk.

## MCP server starts but tools are missing

Rebuild all packages:

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

Confirm the client configuration points to the built `packages/mcp-server/dist/index.js` and provides the token through the expected environment.

Do not assume configuration syntax from one MCP client works unchanged in another client version.

## Generated code is incomplete

The generator produces starter code from available node data. Common manual work remains:

- responsive breakpoints
- semantic elements
- keyboard and screen-reader behavior
- interactions and state
- stable image assets
- application-specific components
- visual comparison against the source design

Report a generator bug with a minimal sanitized JSON fixture rather than a private Figma file.

## Image URL expires

Figma Images API results and `images.figma.com` URLs can be temporary. Export assets into the target project or a controlled asset pipeline. Do not use temporary URLs as permanent README or production assets.

## Fork check fails

Run:

```bash
pnpm check:fork -- --json
```

Common causes:

- `pull_request_target` added to a workflow
- a normal CI workflow requires `${{ secrets.* }}`
- runtime source hard-codes `superdoccimo`
- a package name moved outside the configured scope
- the workspace root is no longer private

Read [forking.md](forking.md) before weakening the policy. A release workflow may use protected credentials, but ordinary pull request CI must remain fork-safe.

## Fork audit cannot compare one repository

The audit continues when one comparison fails. Causes include:

- deleted or renamed default branch
- fork no longer shares comparable history
- temporary GitHub API failure
- API rate limit

Use `GITHUB_TOKEN` for a larger read allowance:

```bash
GITHUB_TOKEN="..." pnpm fork:audit
```

The token needs read access only. Do not commit it.

## Windows notes

Use PowerShell environment syntax when needed:

```powershell
$env:FIGMA_TOKEN = "..."
$env:FIGMA_URL = "https://www.figma.com/design/<FILE_ID>/...?node-id=1-2"
pnpm --filter figma-mcp-free dev -- doctor $env:FIGMA_URL
```

Avoid placing a real token in screenshots or shared terminal transcripts.

## Still blocked

Read [SUPPORT.md](../SUPPORT.md) and open a sanitized issue with operating system, Node.js, pnpm, commit, MCP client, exact reproduction, offline test result and safe error metadata.

Use [SECURITY.md](../SECURITY.md) instead of a public issue for token exposure, arbitrary execution, unsafe listeners or private-data leakage.
