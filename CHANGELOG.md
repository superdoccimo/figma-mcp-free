# Changelog

## Unreleased

### Added

- Batched `get_nodes` REST and MCP operations.
- In-memory response caching, in-flight request coalescing, cache statistics, explicit refresh, and cache clearing.
- Optional hard request budgets that count real network attempts, including retries.
- Request timeouts and structured Figma rate-limit metadata.
- `file`, `nodes`, `frames`, and `generate-many` REST CLI commands.
- Automated read-only fork-network auditing and fork contribution documentation.
- Complete fork pagination, bounded comparison concurrency, per-fork error isolation, JSON-only output, and retained audit artifacts.
- Fork-portability checks for operational code, workflow permissions, checkout credentials, required scripts, and package metadata.
- Config permission diagnostics.
- CodeQL analysis for JavaScript/TypeScript and GitHub Actions workflows.
- A committed-lockfile audit fallback when GitHub Dependency graph is unavailable.
- A repository-settings checklist for branch rules, security toggles, merge behavior, and releases.
- Full repository checks on Windows and macOS in addition to the Linux Node.js 18, 20, and 22 matrix.
- A read-only Figma development Plugin that exports the explicitly captured selection as `JSON_REST_V1`.
- An authenticated, loopback-only, memory-only Plugin bridge with session IDs, Host validation, redirect refusal, and bounded payloads.
- `figma-mcp-free-bridge` commands for serving, status, snapshot reading, compact inspection, code generation, and clearing.
- MCP tools `get_plugin_bridge_status`, `list_current_selections`, `get_current_selection`, `inspect_current_selection`, and `generate_current_selection`.
- Static Plugin-integrity checks and runtime protocol tests for authentication, DNS-rebinding resistance, content type, size, node, depth, timeout, and origin limits.
- Package-content checks for the Plugin bridge client export and bridge executable.

### Changed

- Long or plan-related `Retry-After` responses are surfaced instead of causing wasteful automatic retries.
- MCP server reuses one REST client, allowing caching and request coalescing to work across tool calls.
- Missing nodes now fail code generation instead of silently generating from a placeholder group.
- Local PAT writes are atomic and use owner-only POSIX permissions where supported.
- CI pins its primary runner image, checks pull-request whitespace, preserves full history for comparisons, and uses stable job names for branch rules.
- The complete gate now runs on Linux, Windows, and macOS without repository secrets.
- Dependabot groups GitHub Actions updates, limits concurrent update PRs, and defers known breaking TypeScript, Zod, and Commander majors to deliberate migrations.
- The local Plugin path and REST path are explicit peers. Neither silently falls back to the other or shares credentials.

### Security

- Adapted the owner-only config permission fix discovered in `mogaming217/figma-mcp-free`, commit `e12b36b0`, and extended it with atomic replacement and doctor checks.
- Dependency review no longer becomes a no-op when Dependency graph is disabled; the workflow falls back to a complete committed-lockfile audit.
- Upgraded the maintained MCP v1 SDK to 1.30.0 and pinned audited transitive resolutions for Hono, its Node adapter, body parsing, URI parsing, IP parsing, query-string parsing, and the development build toolchain.
- Added a high-entropy ephemeral bridge token with timing-safe comparison.
- Added loopback socket and Host-header checks to reduce accidental exposure and DNS-rebinding risk.
- Added one-snapshot memory retention plus request byte, selection, document-node, child-depth, header, and timeout ceilings.
- Kept bridge credentials out of model-visible MCP schemas and prohibited a non-loopback escape hatch.
- Added a static check for Figma document-write APIs and credential persistence in the development Plugin.

### Verification boundary

- The Node.js bridge protocol, MCP schemas, package contents, and static Figma Plugin properties are automated on Linux, Windows, and macOS.
- A real Figma Desktop smoke test on the exact release candidate remains required before labeling the local Plugin bridge release-ready.
- Packages remain unpublished until a separate provenance-backed release is explicitly approved.
