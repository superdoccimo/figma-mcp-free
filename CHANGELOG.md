# Changelog

## Unreleased

### Added

- Batched `get_nodes` REST and MCP operations.
- In-memory response caching, in-flight deduplication, cache statistics, explicit refresh, and cache clearing.
- Request timeouts and structured Figma rate-limit metadata.
- `file`, `nodes`, `frames`, and `generate-many` CLI commands.
- Automated read-only fork-network auditing and fork contribution documentation.
- Fork-portability checks for operational code.
- Config permission diagnostics.
- Authenticated, loopback-only Figma development-plugin bridge.
- PAT-free current-selection MCP tools and the `figma-mcp-free-bridge` CLI.
- Explicit-capture Figma plugin UI and generated local development manifest.
- Bridge authentication, body-limit, lifecycle, timeout, and model-visible-schema tests.

### Changed

- Long `Retry-After` responses are surfaced instead of causing wasteful rapid retries.
- MCP server reuses one client, allowing caching and request deduplication to work across tool calls.
- Missing nodes now fail code generation instead of silently generating from a placeholder group.
- Local PAT writes are atomic and use owner-only POSIX permissions where supported.
- REST and local-plugin reads now share the same selection inspector and code-generation pipeline.

### Security

- Adapted the owner-only config permission fix discovered in `mogaming217/figma-mcp-free`, commit `e12b36b0`, and extended it with atomic replacement and doctor checks.
- Plugin bridge binds only to loopback, requires a pairing token, stores one memory-only snapshot, and keeps credentials out of MCP tool schemas.
