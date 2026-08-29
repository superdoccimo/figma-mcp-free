# Local Figma Plugin Bridge

This development plugin sends an explicitly captured Figma selection to the local `figma-mcp-free` bridge. It uses Figma's `JSON_REST_V1` export so the existing inspector and code generator can consume the current selection without a Figma Personal Access Token or a REST API request.

The bridge is deliberately narrow:

- it binds only to loopback;
- every request requires a pairing token;
- only one snapshot is kept in memory;
- nothing is sent until **Capture & Send** is pressed;
- the plugin does not create, edit, move, delete, or publish Figma nodes;
- the pairing token is not persisted by the plugin UI.

## 1. Build the workspace

```bash
pnpm install --frozen-lockfile
pnpm -r build
```

## 2. Start the bridge

From source:

```bash
pnpm --filter figma-mcp-free bridge -- serve
```

After a package install or build:

```bash
figma-mcp-free-bridge serve
```

The command prints a loopback URL and a random pairing token. Treat the token as sensitive and keep the terminal open.

Optional fixed token for an MCP client configuration:

```bash
FIGMA_PLUGIN_BRIDGE_TOKEN="replace-with-a-long-random-value" \
  figma-mcp-free-bridge serve
```

PowerShell:

```powershell
$env:FIGMA_PLUGIN_BRIDGE_TOKEN = "replace-with-a-long-random-value"
node packages/cli/dist/bridge-cli.js serve
```

## 3. Create a Figma development manifest

Figma assigns plugin IDs. In Figma Desktop, create a development plugin once and copy the generated numeric ID from its manifest. Then run:

```bash
node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID>
```

This creates the ignored local file `plugins/local-bridge/manifest.json`. Import that manifest in Figma Desktop as a development plugin.

The checked-in template allows no production domains and permits only these development endpoints:

```text
http://127.0.0.1:3845
http://localhost:3845
```

A custom port requires a corresponding local edit to `manifest.json` under `networkAccess.devAllowedDomains`.

## 4. Capture a selection

1. Open the development plugin.
2. Paste the URL and pairing token printed by the bridge server.
3. Press **Test connection**.
4. Select one or more supported Figma nodes.
5. Press **Capture & Send**.

The plugin exports each selected node as REST-compatible JSON and posts it to the authenticated loopback bridge. Selection changes are only summarized in the UI; they are not automatically exported or transmitted.

## 5. Use the snapshot from the CLI

```bash
export FIGMA_PLUGIN_BRIDGE_URL="http://127.0.0.1:3845"
export FIGMA_PLUGIN_BRIDGE_TOKEN="<PAIRING_TOKEN>"

figma-mcp-free-bridge status
figma-mcp-free-bridge current
figma-mcp-free-bridge inspect --depth 2 --max-children 20
figma-mcp-free-bridge generate --framework react
```

For multiple selected nodes, choose a zero-based index:

```bash
figma-mcp-free-bridge inspect --index 1
```

Clear the memory snapshot:

```bash
figma-mcp-free-bridge clear
```

## 6. Use the snapshot from MCP

Pass the bridge values to the MCP server process as environment variables. They are intentionally not accepted as model-visible tool arguments.

```json
{
  "mcpServers": {
    "figma-mcp-free": {
      "command": "node",
      "args": ["/absolute/path/figma-mcp-free/packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_PLUGIN_BRIDGE_URL": "http://127.0.0.1:3845",
        "FIGMA_PLUGIN_BRIDGE_TOKEN": "<PAIRING_TOKEN>"
      }
    }
  }
}
```

Plugin bridge tools:

- `get_plugin_bridge_status`
- `get_current_selection`
- `inspect_current_selection`
- `generate_current_selection`

REST tools remain available in the same MCP server when `FIGMA_TOKEN` is also configured.

## Troubleshooting

### Unauthorized

The token in the plugin or MCP environment differs from the token used by the running bridge. Restarting the bridge without a fixed environment token generates a new one.

### Network request blocked by Figma

Use the default port `3845`, or add the exact custom loopback URL to the generated development manifest's `devAllowedDomains`.

### No snapshot

Select a node and press **Capture & Send**. Merely changing the Figma selection does not transmit data.

### Unsupported node

`JSON_REST_V1` is available on many Figma scene-node types but not every possible selection. Capture a frame, component, instance, group, text, vector, or another supported exportable node.

### Sensitive content

The snapshot can contain layer names and text from the selected design. It is memory-only, but any MCP client that reads it can include that content in model context. Capture only material that is appropriate for the configured AI client.
