# Quickstart

This guide walks through the minimum setup to run `figma-mcp-free` locally and call the tools from the CLI or an MCP client.

## 1. Install dependencies

```bash
pnpm install
pnpm -r build
```

Use Node.js 18+ and ensure `pnpm` is available (install with `npm install -g pnpm` if required).

## 2. Run the offline demo

Start here when you do not have a Figma token yet, or when you only want to verify the generator.

```bash
pnpm --filter figma-mcp-free dev -- generate-from-json ./examples/sample-node.json --framework react --use-tokens ./examples/sample-tokens.json
```

This command reads local JSON files only. It does not call the Figma API.

## 3. Store your Figma token

You can export a Personal Access Token from the Figma settings screen. Once copied, store it with the CLI so both the server and the CLI tools can find it later.

```bash
pnpm --filter figma-mcp-free dev -- init
```

Run non-interactively (CI/scripts) with `pnpm --filter figma-mcp-free dev -- init --token <FIGMA_TOKEN>`.

Verify the persisted config:

```bash
pnpm --filter figma-mcp-free dev -- config get token
```

If the environment variable `FIGMA_TOKEN` is present it takes precedence at runtime.

## 4. Prepare a Figma URL

Use a Figma `/file` or `/design` link to a selected frame or component. `/slides` links are not supported by this REST API workflow.

The CLI and MCP tools accept the full Figma URL and normalize URL node IDs such as `node-id=1-2` to the API format (`1:2`) automatically.

Optional verification:

```bash
curl -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/files/<FILE_ID>/nodes?ids=<NODE_ID>"
```

If JSON is returned, the token, file ID, and node ID are aligned.

## 5. Try the CLI

```bash
FIGMA_URL="https://www.figma.com/design/<FILE_ID>/...?node-id=1-2"
pnpm --filter figma-mcp-free dev -- components "$FIGMA_URL" --limit 3
pnpm --filter figma-mcp-free dev -- export-tokens "$FIGMA_URL" > tokens.json
pnpm --filter figma-mcp-free dev -- generate "$FIGMA_URL" --framework react --use-tokens ./tokens.json
```

You can still pass `<FILE_ID> <NODE_ID>` directly:

```bash
pnpm --filter figma-mcp-free dev -- generate <FILE_ID> <NODE_ID> --framework react
```

## 6. Start the MCP server

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

The server expects `FIGMA_TOKEN` in the environment or falls back to the stored token via `@figma-mcp-free/config`.

## 7. Connect from your IDE

- Claude Desktop / Claude Code: register the server JSON manifest.
- Cursor / Windsurf / Cline: add the STDIO server with the command above as the executable.

The server exposes these MCP tools:

- `get_file`
- `get_components`
- `list_frames`
- `generate_code`
- `export_tokens`

Each tool accepts either `fileId` or `figmaUrl`. `generate_code` can read `nodeId` from the URL when it includes `?node-id=...`.

For large files, MCP `get_file` and `list_frames` accept an optional `depth` value. For example, `depth: 2` limits the file payload to pages and their direct children.

Refer to `docs/troubleshooting.md` if calls fail due to token scopes, rate limiting, or manifest configuration issues.
