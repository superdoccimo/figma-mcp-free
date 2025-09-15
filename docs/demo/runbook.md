# Demo Runbook (from a clean clone)

Prereqs
- Node.js 18+ and pnpm installed
- FIGMA_TOKEN with file read access
- Known good `FILE_ID` and `NODE_ID` (test beforehand)

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
pnpm --filter figma-mcp-free dev -- config set token <FIGMA_TOKEN>
pnpm --filter figma-mcp-free dev -- config get token
```
- Explore components
```
pnpm --filter figma-mcp-free dev -- components <FILE_ID> --query Button --limit 5
```
- Generate code and tokens
```
pnpm --filter figma-mcp-free dev -- generate <FILE_ID> <NODE_ID> --framework react > out-no-tokens.jsx
pnpm --filter figma-mcp-free dev -- export-tokens <FILE_ID> > tokens.json
pnpm --filter figma-mcp-free dev -- generate <FILE_ID> <NODE_ID> --framework react --use-tokens ./tokens.json > out-with-tokens.jsx
```
- Show differences
```
rg "var\(" out-with-tokens.jsx
```

Scripted path
- Use `./scripts/demo.sh` with env vars: `FIGMA_TOKEN`, `FILE_ID`, `NODE_ID`.

Offline fallback
- Use a sample node + tokens:
```
pnpm --filter figma-mcp-free dev -- generate-from-json ./examples/sample-node.json --framework react --use-tokens ./examples/sample-tokens.json
```

