# Local Plugin MCP configuration example

This example connects an MCP client to the latest snapshot captured by the authenticated Local Plugin Bridge. It does not require `FIGMA_TOKEN` and does not consume a Figma REST API call.

## Setup

1. Build the repository.
2. Start `figma-mcp-free-bridge serve`.
3. Capture a Figma selection through the development plugin.
4. Copy `mcp.json` into the MCP client's expected configuration location.
5. Replace the server entry path with an absolute filesystem path.
6. Replace the pairing-token placeholder with the token printed by the running bridge.
7. Restart the MCP client.

Do not commit the configured file after inserting a real pairing token.

Plugin tools made available by the server:

- `get_plugin_bridge_status`
- `get_current_selection`
- `inspect_current_selection`
- `generate_current_selection`

To enable REST tools in the same server, inject `FIGMA_TOKEN` as an additional environment value. Keep credentials in the client configuration only when that configuration is stored securely and excluded from source control.
