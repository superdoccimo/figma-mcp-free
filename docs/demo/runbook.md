# Demo Runbook

This runbook supports three demos from a clean clone:

- offline fixtures, no credentials;
- REST mode, using an approved Figma URL and PAT;
- Local Plugin mode, using an explicit Figma Desktop capture.

Use synthetic or approved public design content. Never record a PAT, pairing token, Authorization header, private file ID, private snapshot, or private layer text.

## Shared setup

```bash
git clone https://github.com/superdoccimo/figma-mcp-free.git
cd figma-mcp-free
pnpm install --frozen-lockfile
pnpm -r build
```

## Demo A: offline

```bash
MODE=offline ./scripts/demo.sh
```

Expected files:

```text
demo-out/sample-react.tsx
demo-out/sample-tokens.json
```

This is the safest first demonstration because it makes no external request.

## Demo B: REST mode

Prerequisites:

- `FIGMA_TOKEN` in the environment;
- an approved `/file` or `/design` URL containing `node-id`.

```bash
export FIGMA_TOKEN="<PAT>"
export FIGMA_URL="https://www.figma.com/design/<FILE_ID>/Example?node-id=1-2"
MODE=rest ./scripts/demo.sh
```

The script does not persist the PAT. It runs:

1. `doctor --json`;
2. bounded `inspect-selection`;
3. token export;
4. React starter generation with tokens.

Expected files:

```text
demo-out/doctor.json
demo-out/selection-context.json
demo-out/tokens.json
demo-out/generated-react.tsx
```

REST output can contain private design text. Keep `demo-out` local and remove it after review.

For a batch demonstration:

```bash
pnpm --filter figma-mcp-free dev -- \
  nodes "$FIGMA_URL" 1:2 3:4 5:6 \
  --depth 2
```

Explain that batching, cache, in-flight deduplication, and bounded depth reduce unnecessary API traffic.

## Demo C: Local Plugin Bridge

Prerequisites:

- Figma Desktop;
- the development plugin imported from a Figma-issued plugin ID;
- a running bridge;
- an approved selected node.

Terminal 1:

```bash
pnpm --filter figma-mcp-free bridge -- serve
```

In Figma:

1. open the Local Bridge development plugin;
2. paste the loopback URL and pairing token;
3. press **Test connection**;
4. select a node;
5. press **Capture & Send**.

Terminal 2:

```bash
export FIGMA_PLUGIN_BRIDGE_URL="http://127.0.0.1:3845"
export FIGMA_PLUGIN_BRIDGE_TOKEN="<PAIRING_TOKEN>"
MODE=plugin ./scripts/demo.sh
```

Expected files:

```text
demo-out/bridge-status.json
demo-out/plugin-snapshot.json
demo-out/selection-context.json
demo-out/generated-react.tsx
```

Demonstrate these points explicitly:

- no `FIGMA_TOKEN` is configured;
- no REST call is needed for the captured selection;
- selection changes alone do not transmit data;
- the bridge is loopback-only and memory-only;
- no Figma write tool exists.

## MCP demonstration

Configure the MCP server with either backend or both. For a PAT-free Local Plugin example, copy:

```text
examples/local-plugin-config/mcp.json
```

Recommended sequence:

1. `get_plugin_bridge_status`;
2. `inspect_current_selection`;
3. `generate_current_selection`.

Do not ask the model to repeat environment variables or credentials.

## Quality demonstration

```bash
pnpm run check
pnpm run pack:check
```

Show:

- Node.js 18, 20, and 22 CI;
- bridge authentication tests;
- plugin-integrity checks;
- package tarball checks;
- fork portability;
- CodeQL;
- dependency review;
- weekly fork intelligence.

## Cleanup

```bash
rm -rf demo-out
node packages/cli/dist/bridge-cli.js clear || true
```

Stop the bridge process after the demonstration. Revoke any PAT that may have been exposed accidentally.
