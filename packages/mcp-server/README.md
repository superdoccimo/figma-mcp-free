# @figma-mcp-free/server

Read-only MCP STDIO server for the `figma-mcp-free` workspace.

## Start from source

```bash
pnpm install --frozen-lockfile
pnpm -r build
node packages/mcp-server/dist/index.js
```

The server reads `FIGMA_TOKEN` from the environment first, then falls back to local configuration created by the CLI.

## Tools

- `get_file`
- `inspect_selection`
- `get_components`
- `list_frames`
- `generate_code`
- `export_tokens`

Tool input is untrusted. File IDs, URLs, node IDs, depth, child limits and framework choices must remain schema-validated and bounded.

The server is read-only. It does not expose arbitrary shell execution, unrestricted file access, browser control or Figma write operations.

Example client configurations:

- [`examples/codex-config/mcp.json`](../../examples/codex-config/mcp.json)
- [`examples/cursor-config/mcp.json`](../../examples/cursor-config/mcp.json)

This package is prepared for distribution, but the repository does not claim an npm release until a verifiable release states the published version. See [docs/releasing.md](../../docs/releasing.md).
