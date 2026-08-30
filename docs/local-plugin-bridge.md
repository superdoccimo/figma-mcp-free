# Local Figma Plugin Bridge

The local bridge is a second read path for the selection that is currently open in Figma Desktop. It avoids a Figma Personal Access Token for that capture and does not consume REST API quota.

It is deliberately not a remote service. The Figma development plugin sends data only after the user presses **Capture & Send**, and the Node.js bridge stores one bounded snapshot in memory.

## What ships

- A read-only Figma development plugin in `plugins/local-bridge`.
- An authenticated HTTP server restricted to loopback.
- A CLI for serving, inspecting, generating from, and clearing the current snapshot.
- MCP tools for status, lightweight selection listing, full selection reads, compact inspection, and starter-code generation.
- Static and runtime security checks.

The plugin uses Figma's `JSON_REST_V1` node export so the existing inspector and code generator can reuse the same REST-shaped document.

## Setup

### 1. Install and build

```bash
pnpm install --frozen-lockfile
pnpm -r build
```

### 2. Start the bridge

```bash
pnpm --filter figma-mcp-free bridge -- serve
```

The server prints:

- a loopback URL;
- a random session ID;
- a sensitive pairing token.

Keep the terminal open. The default token is generated from 32 random bytes and lives only for that server process.

Optional bounds:

```bash
pnpm --filter figma-mcp-free bridge -- serve \
  --port 3845 \
  --max-body-mb 10 \
  --max-selections 50 \
  --max-nodes 10000 \
  --max-depth 64 \
  --request-timeout 10000
```

For the Figma development plugin, use `127.0.0.1` or `localhost`. The generated manifest authorizes only those two loopback names.

### 3. Create a Figma development plugin ID

In Figma Desktop, create a new development plugin once and copy its numeric plugin ID. Then generate the untracked manifest for the same port used by the bridge:

```bash
node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID> [BRIDGE_PORT]
```

`BRIDGE_PORT` defaults to `3845`. For example, a bridge started with `--port 49152` requires:

```bash
node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID> 49152
```

Import `plugins/local-bridge/manifest.json` as a development plugin.

The tracked template permits no production domains. The generated development manifest permits only the selected port on:

- `http://127.0.0.1:<PORT>`
- `http://localhost:<PORT>`

Do not hand-edit `manifest.json` to add remote hosts or wildcard network access.

### 4. Pair and capture

1. Run the development plugin.
2. Paste the exact bridge URL and pairing token printed by the server.
3. Test the connection.
4. Select one or more nodes.
5. Press **Capture & Send**.

The token is kept only in the open plugin UI. It is not stored in Figma client storage, browser storage, a repository file, or the snapshot.

## CLI use

Set the token in an environment variable rather than shell history:

```bash
export FIGMA_PLUGIN_BRIDGE_URL=http://127.0.0.1:3845
export FIGMA_PLUGIN_BRIDGE_TOKEN='<PAIRING_TOKEN>'
```

Then:

```bash
pnpm --filter figma-mcp-free bridge -- status
pnpm --filter figma-mcp-free bridge -- current
pnpm --filter figma-mcp-free bridge -- inspect --index 0 --depth 2 --max-children 20
pnpm --filter figma-mcp-free bridge -- generate --index 0 --framework react
pnpm --filter figma-mcp-free bridge -- clear
```

## MCP configuration

The bridge token belongs in the MCP process environment, never in a model-visible tool argument.

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

Plugin tools:

| Tool | Purpose |
| --- | --- |
| `get_plugin_bridge_status` | Confirm the paired session and snapshot state. |
| `list_current_selections` | List names, IDs, types, and indexes without returning full documents. |
| `get_current_selection` | Read one complete captured REST-shaped node. |
| `inspect_current_selection` | Produce bounded implementation context without REST quota. |
| `generate_current_selection` | Generate React, Vue, Svelte, or HTML starter code without REST quota. |

REST tools continue to use `FIGMA_TOKEN`. The two read paths remain explicit rather than silently falling back between credentials and the local plugin.

## Security boundary

The bridge applies several independent controls:

- loopback-only bind;
- remote-address verification;
- loopback Host-header verification against DNS rebinding;
- 32-to-512-character bearer token and timing-safe comparison;
- redirect refusal in the CLI/MCP client and plugin UI;
- one in-memory snapshot;
- `Cache-Control: no-store`;
- request body, selection, node, depth, header, and timeout limits;
- `application/json` requirement for snapshot writes;
- no non-loopback escape hatch;
- no Figma document-write APIs in the development plugin;
- development-manifest network access limited to the selected loopback port.

Figma's plugin Fetch API requires CORS permission for the local endpoint. The bearer token and local transport controls therefore form the authorization boundary. Never paste the token into websites, issue reports, screenshots, shell history, or committed configuration.

## Deliberate limitations

- This is a development plugin, not a Figma Community publication.
- It captures only when the user presses the button.
- It is read-only and cannot apply generated code or changes back to Figma.
- It does not run as a remote or shared bridge.
- CI verifies the Node.js protocol and static plugin properties on Linux, Windows, and macOS, but a maintainer must still perform a Figma Desktop smoke test before release.
- Large or unusually deep selections can be rejected by design. Capture a narrower frame or component instead.

## Verification

```bash
pnpm run check:plugin
pnpm run test
pnpm run pack:check
```

The complete repository gate remains:

```bash
pnpm check
```
