# Troubleshooting

## 1. Authentication issues

### Symptom
- Requests return `403` or `401` errors.

### Fix
1. Regenerate a Personal Access Token and ensure the following scopes are enabled at minimum:
   - File content
   - File metadata
   - Current user
   - Library content
2. Re-run `pnpm --filter figma-mcp-free dev -- config set token <FIGMA_TOKEN>` or export `FIGMA_TOKEN` before launching the CLI/server.

## 2. Rate limits (429)

### Symptom
- CLI exits with `Rate limit exceeded`.

### Fix
- Wait 60 seconds and retry; batch requests with `--limit`.
- Cache component metadata locally by piping CLI output into JSON files for repeated runs.

## 3. Missing node IDs

### Symptom
- `generate` fails because the node cannot be found.

### Fix
1. Confirm the node ID matches the Figma URL (`...node-id=<NODE_ID>`).
2. Verify the file belongs to the same account as the Personal Access Token.
3. Use `pnpm --filter figma-mcp-free dev -- components <FILE_ID> --json` to discover component IDs.

## 4. MCP client cannot connect

### Symptom
- Claude/Cursor reports that the server is not reachable.

### Fix
1. Ensure the server is running via `node packages/mcp-server/dist/index.js`.
2. Check that the manifest path in your client configuration points to the compiled server entry point.
3. Restart the IDE after updating the manifest.

## 5. Token substitution missing

### Symptom
- Generated code shows raw hex colors instead of CSS variables.

### Fix
1. Verify `tokens.json` follows the W3C Design Tokens (module v1) schema.
2. Confirm the token keys match node paths (`page/frame/shape`).
3. Use `--var-prefix --` to inject the correct CSS variable prefix.

Still stuck? Open an Issue on GitHub with the command you ran, anonymised IDs, and the CLI output.
