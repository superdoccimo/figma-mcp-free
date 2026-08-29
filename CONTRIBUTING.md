# Contributing

Thank you for improving `figma-mcp-free`.

## Development

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run pack:check
```

The CI matrix covers supported Node.js versions. Keep TypeScript strict, avoid hidden network calls in tests, and add fixtures for generated output changes.

## Compatibility

- Preserve existing CLI commands and MCP tool names unless a major-version migration is approved.
- New inputs should normally be optional.
- Prefer bounded, compact responses for AI clients.
- Batch Figma node reads instead of adding loops that issue one REST request per node.
- REST mode must remain read-only.

## Fork-originated changes

Forks are supported and monitored as a source of real-world improvements. When a change began in a fork, include the fork URL, commit SHA, original author, and license/provenance notes in the pull request. Preserve contributor credit when adapting the implementation.

See [docs/forks.md](docs/forks.md) for synchronization and audit instructions.

## Pull requests

- Explain the user-visible problem and the selected design.
- Include tests and documentation.
- State API-call impact, especially for Tier 1 Figma endpoints.
- Run `pnpm run check` and `pnpm run pack:check`.
- Do not include PATs, private file IDs, raw private responses, or generated private design context.

## Security

Do not open a public issue for a sensitive vulnerability. Follow [SECURITY.md](SECURITY.md). Local config changes must preserve atomic writes and owner-only permissions where the platform supports them.
