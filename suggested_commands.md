# Verified Command Reference

These commands are intended for a source checkout. The repository does not advertise npm installation until a verifiable release confirms publication.

## Install and complete verification

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

## Offline generation

```bash
pnpm --filter figma-mcp-free dev -- generate-from-json ./examples/sample-node.json --framework react --use-tokens ./examples/sample-tokens.json
pnpm --filter figma-mcp-free dev -- generate-from-json ./examples/sample-node.json --framework vue
pnpm --filter figma-mcp-free dev -- generate-from-json ./examples/sample-node.json --framework svelte
pnpm --filter figma-mcp-free dev -- generate-from-json ./examples/sample-node.json --framework html
```

## Configure and diagnose live access

```bash
pnpm --filter figma-mcp-free dev -- init
FIGMA_URL="https://www.figma.com/design/<FILE_ID>/...?node-id=1-2"
pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL"
pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL" --json
```

## Inspect and generate

```bash
pnpm --filter figma-mcp-free dev -- inspect-selection "$FIGMA_URL" --depth 2 --max-children 20
pnpm --filter figma-mcp-free dev -- components "$FIGMA_URL" --query Button --limit 5
pnpm --filter figma-mcp-free dev -- export-tokens "$FIGMA_URL" > tokens.json
pnpm --filter figma-mcp-free dev -- generate "$FIGMA_URL" --framework react --use-tokens ./tokens.json > out.jsx
```

## Start MCP server

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

## Focused developer checks

```bash
pnpm run build
pnpm run typecheck
pnpm run test
pnpm run smoke
pnpm run check:secrets
pnpm run check:fork
pnpm run pack:check
git diff --check
```

## Fork maintenance

```bash
git remote add upstream https://github.com/superdoccimo/figma-mcp-free.git
git fetch upstream
git switch main
git merge --ff-only upstream/main
pnpm check:fork
pnpm fork:audit
pnpm fork:audit:json > fork-audit.json
```

## PowerShell environment example

```powershell
$env:FIGMA_TOKEN = "..."
$env:FIGMA_URL = "https://www.figma.com/design/<FILE_ID>/...?node-id=1-2"
pnpm --filter figma-mcp-free dev -- doctor $env:FIGMA_URL
```

Never paste a real token, private file ID or private design text into an issue or shared transcript.
