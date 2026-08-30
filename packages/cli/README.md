# figma-mcp-free CLI

Command-line interfaces for read-only Figma workflows.

This package installs two source-built executables:

- `figma-mcp-free`: REST and offline inspection, tokens, and generation;
- `figma-mcp-free-bridge`: authenticated local current-selection bridge operations.

The repository does not claim an npm release until a verifiable release states the published version.

## Build from source

```bash
pnpm install --frozen-lockfile
pnpm -r build
```

## REST and offline CLI

```bash
pnpm --filter figma-mcp-free dev -- init
pnpm --filter figma-mcp-free dev -- doctor "<FIGMA_URL>" --json
pnpm --filter figma-mcp-free dev -- inspect-selection "<FIGMA_URL>" --depth 2 --max-children 20
pnpm --filter figma-mcp-free dev -- nodes "<FIGMA_URL>" 1:2 3:4 --depth 2
pnpm --filter figma-mcp-free dev -- components "<FIGMA_URL>" --query Button --limit 5
pnpm --filter figma-mcp-free dev -- export-tokens "<FIGMA_URL>"
pnpm --filter figma-mcp-free dev -- generate "<FIGMA_URL>" --framework react
```

Offline generation:

```bash
pnpm --filter figma-mcp-free dev -- \
  generate-from-json ./examples/sample-node.json \
  --framework react \
  --use-tokens ./examples/sample-tokens.json
```

`doctor --json` is intended for sanitized machine-readable diagnostics. It must not print a PAT value.

## Local bridge CLI

Start the bounded loopback server:

```bash
pnpm --filter figma-mcp-free bridge -- serve
```

The command prints a loopback URL, random session ID, and sensitive pairing token. Keep that terminal open while the Figma development Plugin is paired.

Prefer environment variables for subsequent commands:

```bash
export FIGMA_PLUGIN_BRIDGE_URL=http://127.0.0.1:3845
export FIGMA_PLUGIN_BRIDGE_TOKEN='<PAIRING_TOKEN>'
```

```bash
pnpm --filter figma-mcp-free bridge -- status
pnpm --filter figma-mcp-free bridge -- current
pnpm --filter figma-mcp-free bridge -- inspect --index 0 --depth 2 --max-children 20
pnpm --filter figma-mcp-free bridge -- generate --index 0 --framework react
pnpm --filter figma-mcp-free bridge -- clear
```

`serve` limits can be reduced for tighter local operation:

```bash
pnpm --filter figma-mcp-free bridge -- serve \
  --max-body-mb 5 \
  --max-selections 10 \
  --max-nodes 2000 \
  --max-depth 32 \
  --request-timeout 5000
```

The bridge refuses non-loopback origins and redirects, stores one snapshot in memory, and has no write path back to Figma. Avoid `--token` unless necessary because command-line arguments can remain in shell history or process listings.

See the root [README](../../README.md), [local bridge guide](../../docs/local-plugin-bridge.md), and [release policy](../../docs/releasing.md).
