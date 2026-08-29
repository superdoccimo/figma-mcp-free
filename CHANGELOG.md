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

### Changed

- Long `Retry-After` responses are surfaced instead of causing wasteful rapid retries.
- MCP server reuses one client, allowing caching and request deduplication to work across tool calls.
- Missing nodes now fail code generation instead of silently generating from a placeholder group.
- Local PAT writes are atomic and use owner-only POSIX permissions where supported.

### Security

- Adapted the owner-only config permission fix discovered in `mogaming217/figma-mcp-free`, commit `e12b36b0`, and extended it with atomic replacement and doctor checks.
