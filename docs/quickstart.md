# Quickstart

This guide walks through the minimum setup to run `figma-mcp-free` locally and call the tools from the CLI or an MCP client.

## 1. Install dependencies

```bash
pnpm install
pnpm -r build
```

Use Node.js 18+ and ensure `pnpm` is available (install with `npm install -g pnpm` if required).

## 2. Store your Figma token

You can export a Personal Access Token from the Figma settings screen. Once copied, store it with the CLI so both the server and the CLI tools can find it later.

```bash
pnpm --filter figma-mcp-free dev -- config set token <FIGMA_TOKEN>
```

Verify the persisted config:

```bash
pnpm --filter figma-mcp-free dev -- config get token
```

If the environment variable `FIGMA_TOKEN` is present it takes precedence at runtime.

## 3. Try the CLI

```bash
pnpm --filter figma-mcp-free dev -- components <FILE_ID> --limit 3
pnpm --filter figma-mcp-free dev -- export-tokens <FILE_ID> > tokens.json
pnpm --filter figma-mcp-free dev -- generate <FILE_ID> <NODE_ID> --framework react --use-tokens ./tokens.json
```

Use `generate-from-json` with the sample assets in `examples/` when you do not have network access.

## 4. Start the MCP server

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

The server expects `FIGMA_TOKEN` in the environment or falls back to the stored token via `@figma-mcp-free/config`.

## 5. Connect from your IDE

- Claude Desktop / Claude Code: register the server JSON manifest.
- Cursor / Windsurf / Cline: add the STDIO server with the command above as the executable.

Each tool exposes three MCP endpoints:

- `get_components`
- `generate_code`
- `export_tokens`

Refer to `docs/troubleshooting.md` if calls fail due to token scopes, rate limiting, or manifest configuration issues.
