#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${MODE:-offline}"
OUT_DIR="${OUT_DIR:-demo-out}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Install pnpm 9 first." >&2
  exit 1
fi

if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
  echo "[setup] Installing locked dependencies"
  pnpm install --frozen-lockfile
fi

echo "[setup] Building workspace"
pnpm -r build

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

case "$MODE" in
  offline)
    echo "[offline] Generating from public local fixtures"
    pnpm --filter figma-mcp-free dev -- \
      generate-from-json ./examples/sample-node.json \
      --framework react \
      --use-tokens ./examples/sample-tokens.json \
      > "$OUT_DIR/sample-react.tsx"
    cp ./examples/sample-tokens.json "$OUT_DIR/sample-tokens.json"
    ;;

  rest)
    if [[ -z "${FIGMA_TOKEN:-}" || -z "${FIGMA_URL:-}" ]]; then
      echo "REST demo requires FIGMA_TOKEN and a /file or /design FIGMA_URL with node-id." >&2
      echo 'Example: MODE=rest FIGMA_TOKEN=... FIGMA_URL="https://www.figma.com/design/...?..." ./scripts/demo.sh' >&2
      exit 1
    fi

    echo "[rest] Running safe diagnostics"
    pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL" --json > "$OUT_DIR/doctor.json"

    echo "[rest] Capturing bounded implementation context"
    pnpm --filter figma-mcp-free dev -- \
      inspect-selection "$FIGMA_URL" \
      --depth 2 \
      --max-children 20 \
      > "$OUT_DIR/selection-context.json"

    echo "[rest] Exporting tokens and generating starter code"
    pnpm --filter figma-mcp-free dev -- export-tokens "$FIGMA_URL" > "$OUT_DIR/tokens.json"
    pnpm --filter figma-mcp-free dev -- \
      generate "$FIGMA_URL" \
      --framework react \
      --use-tokens "$OUT_DIR/tokens.json" \
      > "$OUT_DIR/generated-react.tsx"
    ;;

  plugin)
    if [[ -z "${FIGMA_PLUGIN_BRIDGE_TOKEN:-}" ]]; then
      echo "Plugin demo requires FIGMA_PLUGIN_BRIDGE_TOKEN and a running bridge with a captured selection." >&2
      echo 'Example: MODE=plugin FIGMA_PLUGIN_BRIDGE_TOKEN=... ./scripts/demo.sh' >&2
      exit 1
    fi

    export FIGMA_PLUGIN_BRIDGE_URL="${FIGMA_PLUGIN_BRIDGE_URL:-http://127.0.0.1:3845}"

    echo "[plugin] Checking bridge and reading the explicit snapshot"
    node packages/cli/dist/bridge-cli.js status > "$OUT_DIR/bridge-status.json"
    node packages/cli/dist/bridge-cli.js current > "$OUT_DIR/plugin-snapshot.json"
    node packages/cli/dist/bridge-cli.js \
      inspect \
      --depth 2 \
      --max-children 20 \
      > "$OUT_DIR/selection-context.json"
    node packages/cli/dist/bridge-cli.js \
      generate \
      --framework react \
      > "$OUT_DIR/generated-react.tsx"
    ;;

  *)
    echo "Unknown MODE: $MODE. Use offline, rest, or plugin." >&2
    exit 1
    ;;
esac

cat <<EOF
Demo complete: $OUT_DIR
Mode: $MODE

The output directory is created with the current process umask and may contain private design text in REST or Plugin mode.
Review it locally and do not commit private output.
EOF
