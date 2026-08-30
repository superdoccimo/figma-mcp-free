# Troubleshooting

Start with the diagnostic that matches the active backend:

```bash
# REST mode
pnpm --filter figma-mcp-free dev -- doctor "<FIGMA_URL>"

# Local Plugin Bridge
node packages/cli/dist/bridge-cli.js status
```

# Local Plugin Bridge

## Unauthorized bridge request

### Symptom

- Plugin UI or CLI reports `Unauthorized plugin bridge request`.
- MCP plugin tools fail with HTTP 401.

### Fix

The running bridge, plugin UI, CLI, and MCP process must use the same pairing token.

```bash
export FIGMA_PLUGIN_BRIDGE_TOKEN="<PAIRING_TOKEN>"
export FIGMA_PLUGIN_BRIDGE_URL="http://127.0.0.1:3845"
```

Restarting the bridge without a fixed environment token creates a new random token. Paste the new token into the plugin and restart the MCP client if its environment changed.

## No snapshot has been captured

### Symptom

- `get_current_selection` or bridge `current` returns 404.

### Fix

1. Select at least one supported node in Figma.
2. Open the development plugin.
3. Press **Capture & Send**.

Selection changes are not sent automatically.

## Figma blocks the local request

### Symptom

- The plugin UI shows a network or CSP error.
- The bridge works from the terminal but not from Figma.

### Fix

The checked-in development manifest permits only:

```text
http://127.0.0.1:3845
http://localhost:3845
```

Use port `3845`, or add the exact custom loopback URL to the generated local `manifest.json` under `networkAccess.devAllowedDomains`, then reload the development plugin.

Do not replace the allowlist with `*`.

## Plugin manifest cannot be imported

### Symptom

- Figma rejects `manifest.template.json`.
- The plugin ID is invalid.

### Fix

Figma assigns development plugin IDs. Generate the local manifest from a numeric Figma-issued ID:

```bash
node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID>
```

Import `plugins/local-bridge/manifest.json`, not the template.

## Unsupported selected node

### Symptom

- Capture reports that the selected node cannot be exported as REST JSON.

### Fix

Capture an exportable scene node such as a frame, component, instance, group, text, vector, or shape. Some editor objects and special node types do not support `JSON_REST_V1` export.

## Snapshot is too large

### Symptom

- The bridge returns HTTP 413.

### Fix

- Capture fewer nodes.
- Capture a narrower frame instead of a large page-like hierarchy.
- Increase `--max-body-mb` only when the selected content is trusted and the memory impact is understood.

The default bridge limit is 10 MiB and 50 selections.

## Bridge refuses the URL or host

### Symptom

- Client reports that a non-loopback host is refused.
- HTTPS is rejected.

### Fix

Use a local HTTP endpoint:

```text
http://127.0.0.1:3845
http://localhost:3845
http://[::1]:3845
```

This is an intentional security boundary. The bridge is not a remote service.

# REST Mode

## Unsupported Figma links

### Symptom

- The source URL starts with `/slides/`.
- The CLI cannot resolve the file or node.

### Fix

Use a `/file/` or `/design/` URL to a selected frame or component. The current REST workflow does not expose slide node information.

## Node ID format

Figma URLs often show:

```text
node-id=1-2
```

REST uses:

```text
1:2
```

Full Figma URLs are normalized automatically. Convert manually only for direct REST calls or raw node-ID arguments.

## PAT rejected or file access denied

### Symptom

- HTTP 401 or 403.

### Fix

1. Confirm the PAT is still valid.
2. Confirm the PAT has the current Figma scopes needed to read the target file.
3. Confirm the token's account can access the file.
4. Re-run `init` or provide `FIGMA_TOKEN` before launching the CLI or MCP server.

```bash
pnpm --filter figma-mcp-free dev -- init
pnpm --filter figma-mcp-free dev -- doctor "<FIGMA_URL>"
```

Figma can change scope names and UI, so follow the current token-creation screen rather than relying on a fixed historical list.

## Local PAT permissions are too broad

### Symptom

- `doctor` or `config security` reports an insecure mode.

### Fix

On POSIX systems:

```bash
chmod 700 "$(dirname "$(pnpm --filter figma-mcp-free dev -- config path)")"
chmod 600 "$(pnpm --filter figma-mcp-free dev -- config path)"
```

A subsequent config write also attempts to restore owner-only permissions.

## Rate limit reached

### Symptom

- HTTP 429.
- Diagnostics show a long `Retry-After` or a plan/limit class.

### Fix

- Follow the reported `Retry-After`.
- Use `nodes` or `get_nodes` for multiple IDs.
- Prefer `inspect-selection` over full-file JSON.
- Pass a narrow `depth` to file and frame reads.
- Avoid `--refresh` unless a new network read is required.
- Keep a long-running MCP server alive so its bounded memory cache can help.
- For the design currently open in Figma, use the Local Plugin Bridge instead of REST.

The client retries short transient limits and temporary server failures. It does not repeatedly sleep through very long quota windows.

## Missing node IDs

### Symptom

- `generate` reports that the node was not found.

### Fix

1. Copy a link to the selected node and verify `node-id` is present.
2. Confirm the node belongs to the same file ID.
3. Use component metadata or a shallow file read to discover IDs.
4. Run `doctor` against the selected-node URL.

## Temporary image URLs expire

Do not use Figma Images API URLs as durable documentation or production assets. Export stable files into the application, repository, CDN, or object storage.

Figma view URLs are not direct image assets.

# MCP Server

## MCP client cannot start the server

1. Build the workspace.
2. Use an absolute path to `packages/mcp-server/dist/index.js`.
3. Ensure the MCP process receives the required backend environment variables.
4. Restart the IDE after configuration changes.

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

## REST tools work but plugin tools do not

The server can use the two backends independently. Plugin tools require:

```text
FIGMA_PLUGIN_BRIDGE_URL
FIGMA_PLUGIN_BRIDGE_TOKEN
```

REST tools require `FIGMA_TOKEN` or the protected local PAT config.

## Plugin tools work but REST tools do not

This is valid when no PAT is configured. Local Plugin tools do not require `FIGMA_TOKEN`.

## Generated code contains raw values instead of variables

Provide compatible W3C-style token JSON through `--use-tokens` or the MCP `tokens` input. Confirm the token values correspond to the selected node's values and use the intended variable prefix.

# Reporting a Problem

Open a GitHub issue with:

- backend used: REST or Local Plugin;
- command or MCP tool name;
- Node.js and pnpm versions;
- anonymized file/node identifiers;
- safe diagnostic output;
- whether the issue reproduces after `pnpm run check`.

Never include a PAT, pairing token, private design JSON, or private layer text.
