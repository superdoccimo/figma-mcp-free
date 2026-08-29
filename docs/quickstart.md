# Quickstart

This guide covers the minimum setup for both supported read paths:

- **Local Plugin Bridge** for the design currently open in Figma Desktop, without a PAT or REST call.
- **REST mode** for URLs, headless automation, CI, and machines without Figma Desktop.

## 1. Install and build

```bash
pnpm install --frozen-lockfile
pnpm -r build
```

Use Node.js 18 or newer and pnpm 9.

## 2. Verify the generator offline

```bash
pnpm --filter figma-mcp-free dev -- \
  generate-from-json ./examples/sample-node.json \
  --framework react \
  --use-tokens ./examples/sample-tokens.json
```

This reads local JSON only.

# Path A: Local Plugin Bridge

## 3A. Start the bridge

```bash
pnpm --filter figma-mcp-free bridge -- serve
```

Keep the terminal open and copy the printed loopback URL and pairing token.

## 4A. Prepare the development plugin

Create a development plugin in Figma Desktop once, copy its generated numeric ID, then run:

```bash
node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID>
```

Import `plugins/local-bridge/manifest.json` as a development plugin.

## 5A. Capture and inspect

Open the plugin, paste the bridge URL and token, select a node, and press **Capture & Send**.

```bash
export FIGMA_PLUGIN_BRIDGE_URL="http://127.0.0.1:3845"
export FIGMA_PLUGIN_BRIDGE_TOKEN="<PAIRING_TOKEN>"

node packages/cli/dist/bridge-cli.js status
node packages/cli/dist/bridge-cli.js inspect --depth 2 --max-children 20
node packages/cli/dist/bridge-cli.js generate --framework react
```

The plugin does not transmit selection changes automatically and provides no write operations.

See [the full plugin guide](../plugins/local-bridge/README.md).

# Path B: REST Mode

## 3B. Configure a Figma PAT

Prefer `FIGMA_TOKEN` for temporary sessions and CI. To store a token in the protected local config:

```bash
pnpm --filter figma-mcp-free dev -- init
```

Verify only the token state, without printing the token:

```bash
pnpm --filter figma-mcp-free dev -- config get token
pnpm --filter figma-mcp-free dev -- config security
```

## 4B. Prepare a Figma URL

Use a `/file` or `/design` link to a selected frame or component. The CLI normalizes URL node IDs such as `node-id=1-2` to `1:2`. `/slides` links are not supported by the REST workflow.

## 5B. Diagnose and use the CLI

```bash
FIGMA_URL="https://www.figma.com/design/<FILE_ID>/Example?node-id=1-2"

pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL"
pnpm --filter figma-mcp-free dev -- inspect-selection "$FIGMA_URL" --depth 2 --max-children 20
pnpm --filter figma-mcp-free dev -- nodes "$FIGMA_URL" 1:2 3:4 5:6 --depth 2
pnpm --filter figma-mcp-free dev -- export-tokens "$FIGMA_URL" > tokens.json
pnpm --filter figma-mcp-free dev -- generate "$FIGMA_URL" --framework react --use-tokens ./tokens.json
```

Prefer `get_nodes` or the `nodes` command for multiple node IDs. Use `--refresh` only when a fresh network read is required.

# Unified MCP Server

## 6. Start the server

```bash
node packages/mcp-server/dist/index.js
```

The same server exposes REST and Local Plugin tools. Configure either or both credential sets in the server process environment:

```json
{
  "env": {
    "FIGMA_TOKEN": "<OPTIONAL_REST_PAT>",
    "FIGMA_PLUGIN_BRIDGE_URL": "http://127.0.0.1:3845",
    "FIGMA_PLUGIN_BRIDGE_TOKEN": "<OPTIONAL_PAIRING_TOKEN>"
  }
}
```

Credentials are intentionally absent from model-visible tool schemas.

## 7. Choose the right MCP tool

REST tools:

- `get_file`
- `get_nodes`
- `inspect_selection`
- `get_components`
- `list_frames`
- `export_tokens`
- `generate_code`
- `get_cache_stats`
- `clear_cache`

Local Plugin tools:

- `get_plugin_bridge_status`
- `get_current_selection`
- `inspect_current_selection`
- `generate_current_selection`

Use compact inspection before requesting raw node or file JSON. Refer to [troubleshooting](troubleshooting.md) for authentication, rate limits, plugin CSP, and bridge pairing problems.
