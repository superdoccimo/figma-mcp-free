# figma-mcp-free CLI

Command-line interface for local setup, diagnostics, selected-layer inspection, design-token export and starter-code generation.

## Source usage

```bash
pnpm install --frozen-lockfile
pnpm -r build
pnpm --filter figma-mcp-free dev -- --help
```

Common commands:

```bash
pnpm --filter figma-mcp-free dev -- init
pnpm --filter figma-mcp-free dev -- doctor "<FIGMA_URL>" --json
pnpm --filter figma-mcp-free dev -- inspect-selection "<FIGMA_URL>" --depth 2 --max-children 20
pnpm --filter figma-mcp-free dev -- components "<FIGMA_URL>" --query Button --limit 5
pnpm --filter figma-mcp-free dev -- export-tokens "<FIGMA_URL>"
pnpm --filter figma-mcp-free dev -- generate "<FIGMA_URL>" --framework react
```

Offline generation:

```bash
pnpm --filter figma-mcp-free dev -- generate-from-json ./examples/sample-node.json --framework react --use-tokens ./examples/sample-tokens.json
```

`doctor --json` is intended for sanitized machine-readable diagnostics. It must not print the token value.

This package is not advertised as an npm-installed executable until a verifiable release confirms publication. See the root [README](../../README.md) and [release policy](../../docs/releasing.md).
