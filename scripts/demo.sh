#!/usr/bin/env bash
set -euo pipefail

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Please install pnpm first." >&2
  exit 1
fi

if [[ -z "${FIGMA_TOKEN:-}" || -z "${FILE_ID:-}" || -z "${NODE_ID:-}" ]]; then
  echo "Usage: FIGMA_TOKEN=... FILE_ID=... NODE_ID=... ./scripts/demo.sh" >&2
  exit 1
fi

echo "[1/6] Install & build"
pnpm install
pnpm -r build

echo "[2/6] Save token"
pnpm --filter figma-mcp-free dev -- config set token "$FIGMA_TOKEN" >/dev/null
pnpm --filter figma-mcp-free dev -- config get token

echo "[3/6] List components (filtered example)"
pnpm --filter figma-mcp-free dev -- components "$FILE_ID" --query Button --limit 5 || true

mkdir -p demo-out

echo "[4/6] Generate (no tokens)"
pnpm --filter figma-mcp-free dev -- generate "$FILE_ID" "$NODE_ID" --framework react > demo-out/out-no-tokens.jsx

echo "[5/6] Export tokens"
pnpm --filter figma-mcp-free dev -- export-tokens "$FILE_ID" > demo-out/tokens.json

echo "[6/6] Generate (with tokens)"
pnpm --filter figma-mcp-free dev -- generate "$FILE_ID" "$NODE_ID" --framework react --use-tokens demo-out/tokens.json > demo-out/out-with-tokens.jsx

echo "Done. See demo-out/ for results."

