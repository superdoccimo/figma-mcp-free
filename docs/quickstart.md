# Quickstart

## Requirements

- Node.js 18 or newer
- pnpm 9
- A Figma Personal Access Token only for live REST reads

Normal build, tests, offline demo and fork checks do not require a token.

## 1. Clone and verify

```bash
git clone https://github.com/superdoccimo/figma-mcp-free.git
cd figma-mcp-free
pnpm install --frozen-lockfile
pnpm check
```

Fork clone:

```bash
git clone https://github.com/<YOU>/figma-mcp-free.git
cd figma-mcp-free
git remote add upstream https://github.com/superdoccimo/figma-mcp-free.git
pnpm install --frozen-lockfile
pnpm check:fork
```

## 2. Run the offline demo

```bash
pnpm --filter figma-mcp-free dev -- generate-from-json ./examples/sample-node.json --framework react --use-tokens ./examples/sample-tokens.json
```

This confirms installation and generation without calling Figma.

## 3. Configure live access

```bash
pnpm --filter figma-mcp-free dev -- init
```

Alternatively set `FIGMA_TOKEN` in the process environment. The environment takes precedence over local configuration.

Do not commit the token or paste it into an issue.

## 4. Copy a selected-layer link

Supported shapes:

```text
https://www.figma.com/design/<FILE_ID>/...?node-id=1-2
https://www.figma.com/file/<FILE_ID>/...?node-id=1-2
```

The URL parser normalizes common numeric share-link node IDs from `1-2` to `1:2`.

`/slides` links are not supported by the current REST workflow.

## 5. Diagnose before generating

```bash
FIGMA_URL="https://www.figma.com/design/<FILE_ID>/...?node-id=1-2"
pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL"
pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL" --json
```

Sanitize JSON output before sharing it.

## 6. Inspect and generate

```bash
pnpm --filter figma-mcp-free dev -- inspect-selection "$FIGMA_URL" --depth 2 --max-children 20
pnpm --filter figma-mcp-free dev -- components "$FIGMA_URL" --query Button --limit 5
pnpm --filter figma-mcp-free dev -- export-tokens "$FIGMA_URL" > tokens.json
pnpm --filter figma-mcp-free dev -- generate "$FIGMA_URL" --framework react --use-tokens ./tokens.json > out.jsx
```

Generated code is a starter and still requires accessibility, responsive, interaction, asset and visual review.

## 7. Start the MCP server

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

Use one of the examples as a starting point:

- [`examples/codex-config/mcp.json`](../examples/codex-config/mcp.json)
- [`examples/cursor-config/mcp.json`](../examples/cursor-config/mcp.json)

## 8. Audit forks

```bash
pnpm fork:audit
```

This compares all public forks with upstream without modifying them.

## Package installation status

Do not assume an npm package is public merely because a package manifest exists. Until a verifiable GitHub Release identifies published versions, use the source checkout workflow above.
