# figma-mcp-free CLI

Two read-only command-line interfaces are shipped from this package:

- `figma-mcp-free` for Figma REST API workflows;
- `figma-mcp-free-bridge` for the authenticated Local Plugin Bridge.

The package is prepared for distribution but is not published from this repository yet.

## REST CLI

```bash
figma-mcp-free doctor "<FIGMA_URL>"
figma-mcp-free inspect-selection "<FIGMA_URL>" --depth 2 --max-children 20
figma-mcp-free nodes "<FIGMA_URL>" 1:2 3:4 5:6 --depth 2
figma-mcp-free generate "<FIGMA_URL>" --framework react
figma-mcp-free generate-many "<FIGMA_URL>" 1:2 3:4 --framework react --out-dir ./generated
```

REST commands read `FIGMA_TOKEN` first and otherwise use the protected config created by:

```bash
figma-mcp-free init
```

Use `figma-mcp-free config security` to inspect local config permissions without revealing the token.

## Local Plugin Bridge CLI

Start the loopback server:

```bash
figma-mcp-free-bridge serve
```

Then configure the client-side commands with environment variables:

```bash
export FIGMA_PLUGIN_BRIDGE_URL="http://127.0.0.1:3845"
export FIGMA_PLUGIN_BRIDGE_TOKEN="<PAIRING_TOKEN>"

figma-mcp-free-bridge status
figma-mcp-free-bridge current
figma-mcp-free-bridge inspect --depth 2 --max-children 20
figma-mcp-free-bridge generate --framework react
figma-mcp-free-bridge clear
```

The bridge binds to loopback, requires authentication, keeps one snapshot in memory, and exposes no Figma write command.

## Source-checkout development

```bash
pnpm install --frozen-lockfile
pnpm -r build
pnpm --filter figma-mcp-free dev -- doctor
pnpm --filter figma-mcp-free bridge -- serve
```

See the [repository README](https://github.com/superdoccimo/figma-mcp-free#readme) and [Local Plugin Bridge guide](../../plugins/local-bridge/README.md).
