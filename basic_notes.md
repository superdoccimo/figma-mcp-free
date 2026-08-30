# figma-mcp-free Architecture Snapshot

This file is a compact orientation note. The canonical requirements are in [`figma_mcp_requirements.md`](figma_mcp_requirements.md).

## Product definition

`figma-mcp-free` is a quota-aware, read-only Figma toolkit for MCP clients, terminals, and starter-code workflows. It is not an official Figma product and does not claim to reproduce Figma Dev Mode or the official Figma MCP output.

## Read backends

### REST mode

- Figma Personal Access Token
- `/file` and `/design` URLs
- headless and CI use
- batched node reads
- bounded memory cache
- in-flight deduplication
- timeout, retry, and rate-limit diagnostics

### Local Plugin Bridge

- Figma Desktop development plugin
- no PAT or REST call for the captured selection
- explicit **Capture & Send** action
- authenticated loopback transport
- one memory-only snapshot
- no Figma write operations

## Shared pipeline

Both backends feed:

- compact selection inspection;
- W3C-style Design Token extraction;
- React, Vue, Svelte, and HTML starter generation.

## Packages

- `packages/figma-client`: REST client, inspector, Plugin Bridge server/client
- `packages/design-tokens`: token extraction and lookup indexes
- `packages/code-generator`: framework output
- `packages/config`: protected local PAT storage
- `packages/mcp-server`: unified MCP STDIO server
- `packages/cli`: REST CLI and bridge CLI
- `plugins/local-bridge`: explicit-capture Figma development plugin

## Quality gates

- Node.js 18, 20, and 22 CI
- TypeScript typecheck
- unit, fixture, security, and bridge tests
- offline smoke tests
- secret scan
- fork-portability scan
- plugin-integrity scan
- package tarball validation
- CodeQL
- pull-request dependency review

## Operations

- Forks are treated as contribution and product-discovery surfaces.
- Fork auditing is read-only.
- npm publication, GitHub releases, and Figma Community publication require human approval.
- Recommended non-Git repository settings are recorded in [`docs/repository-settings.md`](docs/repository-settings.md).
