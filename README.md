# figma-mcp-free

![CI](https://github.com/superdoccimo/figma-mcp-free/actions/workflows/ci.yml/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Quota-aware, read-only Figma tooling for MCP clients, terminals, and code-generation workflows.

`figma-mcp-free` provides two explicit read paths:

1. a rate-aware Figma REST backend for files, nodes, components, tokens, and headless automation;
2. an authenticated, loopback-only Figma development-plugin bridge for a user-approved capture of the current selection without a PAT or REST request.

Both paths feed the same bounded inspection and React, Vue, Svelte, or HTML starter-code generation pipeline. Neither path writes to Figma.

## Capability Matrix

| Capability | REST backend | Local Plugin bridge |
| --- | --- | --- |
| Headless use | Yes | No, Figma Desktop and an explicit capture are required |
| Figma PAT | Required | Not required |
| Uses REST quota | Yes | No |
| Whole-file and component metadata | Yes | No |
| Current selected nodes | By file/node ID | Yes |
| MCP and CLI | Yes | Yes |
| Read-only | Yes | Yes |
| Remote service | Figma API | No, loopback only |
| Persistent snapshot | Bounded process cache only | One in-memory snapshot only |

This project does not replace Figma Dev Mode or the official Figma MCP server. It provides a transparent open-source read pipeline with explicit limits.

## Why This Project Exists

Figma REST API limits depend on endpoint, seat, plan, and resource location. This project treats network requests as a budgeted resource:

- node IDs are de-duplicated and batched;
- identical in-flight reads are joined;
- successful responses use a bounded, short-lived memory cache;
- a hard per-client request budget is available;
- short-lived failures retry within configured ceilings;
- long-lived or plan-related `429` responses fail fast with structured metadata;
- response size can be bounded by depth or transformed into compact selection context;
- the local Plugin bridge can capture the current selection without spending REST quota.

See Figma's official [REST API rate-limit documentation](https://developers.figma.com/docs/rest-api/rate-limits/) for current limits. Figma may change them.

## Features

- MCP STDIO server with stable, read-only tools.
- CLI for REST inspection, batch node reads, component search, token export, and code generation.
- Local bridge CLI for serving, listing, inspecting, generating from, and clearing the captured selection.
- Figma development plugin using `JSON_REST_V1` after an explicit **Capture & Send** action.
- Full `/file` and `/design` URL parsing with numeric `node-id=1-2` normalization to `1:2`.
- Bounded implementation context through `inspect_selection` and `inspect_current_selection`.
- W3C-style design tokens for colors, sizes, spacing, typography, and shadows.
- Retry, timeout, cache, rate-limit metadata, request-budget, and cache-control APIs.
- Protected local PAT storage with atomic replacement and owner-only POSIX permissions.
- Automated, read-only fork-network auditing and contribution provenance.
- CI across Node.js 18, 20, and 22 with build, typecheck, tests, smoke tests, secret checks, fork checks, Plugin boundary checks, and package-content checks.

## Try It Without Figma or a Token

```bash
git clone https://github.com/superdoccimo/figma-mcp-free.git
cd figma-mcp-free
pnpm install --frozen-lockfile
pnpm -r build
pnpm --filter figma-mcp-free dev -- \
  generate-from-json ./examples/sample-node.json \
  --framework react \
  --use-tokens ./examples/sample-tokens.json
```

The offline command does not contact Figma.

## REST Quickstart

1. Select a frame or component in Figma and copy a link to the selection.
2. Use a `/design` or `/file` URL. `/slides` is not supported by this REST workflow.
3. Store a PAT locally or provide `FIGMA_TOKEN` in the environment.

```bash
pnpm --filter figma-mcp-free dev -- init
```

4. Diagnose the environment and selected node.

```bash
FIGMA_URL="https://www.figma.com/design/<FILE_ID>/Example?node-id=1-2"
pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL"
```

5. Inspect, batch-read, or generate.

```bash
pnpm --filter figma-mcp-free dev -- inspect-selection "$FIGMA_URL" --depth 2 --max-children 20

pnpm --filter figma-mcp-free dev -- nodes "$FIGMA_URL" 1:2 3:4 5:6 --depth 2

pnpm --filter figma-mcp-free dev -- generate "$FIGMA_URL" --framework react > Card.tsx

pnpm --filter figma-mcp-free dev -- generate-many "$FIGMA_URL" 1:2 3:4 5:6 \
  --framework react \
  --out-dir ./generated
```

## Local Plugin Bridge Quickstart

The bridge is a development workflow, not a published Figma Community plugin.

### 1. Start the local server

```bash
pnpm --filter figma-mcp-free bridge -- serve
```

It prints a loopback URL, random session ID, and sensitive pairing token.

### 2. Generate a development manifest

Create a development plugin once in Figma Desktop, copy its numeric ID, then run:

```bash
node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID> [BRIDGE_PORT]
```

Import `plugins/local-bridge/manifest.json` as a development plugin.

### 3. Capture deliberately

1. Paste the loopback URL and pairing token into the plugin UI.
2. Select one or more nodes.
3. Press **Capture & Send**.

Nothing is sent when the selection merely changes. The plugin contains no Figma document-write APIs.

### 4. Use the snapshot

```bash
export FIGMA_PLUGIN_BRIDGE_URL=http://127.0.0.1:3845
export FIGMA_PLUGIN_BRIDGE_TOKEN='<PAIRING_TOKEN>'

pnpm --filter figma-mcp-free bridge -- status
pnpm --filter figma-mcp-free bridge -- current
pnpm --filter figma-mcp-free bridge -- inspect --index 0 --depth 2 --max-children 20
pnpm --filter figma-mcp-free bridge -- generate --index 0 --framework react
pnpm --filter figma-mcp-free bridge -- clear
```

See [Local Figma Plugin Bridge](docs/local-plugin-bridge.md) for setup, limits, threat model, and MCP configuration.

## CLI Commands

### REST and offline CLI

| Command | Purpose |
| --- | --- |
| `init` | Save a PAT without printing it. |
| `doctor` | Check Node, pnpm, token state, file permissions, URL parsing, and optional API access. |
| `file` | Fetch a Figma file with optional depth. |
| `nodes` | Batch-fetch multiple node IDs. |
| `frames` | List frames from a file. |
| `inspect-selection` | Produce bounded implementation context for one node. |
| `components` | Search component metadata. |
| `export-tokens` | Export W3C-style token JSON. |
| `generate` | Generate starter code for one node. |
| `generate-many` | Batch-fetch and generate multiple nodes. |
| `generate-from-json` | Generate offline from a local fixture. |
| `config get token` | Show only whether a token exists. |
| `config security` | Check local config file permissions. |

Network-reading commands accept `--refresh` to bypass the process-local cache.

### Local bridge CLI

| Command | Purpose |
| --- | --- |
| `serve` | Start the authenticated, bounded loopback server. |
| `status` | Show session and snapshot health. |
| `current` | Print the complete current snapshot. |
| `inspect` | Produce bounded context for one captured selection. |
| `generate` | Generate starter code from one captured selection. |
| `clear` | Remove the in-memory snapshot. |

Prefer `FIGMA_PLUGIN_BRIDGE_TOKEN` over `--token` so the token does not enter shell history.

## MCP Server

Build and start the STDIO server:

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

Example client configurations are in:

- [`examples/codex-config/mcp.json`](examples/codex-config/mcp.json)
- [`examples/cursor-config/mcp.json`](examples/cursor-config/mcp.json)

### REST MCP tools

| Tool | Purpose |
| --- | --- |
| `get_file` | Raw file read with optional depth and refresh. |
| `get_nodes` | Quota-efficient batch node read. |
| `inspect_selection` | Compact selected-layer context. |
| `get_components` | Component metadata search. |
| `list_frames` | Frame discovery. |
| `export_tokens` | Token extraction. |
| `generate_code` | Starter UI code generation. |
| `get_cache_stats` | Cache, request, retry, and de-duplication counters. |
| `clear_cache` | Remove process-local cached REST responses. |

### Local Plugin MCP tools

| Tool | Purpose |
| --- | --- |
| `get_plugin_bridge_status` | Confirm session and snapshot state. |
| `list_current_selections` | Return lightweight selection summaries before requesting full documents. |
| `get_current_selection` | Read one full captured node. |
| `inspect_current_selection` | Produce bounded implementation context without REST quota. |
| `generate_current_selection` | Generate starter code without REST quota. |

The bridge URL and token are process environment variables. They never appear in model-visible MCP tool schemas.

### Environment tuning

| Variable | Default | Meaning |
| --- | ---: | --- |
| `FIGMA_MCP_CACHE_TTL_MS` | `300000` | REST response lifetime in memory. Use `0` to disable. |
| `FIGMA_MCP_MAX_CACHE_ENTRIES` | `128` | Maximum cached REST request URLs. |
| `FIGMA_MCP_REQUEST_TIMEOUT_MS` | `20000` | Timeout per REST network attempt. |
| `FIGMA_MCP_MAX_RETRIES` | `2` | Retry count for transient REST failures. |
| `FIGMA_MCP_NODE_BATCH_SIZE` | `100` | Maximum node IDs per REST batch request. |
| `FIGMA_PLUGIN_BRIDGE_URL` | `http://127.0.0.1:3845` | Exact loopback bridge origin. |
| `FIGMA_PLUGIN_BRIDGE_TOKEN` | none | Sensitive pairing token printed by `serve`. |
| `FIGMA_PLUGIN_BRIDGE_TIMEOUT_MS` | `10000` | MCP-to-bridge request timeout. |

## Architecture

```text
REST path
Figma REST API -> rate-aware FigmaClient -> MCP / CLI -> inspect / tokens / generate

Local path
Figma selection -> explicit development-plugin capture -> authenticated loopback bridge
                -> MCP / bridge CLI -> inspect / generate
```

The paths share output consumers, not credentials. There is no silent fallback from REST to the Plugin bridge.

## Forks Are First-Class

The repository includes a read-only fork intelligence workflow. It detects its canonical upstream from GitHub metadata, compares forks, and highlights unique downstream commits without pushing, merging, opening issues, or modifying forks.

```bash
GITHUB_TOKEN=... node tools/audit-forks.mjs --repo owner/repository
```

See [Forks, downstreams, and contribution flow](docs/forks.md). Operational code is checked for owner-specific paths so a renamed fork can build and run normally.

## Security

REST controls:

- Prefer `FIGMA_TOKEN` for ephemeral sessions and CI secrets.
- Local config writes are atomic.
- On POSIX systems, the config directory is restricted to `0700` and the token file to `0600` where supported.
- Token values are never printed by `init`, `doctor`, or `config get token`.
- The REST cache is bounded, memory-only, and disappears when the process exits.

Local bridge controls:

- loopback-only bind and remote-address validation;
- loopback Host-header validation against DNS rebinding;
- high-entropy bearer token with timing-safe comparison;
- no non-loopback override;
- redirect refusal;
- one bounded, memory-only snapshot;
- request body, selection, node, depth, header, and timeout limits;
- no token persistence in the plugin;
- static checks for Figma write APIs.

Figma's plugin Fetch API requires wildcard CORS for reachable APIs, so the token and local transport controls are the authorization boundary. Never commit tokens, private file IDs, raw private API responses, captured snapshots, or generated manifests.

Sensitive reports should follow [SECURITY.md](SECURITY.md).

## Current Boundaries

- Neither backend can create, edit, move, delete, or publish Figma objects.
- The local bridge is a development plugin and still requires a real Figma Desktop smoke test before release.
- REST and Plugin APIs have different capabilities and limits.
- Code generation is a starter implementation, not a pixel-perfect compiler guarantee.
- `/slides` links are not supported by the REST pipeline.
- Images API URLs are temporary and should not be committed as durable assets.
- Packages are prepared and checked for distribution but are not published from this repository yet. Use a source checkout.

## Project Structure

| Path | Purpose |
| --- | --- |
| `packages/figma-client` | URL handling, REST batching, cache, retries, diagnostics, and local bridge protocol. |
| `packages/design-tokens` | W3C-style token extraction and lookup indexes. |
| `packages/code-generator` | React, Vue, Svelte, and HTML starter generation. |
| `packages/config` | Protected local configuration. |
| `packages/mcp-server` | MCP STDIO server for both read paths. |
| `packages/cli` | REST/offline CLI and local bridge CLI. |
| `plugins/local-bridge` | Read-only Figma development plugin. |
| `tools` | CI, fork, package, secret, and Plugin integrity checks. |

Further reading:

- [Documentation index](docs/README.md)
- [Local Plugin bridge](docs/local-plugin-bridge.md)
- [Architecture](docs/architecture.md)
- [REST quickstart](docs/quickstart.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Fork support](docs/forks.md)
- [Roadmap](ROADMAP.md)
- [Japanese guide](jp/README.md)
- [Changelog](CHANGELOG.md)

## Contributing

```bash
pnpm install --frozen-lockfile
pnpm run check
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Fork-originated fixes should include source commit and author provenance so useful downstream work does not disappear into branches.
