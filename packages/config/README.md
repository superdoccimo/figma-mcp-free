# @figma-mcp-free/config

Local configuration support for `figma-mcp-free`.

The package exists to keep configuration precedence and secret-safe status reporting consistent across the CLI and MCP server.

Expected precedence:

1. Explicit process environment, including `FIGMA_TOKEN`.
2. Local configuration created by `figma-mcp-free init`.
3. No token, with offline commands still available.

Security requirements:

- Never print a complete token.
- Report token presence and source without exposing the value.
- Do not commit local configuration.
- Keep normal tests and fork CI usable without a token.
- Treat configuration-path changes as compatibility changes.

Run the complete gate after modifying configuration behavior:

```bash
pnpm check
```

See [SECURITY.md](../../SECURITY.md) and the root [README](../../README.md).
