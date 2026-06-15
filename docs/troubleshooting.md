# Troubleshooting

## 1. Unsupported Figma links

### Symptom
- The CLI cannot find a node, or generated output is empty.
- The source link starts with `https://www.figma.com/slides/...`.

### Fix
1. Use a `/file` or `/design` link instead.
2. In Figma, select the target frame or component and copy a link to the selection.
3. Confirm the URL includes `node-id=...`.

The Figma REST API does not expose slide node information for this workflow.

## 2. Node ID format

### Symptom
- A manually copied node ID works in the browser, but a direct REST API call cannot find the node.

### Fix
Figma URLs often use hyphens in node IDs:

```text
node-id=1-2
```

The API and CLI expect colons:

```text
1:2
```

When you pass the full Figma URL to the CLI or MCP `figmaUrl` input, `figma-mcp-free` normalizes this automatically. Convert the value yourself only when calling the REST API directly or passing `<NODE_ID>` manually.

## 3. Authentication issues

### Symptom
- Requests return `403` or `401` errors.

### Fix
1. Regenerate a Personal Access Token and ensure the following scopes are enabled at minimum:
   - File content
   - File metadata
   - Current user
   - Library content
2. Re-run `pnpm --filter figma-mcp-free dev -- init` (or `-- init --token <FIGMA_TOKEN>`) or export `FIGMA_TOKEN` before launching the CLI/server.

## 4. Temporary image URLs expire

### Symptom
- README screenshots, generated websites, or Next.js pages show broken images.
- `images.figma.com` URLs return `403` or `404`.

### Fix
- Do not commit temporary Images API URLs as public docs or production assets.
- Export stable image files into your app or repository.
- Use your own CDN or server for production image URLs.
- If using `next/image`, allow the real image host in `next.config.js`.

Figma view URLs (`/file`, `/design`, `/slides`) are not direct image URLs.

## 5. Only a black frame is displayed

### Symptom
- A generated page renders a frame, but visual content appears black or empty.

### Fix
- Confirm the image host is allowed by the framework.
- Check whether the temporary image URL expired.
- Verify path, extension, and filename casing.
- Re-export masked or clipped assets if the bounding box is wrong.
- Try `use_absolute_bounds=true` with the Figma Images API during diagnosis.

## 6. Rate limits (429)

### Symptom
- CLI exits with `Rate limit exceeded`.

### Fix
- Wait 60 seconds and retry; batch requests with `--limit`.
- Cache component metadata locally by piping CLI output into JSON files for repeated runs.

## 7. Missing node IDs

### Symptom
- `generate` fails because the node cannot be found.

### Fix
1. Confirm the node ID matches the Figma URL (`...node-id=<NODE_ID>`).
2. Verify the file belongs to the same account as the Personal Access Token.
3. Use `pnpm --filter figma-mcp-free dev -- components <FILE_ID> --json` to discover component IDs.

## 8. MCP client cannot connect

### Symptom
- Claude/Cursor reports that the server is not reachable.

### Fix
1. Ensure the server is running via `node packages/mcp-server/dist/index.js`.
2. Check that the manifest path in your client configuration points to the compiled server entry point.
3. Restart the IDE after updating the manifest.

## 9. Token substitution missing

### Symptom
- Generated code shows raw hex colors instead of CSS variables.

### Fix
1. Verify `tokens.json` follows the W3C Design Tokens (module v1) schema.
2. Confirm the token keys match node paths (`page/frame/shape`).
3. Use `--var-prefix --` to inject the correct CSS variable prefix.

Still stuck? Open an Issue on GitHub with the command you ran, anonymised IDs, and the CLI output.
