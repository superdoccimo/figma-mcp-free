# figma-mcp-free

![CI](https://github.com/superdoccimo/figma-mcp-free/actions/workflows/ci.yml/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Quota-aware, read-only Figma tooling for MCP clients, terminals, and code-generation workflows.

`figma-mcp-free` lets Claude, Cursor, Codex, Windsurf, Cline, and local scripts inspect Figma files, batch-read nodes, export design tokens, and generate starter React, Vue, Svelte, or HTML code through the public Figma REST API.

It does not replace Figma Dev Mode, the official Figma MCP server, or a write-capable Figma Plugin. REST mode is intentionally read-only.

## Why This Project Exists

Figma REST API limits depend on the endpoint, seat, plan, and resource location. Tier 1 endpoints such as `GET file` and `GET file nodes` can be especially scarce for View and Collab seats. This project therefore treats every request as a budgeted resource:

- multiple node IDs are batched into one `GET file nodes` request where possible;
- identical in-flight calls are joined instead of duplicated;
- successful responses are held in a bounded, short-lived in-memory cache;
- `refresh` explicitly bypasses a cached value;
- long `Retry-After` responses are surfaced rather than retried wastefully;
- Figma plan tier, limit type, and upgrade guidance are preserved in safe diagnostics;
- large responses can be bounded by depth or transformed into compact selection context.

See Figma's official [REST API rate-limit documentation](https://developers.figma.com/docs/rest-api/rate-limits/) for current limits. Figma reserves the right to change them.

## Features

- MCP STDIO server with stable, read-only tools.
- CLI for file inspection, batch node reads, component search, token export, and code generation.
- Full `/file` and `/design` URL parsing with `node-id=1-2` normalization to `1:2`.
- `inspect_selection` for compact, implementation-oriented selected-layer context.
- `get_nodes` and `generate-many` for quota-efficient batch workflows.
- Retry, timeout, rate-limit metadata, cache statistics, and explicit cache controls.
- W3C-style design tokens for colors, sizes, spacing, typography, and shadows.
- Offline fixtures for evaluating generators without a Figma token.
- Protected local PAT storage with atomic replacement and owner-only POSIX permissions.
- Automated, read-only fork-network auditing and contribution provenance.
- CI across Node.js 18, 20, and 22, including build, typecheck, tests, smoke tests, secret checks, package checks, and fork portability checks.

## Try It Without a Token

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

## Live Figma Quickstart

1. Select a frame or component in Figma and copy a link to the selection.
2. Use a `/design` or `/file` URL. `/slides` is not supported by this REST workflow.
3. Store a PAT locally or provide `FIGMA_TOKEN` in the environment.

```bash
pnpm --filter figma-mcp-free dev -- init
```

4. Diagnose the local environment and selected node.

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

`generate-many` fetches the requested nodes in batches and writes a manifest beside the generated files.

## CLI Commands

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

## MCP Server

Build and start the STDIO server:

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

Example client configurations are in:

- [`examples/codex-config/mcp.json`](examples/codex-config/mcp.json)
- [`examples/cursor-config/mcp.json`](examples/cursor-config/mcp.json)

The server reads `FIGMA_TOKEN` first, then the protected config created by `figma-mcp-free init`.

### MCP tools

| Tool | Purpose |
| --- | --- |
| `get_file` | Raw file read with optional depth and refresh. |
| `get_nodes` | Quota-efficient batch node read. |
| `inspect_selection` | Compact selected-layer context. |
| `get_components` | Component metadata search. |
| `list_frames` | Frame discovery. |
| `export_tokens` | Token extraction. |
| `generate_code` | Starter UI code generation. |
| `get_cache_stats` | Cache, request, retry, and deduplication counters. |
| `clear_cache` | Remove process-local cached responses. |

Existing tool names and inputs remain valid. New controls are optional.

Environment tuning:

| Variable | Default | Meaning |
| --- | ---: | --- |
| `FIGMA_MCP_CACHE_TTL_MS` | `300000` | In-memory response lifetime. Use `0` to disable. |
| `FIGMA_MCP_MAX_CACHE_ENTRIES` | `128` | Maximum cached request URLs. |
| `FIGMA_MCP_REQUEST_TIMEOUT_MS` | `20000` | Timeout per network attempt. |
| `FIGMA_MCP_MAX_RETRIES` | `2` | Retry count for transient failures. |
| `FIGMA_MCP_NODE_BATCH_SIZE` | `100` | Maximum node IDs per batch request. |

## Selected-Layer Vocabulary

`get_components` returns component metadata. It is not selected-layer implementation context.

`inspect_selection` transforms one REST node into a bounded schema containing layout, paint summaries, text, component information, effects, dimensions, and child summaries. Image bytes, private image references, vector path data, and unbounded child trees are omitted.

This tool is not Figma's official `get_design_context` and does not claim equivalent output.

## Forks Are First-Class

The repository includes a read-only fork intelligence workflow. It detects its canonical upstream from GitHub metadata, compares forks, and highlights unique downstream commits without pushing, merging, opening issues, or modifying forks.

```bash
GITHUB_TOKEN=... node tools/audit-forks.mjs --repo owner/repository
```

See [Forks, downstreams, and contribution flow](docs/forks.md). Operational code is checked for owner-specific paths so a renamed fork can build and run normally.

One concrete improvement already recovered from the fork network is owner-only PAT file permissions. The upstream adaptation preserves contributor provenance in [CHANGELOG.md](CHANGELOG.md).

## Security

- Prefer `FIGMA_TOKEN` for ephemeral sessions and CI secrets.
- Local config writes are atomic.
- On POSIX systems, the config directory is restricted to `0700` and the token file to `0600` where supported.
- Token values are never printed by `init`, `doctor`, or `config get token`.
- Never commit PATs, private file IDs, raw private API responses, or private `inspect_selection` output.
- The default cache is memory-only and disappears when the process exits.
- If a PAT leaks, revoke it in Figma and issue a replacement.

Sensitive reports should follow [SECURITY.md](SECURITY.md).

## Current Boundaries

- REST mode cannot create, edit, move, delete, or publish Figma objects.
- Figma Plugin and REST APIs have different capabilities and limits.
- Code generation is a starter implementation, not a pixel-perfect compiler guarantee.
- `/slides` links are not supported by the current REST pipeline.
- Images API URLs are temporary and should not be committed as durable application assets.
- Packages are prepared and checked for distribution but are not published from this repository yet. Use the source checkout workflow above.

A separately permissioned, read-only local Plugin bridge is tracked in [ROADMAP.md](ROADMAP.md). It will not silently turn REST tools into write-capable tools.

## Project Structure

| Package | Purpose |
| --- | --- |
| `@figma-mcp-free/figma-client` | URL handling, REST batching, cache, retries, diagnostics. |
| `@figma-mcp-free/design-tokens` | W3C-style token extraction and lookup indexes. |
| `@figma-mcp-free/code-generator` | React, Vue, Svelte, and HTML starter generation. |
| `@figma-mcp-free/config` | Protected local configuration. |
| `@figma-mcp-free/server` | MCP STDIO server. |
| `figma-mcp-free` | CLI. |

Further reading:

- [Architecture](docs/architecture.md)
- [Quickstart](docs/quickstart.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Fork support](docs/forks.md)
- [Roadmap](ROADMAP.md)
- [Japanese guide](jp/README.md)
- [Changelog](CHANGELOG.md)

## Contributing

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run pack:check
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Fork-originated fixes should include source commit and author provenance so useful downstream work does not disappear into the branches.
