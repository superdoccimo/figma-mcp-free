# Demo Runbook (from a clean clone)

Prereqs
- Node.js 18+ and pnpm installed
- FIGMA_TOKEN with file read access
- Known good Figma `/file` or `/design` URL with `node-id` (test beforehand)

Steps
- Clone and setup
```
git clone https://github.com/superdoccimo/figma-mcp-free.git
cd figma-mcp-free
pnpm install
pnpm -r build
```
- Configure token (masked when reading back)
```
pnpm --filter figma-mcp-free dev -- init
pnpm --filter figma-mcp-free dev -- config get token
```
- Explore components
```
FIGMA_URL="https://www.figma.com/design/<FILE_ID>/...?node-id=1-2"
pnpm --filter figma-mcp-free dev -- components "$FIGMA_URL" --query Button --limit 5
```
- Generate code and tokens
```
pnpm --filter figma-mcp-free dev -- generate "$FIGMA_URL" --framework react > out-no-tokens.jsx
pnpm --filter figma-mcp-free dev -- export-tokens "$FIGMA_URL" > tokens.json
pnpm --filter figma-mcp-free dev -- generate "$FIGMA_URL" --framework react --use-tokens ./tokens.json > out-with-tokens.jsx
```
- Show differences
```
rg "var\(" out-with-tokens.jsx
```

Scripted path
- Use `./scripts/demo.sh` with env vars: `FIGMA_TOKEN`, `FILE_ID`, `NODE_ID`.
- Direct `<FILE_ID> <NODE_ID>` calls still work when you need script-friendly variables.

Offline fallback
- Use a sample node + tokens:
```
pnpm --filter figma-mcp-free dev -- generate-from-json ./examples/sample-node.json --framework react --use-tokens ./examples/sample-tokens.json
```
