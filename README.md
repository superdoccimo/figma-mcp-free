# figma-mcp-free

![CI](https://github.com/superdoccimo/figma-mcp-free/actions/workflows/ci.yml/badge.svg)
[![CodeQL](https://github.com/superdoccimo/figma-mcp-free/actions/workflows/codeql.yml/badge.svg)](https://github.com/superdoccimo/figma-mcp-free/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Quota-aware, read-only Figma tooling for MCP clients, terminals, and code-generation workflows.

`figma-mcp-free` lets Claude, Cursor, Codex, Windsurf, Cline, and local scripts inspect Figma designs, batch-read nodes, export design tokens, and generate starter React, Vue, Svelte, or HTML code.

It now supports two complementary read paths:

| Mode | Best for | Figma PAT | REST quota | Figma Desktop |
| --- | --- | --- | --- | --- |
| **Local Plugin Bridge** | The design currently open and selected in Figma | Not required | Not used | Required |
| **REST mode** | Headless jobs, URLs, CI, remote automation, full-file reads | Required | Used carefully | Not required |

Neither mode adds Figma write tools. The project does not replace Figma Dev Mode or the official Figma MCP server.

## Why This Project Exists

Figma REST API limits depend on endpoint, seat, plan, and resource location. This project treats each REST call as a budgeted resource:

- multiple node IDs are batched into one request where possible;
- identical in-flight calls are joined;
- successful responses use a bounded, short-lived memory cache;
- `refresh` explicitly bypasses a cached value;
- long `Retry-After` responses are surfaced instead of retried wastefully;
- rate-limit metadata is preserved in safe diagnostics;
- large responses can be depth-bounded or transformed into compact selection context.

For an open design, the Local Plugin Bridge can export the selected nodes as REST-shaped JSON inside Figma and pass one authenticated snapshot over loopback. That path does not require a Personal Access Token or consume a Figma REST call.

See Figma's official [REST API rate-limit documentation](https://developers.figma.com/docs/rest-api/rate-limits/) for current limits. Figma can change these limits.

## Highlights

- One MCP server for REST and Local Plugin selection tools.
- Explicit-capture Figma development plugin using `JSON_REST_V1`.
- Authenticated, loopback-only, memory-only local bridge.
- Dedicated `figma-mcp-free-bridge` CLI.
- `inspect_selection` and `inspect_current_selection` for compact implementation context.
- `get_nodes` and `generate-many` for quota-efficient batches.
- Retry, timeout, rate-limit metadata, cache statistics, and cache controls.
- W3C-style design tokens for color, size, spacing, typography, and shadows.
- React, Vue, Svelte, and HTML starter generation.
- Protected local PAT storage with atomic replacement and owner-only POSIX permissions.
- Read-only fork-network auditing and contribution provenance.
- CI on Node.js 18, 20, and 22 with build, typecheck, tests, smoke tests, secret checks, plugin-integrity checks, package checks, and fork-portability checks.
- CodeQL analysis plus pull-request dependency review for newly introduced high-severity vulnerabilities.

## Install From Source

Packages are prepared for distribution but are not published from this repository yet.

```bash
git clone https://github.com/superdoccimo/figma-mcp-free.git
cd figma-mcp-free
pnpm install --frozen-lockfile
pnpm -r build
```

## Try It Offline

```bash
pnpm --filter figma-mcp-free dev -- \
  generate-from-json ./examples/sample-node.json \
  --framework react \
  --use-tokens ./examples/sample-tokens.json
```

This does not contact Figma.

# Local Plugin Bridge

Use this mode when the target design is open in Figma Desktop.

## 1. Start the authenticated loopback bridge

```bash
pnpm --filter figma-mcp-free bridge -- serve
```

The command prints:

- the loopback URL, normally `http://127.0.0.1:3845`;
- a random pairing token;
- confirmation that the bridge is read-only and memory-only.

Keep that terminal open. Treat the pairing token as sensitive.

## 2. Prepare the Figma development plugin

Figma assigns plugin IDs. Create a development plugin once in Figma Desktop, copy its generated numeric ID, then run:

```bash
node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID>
```

Import `plugins/local-bridge/manifest.json` as a development plugin. The generated manifest is ignored by Git.

## 3. Capture the current selection

1. Open **figma-mcp-free Local Bridge** in Figma.
2. Paste the bridge URL and pairing token.
3. Test the connection.
4. Select one or more nodes.
5. Press **Capture & Send**.

Nothing is transmitted merely because the selection changed. The plugin sends only after the button press.

## 4. Inspect or generate from the bridge CLI

```bash
export FIGMA_PLUGIN_BRIDGE_URL="http://127.0.0.1:3845"
export FIGMA_PLUGIN_BRIDGE_TOKEN="<PAIRING_TOKEN>"

node packages/cli/dist/bridge-cli.js status
node packages/cli/dist/bridge-cli.js current
node packages/cli/dist/bridge-cli.js inspect --depth 2 --max-children 20
node packages/cli/dist/bridge-cli.js generate --framework react
```

For multiple captured nodes, choose `--index 1`, `--index 2`, and so on.

Full setup and troubleshooting: [Local Figma Plugin Bridge](plugins/local-bridge/README.md).

# REST Mode

Use this mode for URL-based reads, full files, automation, CI, or machines without Figma Desktop.

## 1. Configure a Personal Access Token

Prefer `FIGMA_TOKEN` for temporary sessions and CI. To store one in the protected local config:

```bash
pnpm --filter figma-mcp-free dev -- init
```

## 2. Diagnose a selected node

```bash
FIGMA_URL="https://www.figma.com/design/<FILE_ID>/Example?node-id=1-2"
pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL"
```

## 3. Inspect, batch-read, or generate

```bash
pnpm --filter figma-mcp-free dev -- inspect-selection "$FIGMA_URL" --depth 2 --max-children 20

pnpm --filter figma-mcp-free dev -- nodes "$FIGMA_URL" 1:2 3:4 5:6 --depth 2

pnpm --filter figma-mcp-free dev -- generate "$FIGMA_URL" --framework react > Card.tsx

pnpm --filter figma-mcp-free dev -- generate-many "$FIGMA_URL" 1:2 3:4 5:6 \
  --framework react \
  --out-dir ./generated
```

`generate-many` batches node reads and writes a manifest beside the generated files.

## REST CLI Commands

| Command | Purpose |
| --- | --- |
| `init` | Save a PAT without printing it. |
| `doctor` | Check runtime, token state, permissions, URL parsing, and optional API access. |
| `file` | Fetch a Figma file with optional depth. |
| `nodes` | Batch-fetch multiple node IDs. |
| `frames` | List frames from a file. |
| `inspect-selection` | Produce bounded implementation context. |
| `components` | Search component metadata. |
| `export-tokens` | Export W3C-style token JSON. |
| `generate` | Generate starter code for one node. |
| `generate-many` | Batch-fetch and generate multiple nodes. |
| `generate-from-json` | Generate offline from a local fixture. |
| `config get token` | Show only whether a token exists. |
| `config security` | Inspect local config permissions. |

Network-reading commands accept `--refresh`.

# MCP Server

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

Example configurations:

- [`examples/codex-config/mcp.json`](examples/codex-config/mcp.json)
- [`examples/cursor-config/mcp.json`](examples/cursor-config/mcp.json)
- [`examples/local-plugin-config/mcp.json`](examples/local-plugin-config/mcp.json)

Configure either or both backends in the MCP server environment:

```json
{
  "env": {
    "FIGMA_TOKEN": "<OPTIONAL_REST_PAT>",
    "FIGMA_PLUGIN_BRIDGE_URL": "http://127.0.0.1:3845",
    "FIGMA_PLUGIN_BRIDGE_TOKEN": "<OPTIONAL_PAIRING_TOKEN>"
  }
}
```

Credentials are not accepted as MCP tool arguments.

## MCP Tools

### REST tools

| Tool | Purpose |
| --- | --- |
| `get_file` | Raw file read with optional depth and refresh. |
| `get_nodes` | Quota-efficient batch node read. |
| `inspect_selection` | Compact context for one REST node. |
| `get_components` | Component metadata search. |
| `list_frames` | Frame discovery. |
| `export_tokens` | Token extraction. |
| `generate_code` | Starter UI code generation. |
| `get_cache_stats` | Request, retry, cache, and deduplication counters. |
| `clear_cache` | Remove process-local REST cache entries. |

### Local Plugin tools

| Tool | Purpose |
| --- | --- |
| `get_plugin_bridge_status` | Confirm bridge and snapshot state. |
| `get_current_selection` | Read one captured node. |
| `inspect_current_selection` | Build compact context without a REST call. |
| `generate_current_selection` | Generate starter code without a REST call. |

## Environment Tuning

| Variable | Default | Meaning |
| --- | ---: | --- |
| `FIGMA_MCP_CACHE_TTL_MS` | `300000` | REST response lifetime in memory. Use `0` to disable. |
| `FIGMA_MCP_MAX_CACHE_ENTRIES` | `128` | Maximum REST cache entries. |
| `FIGMA_MCP_REQUEST_TIMEOUT_MS` | `20000` | REST timeout per attempt. |
| `FIGMA_MCP_MAX_RETRIES` | `2` | REST retry count for transient failures. |
| `FIGMA_MCP_NODE_BATCH_SIZE` | `100` | Maximum node IDs per REST batch. |
| `FIGMA_PLUGIN_BRIDGE_URL` | `http://127.0.0.1:3845` | Local bridge endpoint. |
| `FIGMA_PLUGIN_BRIDGE_TOKEN` | none | Required pairing token for plugin tools. |
| `FIGMA_PLUGIN_BRIDGE_TIMEOUT_MS` | `10000` | Local bridge request timeout. |

# Selected-Layer Vocabulary

`get_components` returns component metadata. It is not selected-layer implementation context.

`inspect_selection` and `inspect_current_selection` transform one node into a bounded schema containing layout, paint summaries, text, component information, effects, dimensions, and child summaries. Image bytes, raw private image references, vector path data, and unbounded child trees are omitted.

These tools are not Figma's official `get_design_context` and do not claim equivalent output.

# Forks Are First-Class

A read-only fork intelligence workflow discovers the canonical upstream from GitHub metadata, compares forks, and highlights unique downstream commits without pushing, merging, opening issues, or modifying forks.

```bash
GITHUB_TOKEN=... node tools/audit-forks.mjs --repo owner/repository
```

See [Forks, downstreams, and contribution flow](docs/forks.md). Operational code is checked for owner-specific paths so renamed forks can build and run normally.

A PAT permission improvement already recovered from the fork network is credited in [CHANGELOG.md](CHANGELOG.md).

# Security

- REST mode and Local Plugin mode expose no Figma write tools.
- The bridge binds only to loopback and rejects non-loopback clients by default.
- Every bridge request requires a pairing token.
- The bridge stores only the latest snapshot in memory.
- The plugin captures only after an explicit button press.
- Bridge credentials stay in process environment or the open plugin UI, not MCP schemas.
- Local PAT writes are atomic.
- On POSIX systems, the config directory uses `0700` and the token file uses `0600` where supported.
- Token values are not printed by `init`, `doctor`, or `config get token`.
- Never commit PATs, pairing tokens, private file IDs, raw private responses, or private selection output.

Sensitive reports should follow [SECURITY.md](SECURITY.md).

# Current Boundaries

- No create, edit, move, delete, or publish operations are provided.
- Code generation is a starter implementation, not a pixel-perfect compiler guarantee.
- `/slides` URLs are not supported by the REST pipeline.
- Images API URLs are temporary and should not be durable application assets.
- Local Plugin mode requires a development plugin and an open Figma Desktop document.
- Packages have not been published from this repository yet.

# Project Structure

| Area | Purpose |
| --- | --- |
| `packages/figma-client` | REST batching, cache, diagnostics, selection inspection, bridge server/client. |
| `packages/design-tokens` | W3C-style token extraction and lookup indexes. |
| `packages/code-generator` | React, Vue, Svelte, and HTML starter generation. |
| `packages/config` | Protected local PAT configuration. |
| `packages/mcp-server` | Unified REST and Local Plugin MCP server. |
| `packages/cli` | REST CLI and dedicated bridge CLI. |
| `plugins/local-bridge` | Explicit-capture Figma development plugin. |

Further reading:

- [Architecture](docs/architecture.md)
- [Local Plugin Bridge](plugins/local-bridge/README.md)
- [Quickstart](docs/quickstart.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Fork support](docs/forks.md)
- [Recommended repository settings](docs/repository-settings.md)
- [Roadmap](ROADMAP.md)
- [Japanese guide](jp/README.md)
- [Changelog](CHANGELOG.md)

# Contributing

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run pack:check
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Fork-originated fixes should include source commit and author provenance.
