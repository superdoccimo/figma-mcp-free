# @figma-mcp-free/server

Read-only MCP STDIO server for the `figma-mcp-free` workspace.

It exposes two explicit read paths:

- Figma REST tools authenticated by `FIGMA_TOKEN` or protected local CLI configuration;
- local Plugin tools authenticated by `FIGMA_PLUGIN_BRIDGE_TOKEN` in the MCP process environment.

Bridge credentials are never accepted as model-visible tool inputs.

## Start from source

```bash
pnpm install --frozen-lockfile
pnpm -r build
node packages/mcp-server/dist/index.js
```

## REST tools

- `get_file`
- `get_nodes`
- `inspect_selection`
- `get_components`
- `list_frames`
- `generate_code`
- `export_tokens`
- `get_cache_stats`
- `clear_cache`

## Local Plugin tools

- `get_plugin_bridge_status`
- `list_current_selections`
- `get_current_selection`
- `inspect_current_selection`
- `generate_current_selection`

`list_current_selections` returns only indexes, IDs, names, and types. Use it before requesting a complete captured document.

## Environment

REST:

```text
FIGMA_TOKEN
FIGMA_MCP_CACHE_TTL_MS
FIGMA_MCP_MAX_CACHE_ENTRIES
FIGMA_MCP_REQUEST_TIMEOUT_MS
FIGMA_MCP_MAX_RETRIES
FIGMA_MCP_NODE_BATCH_SIZE
```

Local Plugin bridge:

```text
FIGMA_PLUGIN_BRIDGE_URL=http://127.0.0.1:3845
FIGMA_PLUGIN_BRIDGE_TOKEN=<PAIRING_TOKEN>
FIGMA_PLUGIN_BRIDGE_TIMEOUT_MS=10000
```

Example configuration:

```json
{
  "mcpServers": {
    "figma-mcp-free": {
      "transport": "stdio",
      "command": "node",
      "args": ["./packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_PLUGIN_BRIDGE_URL": "http://127.0.0.1:3845",
        "FIGMA_PLUGIN_BRIDGE_TOKEN": "<PAIRING_TOKEN>"
      }
    }
  }
}
```

Do not commit a real token in an example configuration.

## Boundary

Tool input is untrusted. File IDs, URLs, node IDs, indexes, depth, child limits, batches, and framework choices remain schema-validated and bounded.

The server does not expose arbitrary shell execution, unrestricted file access, browser control, a remote bridge URL, or Figma write operations. REST failures do not silently fall back to the Plugin bridge, and Plugin failures do not consume REST quota automatically.

Example client configurations:

- [`examples/codex-config/mcp.json`](../../examples/codex-config/mcp.json)
- [`examples/cursor-config/mcp.json`](../../examples/cursor-config/mcp.json)

This package is prepared for distribution, but the repository does not claim an npm release until a verifiable release states the published version. See [the local bridge guide](../../docs/local-plugin-bridge.md) and [release policy](../../docs/releasing.md).
