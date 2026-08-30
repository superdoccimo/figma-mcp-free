# Changelog

## Unreleased

### Added

- Batched `get_nodes` REST and MCP operations.
- In-memory response caching, in-flight deduplication, cache statistics, explicit refresh, and cache clearing.
- Request timeouts and structured Figma rate-limit metadata.
- `file`, `nodes`, `frames`, and `generate-many` CLI commands.
- Automated read-only fork-network auditing and fork contribution documentation.
- Complete fork pagination, bounded comparison concurrency, per-fork error isolation, JSON-only output, and retained audit artifacts.
- Fork-portability checks for operational code, workflow permissions, checkout credentials, required scripts, and package metadata.
- Config permission diagnostics.
- CodeQL analysis for JavaScript/TypeScript and GitHub Actions workflows.
- A lockfile-audit fallback when GitHub Dependency graph is unavailable.
- A repository-settings checklist for branch rules, security toggles, merge behavior, and releases.

### Changed

- Long `Retry-After` responses are surfaced instead of causing wasteful rapid retries.
- MCP server reuses one client, allowing caching and request deduplication to work across tool calls.
- Missing nodes now fail code generation instead of silently generating from a placeholder group.
- Local PAT writes are atomic and use owner-only POSIX permissions where supported.
- CI now pins its runner image, checks pull-request whitespace, preserves full history for the comparison, and gives stable matrix job names for branch rules.

### Security

- Adapted the owner-only config permission fix discovered in `mogaming217/figma-mcp-free`, commit `e12b36b0`, and extended it with atomic replacement and doctor checks.
- Dependency review no longer becomes a no-op when Dependency graph is disabled; the workflow falls back to `pnpm audit --audit-level high`.
