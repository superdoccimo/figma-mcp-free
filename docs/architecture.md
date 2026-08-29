# Architecture

`figma-mcp-free` separates transport, Figma access, context shaping, token extraction, and code generation so each part can evolve without changing existing MCP tool names.

```text
AI client / shell
       |
  MCP server or CLI
       |
  shared FigmaClient
       |-- URL and node normalization
       |-- batched GET file nodes
       |-- in-flight request deduplication
       |-- bounded in-memory response cache
       |-- timeout, Retry-After, and rate-limit metadata handling
       |
  Figma REST API (read-only mode)
       |
  selection inspector / design tokens / code generator
```

## Compatibility boundaries

- Existing MCP tools remain available. New optional inputs do not invalidate old configurations.
- `get_nodes` is the preferred primitive for multiple node IDs because it batches reads.
- `inspect_selection` is compact implementation context, not an imitation of Figma's official `get_design_context` output.
- REST mode is read-only by construction.
- The code generator produces starter code, not a pixel-perfect compiler guarantee.

## Cache boundary

The default cache is process-local and short lived. It avoids repeated network calls in a long-running MCP server without persisting private design contents to disk. `refresh: true` bypasses a cached value, while `clear_cache` removes all process-local entries.

## Future backend boundary

A local Figma Plugin backend can supply REST-shaped selected-node JSON through an explicit localhost pairing flow. It should remain a separate adapter behind the same inspection and generation pipeline. Read operations stay the default; any future write tool must be opt-in, visibly named, and separately permissioned.
