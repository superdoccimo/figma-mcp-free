# figma-mcp-free Command Reference

These commands describe the current repository. They do not publish packages or write to Figma.

## Install and verify

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run pack:check
```

`pnpm run check` performs build, typecheck, unit/fixture/security tests, offline smoke tests, secret scanning, fork-portability checks, and Local Plugin integrity checks.

## Offline generator

```bash
pnpm --filter figma-mcp-free dev -- \
  generate-from-json ./examples/sample-node.json \
  --framework react \
  --use-tokens ./examples/sample-tokens.json
```

## REST mode

Configure a PAT:

```bash
export FIGMA_TOKEN="figd_..."
# or
pnpm --filter figma-mcp-free dev -- init
```

Diagnose:

```bash
FIGMA_URL="https://www.figma.com/design/<FILE_ID>/Example?node-id=1-2"
pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL"
```

Read and inspect:

```bash
pnpm --filter figma-mcp-free dev -- file "$FIGMA_URL" --depth 2
pnpm --filter figma-mcp-free dev -- nodes "$FIGMA_URL" 1:2 3:4 5:6 --depth 2
pnpm --filter figma-mcp-free dev -- inspect-selection "$FIGMA_URL" --depth 2 --max-children 20
pnpm --filter figma-mcp-free dev -- frames "$FIGMA_URL" --depth 3
pnpm --filter figma-mcp-free dev -- components "$FIGMA_URL" --query Button --limit 20 --json
```

Tokens and code:

```bash
pnpm --filter figma-mcp-free dev -- export-tokens "$FIGMA_URL" > tokens.json
pnpm --filter figma-mcp-free dev -- generate "$FIGMA_URL" --framework react --use-tokens ./tokens.json
pnpm --filter figma-mcp-free dev -- generate-many "$FIGMA_URL" 1:2 3:4 \
  --framework react \
  --out-dir ./generated
```

Use `--refresh` only when a fresh REST read is required.

## Local Plugin Bridge

Start the bridge:

```bash
pnpm --filter figma-mcp-free bridge -- serve
```

Generate a local Figma development manifest:

```bash
node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID>
```

After using the plugin's **Capture & Send** button:

```bash
export FIGMA_PLUGIN_BRIDGE_URL="http://127.0.0.1:3845"
export FIGMA_PLUGIN_BRIDGE_TOKEN="<PAIRING_TOKEN>"

node packages/cli/dist/bridge-cli.js status
node packages/cli/dist/bridge-cli.js current
node packages/cli/dist/bridge-cli.js inspect --depth 2 --max-children 20
node packages/cli/dist/bridge-cli.js generate --framework react
node packages/cli/dist/bridge-cli.js clear
```

## MCP server

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

MCP configuration examples:

- `examples/codex-config/mcp.json`
- `examples/cursor-config/mcp.json`
- `examples/local-plugin-config/mcp.json`

## Fork intelligence

```bash
GITHUB_TOKEN=... node tools/audit-forks.mjs --repo owner/repository
```

In a fork, the script detects the upstream parent automatically. Add `--all` to inspect the upstream fork network.

## Focused checks

```bash
pnpm run build
pnpm run typecheck
pnpm run test
pnpm run smoke
pnpm run check:secrets
pnpm run check:portability
pnpm run check:plugin
pnpm run pack:check
```

## Commands intentionally absent

There is no command for:

- writing to Figma;
- publishing to npm;
- publishing a Figma Community plugin;
- exposing the Local Plugin Bridge on a LAN or public URL.

Those are separate, approval-gated operations.
