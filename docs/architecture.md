# Architecture

`figma-mcp-free` separates transport, Figma access, context shaping, token extraction, and code generation so each part can evolve without changing existing MCP tool names.

```text
                              AI client / shell
                                      |
                              MCP server or CLI
                                      |
                    +-----------------+-----------------+
                    |                                   |
             REST backend                         Local Plugin backend
                    |                                   |
             shared FigmaClient                PluginBridgeClient
                    |                                   |
      URL/node normalization                    pairing-token auth
      batched GET file nodes                    loopback HTTP only
      in-flight deduplication                   one memory snapshot
      bounded memory cache                      explicit capture only
      timeout/rate-limit metadata               JSON_REST_V1 export
                    |                                   |
       Figma REST API (read-only)        Figma development plugin (read-only)
                    +-----------------+-----------------+
                                      |
                    selection inspector / token exporter / code generator
```

## Compatibility boundaries

- Existing REST MCP tools remain available. New optional inputs do not invalidate old configurations.
- `get_nodes` is the preferred REST primitive for multiple node IDs because it batches reads.
- `inspect_selection` and `inspect_current_selection` are compact implementation context, not imitations of Figma's official `get_design_context` output.
- REST mode and local-plugin mode are read-only by construction.
- The code generator produces starter code, not a pixel-perfect compiler guarantee.
- The Plugin bridge does not require `FIGMA_TOKEN`; REST tools still do.

## REST cache boundary

The default REST cache is process-local and short lived. It avoids repeated network calls in a long-running MCP server without persisting private design contents to disk. `refresh: true` bypasses a cached value, while `clear_cache` removes all process-local REST entries.

## Plugin bridge boundary

The local bridge is a separate adapter behind the same inspection and generation pipeline.

- Server bind is restricted to loopback hosts.
- Every non-preflight request requires a pairing token.
- The bridge keeps only the latest snapshot in memory.
- The plugin never sends a node automatically; the user presses **Capture & Send**.
- The plugin exports REST-shaped JSON but does not expose Figma write operations.
- MCP tool schemas do not contain the bridge token or URL. Those values come from process environment variables.
- A body-size limit, selection-count limit, request timeout, and schema checks constrain the local transport.

The development manifest declares no production network domains. Only the default loopback endpoints are permitted in `devAllowedDomains`.

## Future write boundary

Write operations are outside the default architecture. Any future write-capable plugin must use separate, visibly named tools, explicit opt-in configuration, narrow permissions, post-write verification, and a different security review. It must not silently reuse the read-only current-selection tools.
