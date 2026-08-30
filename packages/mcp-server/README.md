# @figma-mcp-free/server

Unified read-only MCP STDIO server for `figma-mcp-free`.

The server can expose either or both backends:

- quota-aware Figma REST reads;
- PAT-free reads from an authenticated Local Plugin Bridge snapshot.

The package is prepared for distribution but is not published from this repository yet.

## Start

```bash
node dist/index.js
```

From the repository root:

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

## Backend configuration

REST tools use:

```text
FIGMA_TOKEN
```

Local Plugin tools use:

```text
FIGMA_PLUGIN_BRIDGE_URL=http://127.0.0.1:3845
FIGMA_PLUGIN_BRIDGE_TOKEN=<PAIRING_TOKEN>
FIGMA_PLUGIN_BRIDGE_TIMEOUT_MS=10000
```

The URL and pairing token are process environment values. They are intentionally absent from model-visible tool schemas.

## REST tools

- `get_file`
- `get_nodes`
- `inspect_selection`
- `get_components`
- `list_frames`
- `export_tokens`
- `generate_code`
- `get_cache_stats`
- `clear_cache`

## Local Plugin tools

- `get_plugin_bridge_status`
- `get_current_selection`
- `inspect_current_selection`
- `generate_current_selection`

The two backends share the same compact inspector and starter-code generator. No tool creates, edits, moves, deletes, or publishes Figma nodes.

## REST tuning

```text
FIGMA_MCP_CACHE_TTL_MS=300000
FIGMA_MCP_MAX_CACHE_ENTRIES=128
FIGMA_MCP_REQUEST_TIMEOUT_MS=20000
FIGMA_MCP_MAX_RETRIES=2
FIGMA_MCP_NODE_BATCH_SIZE=100
```

Use compact inspection or batched node reads before requesting a large file response.

See the [repository README](https://github.com/superdoccimo/figma-mcp-free#readme), [architecture](../../docs/architecture.md), and [plugin guide](../../plugins/local-bridge/README.md).
