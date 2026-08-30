# Architecture

`figma-mcp-free` separates transport, Figma access, context shaping, token extraction, and code generation so each layer can evolve without silently changing existing MCP behavior.

Two explicit read paths feed shared consumers.

```text
REST path

AI client / shell
       |
  MCP server or REST CLI
       |
  rate-aware FigmaClient
       |-- URL and node normalization
       |-- batched GET file nodes
       |-- in-flight request coalescing
       |-- bounded in-memory response cache
       |-- optional hard request budget
       |-- timeout, Retry-After, and rate-limit metadata handling
       |
  Figma REST API
       |
  selection inspector / design tokens / code generator

Local Plugin path

Figma Desktop selection
       |
  explicit Capture & Send
       |
  JSON_REST_V1 export
       |
  authenticated loopback bridge
       |-- remote-address and Host validation
       |-- high-entropy session token
       |-- one bounded in-memory snapshot
       |-- byte, selection, node, depth, header, and timeout limits
       |
  MCP server or bridge CLI
       |
  selection inspector / code generator
```

## Backend boundaries

The REST client implements `FigmaReadBackend` and reports explicit capabilities. It remains the backend for whole-file, component, frame, and headless operations.

The local Plugin bridge is a current-selection transport, not a transparent REST replacement. It exposes REST-shaped node documents so the inspector and code generator can be reused, but it does not pretend to support whole-file or component-metadata calls.

The two paths do not silently fall back between one another:

- REST tools use a Figma PAT.
- Plugin tools use a process-configured loopback URL and pairing token.
- Bridge credentials never enter model-visible tool schemas.
- Failure in one path is reported rather than masked by the other.

## Compatibility boundaries

- Existing REST MCP tool names and inputs remain available.
- New Plugin tools are additive and visibly named.
- `get_nodes` is the preferred REST primitive for multiple node IDs because it batches reads.
- `list_current_selections` is the preferred first Plugin call because it returns lightweight summaries before a full document is requested.
- `inspect_selection` and `inspect_current_selection` are compact implementation context, not imitations of Figma's official `get_design_context` output.
- Both paths are read-only by construction.
- The code generator produces starter code, not a pixel-perfect compiler guarantee.

## REST cache and request boundary

The default REST cache is process-local and short lived. It avoids repeated network calls in a long-running MCP server without persisting private design contents to disk. `refresh: true` bypasses a cached value, while `clear_cache` removes all process-local entries.

Identical concurrent default reads are joined. Optional request budgets count real network attempts, including retries, but not cache hits or joined callers.

## Local bridge protocol boundary

The development Plugin exports a node only after an explicit user action. The server binds to loopback and authenticates each request with an ephemeral bearer token.

Protocol v1 has three primary resources:

- `GET /health`
- `GET /v1/snapshot`
- `POST /v1/snapshot`
- `DELETE /v1/snapshot`

A server process owns one random session ID and at most one snapshot. A later capture replaces the previous snapshot. Shutdown discards the snapshot, token, and session.

Figma's Plugin Fetch environment requires cross-origin access for reachable APIs. The bridge permits wildcard CORS but compensates with independent local controls: loopback bind, remote-address validation, loopback Host validation, high-entropy authentication, redirect refusal, no-store responses, and strict resource limits.

## Data minimization

The Plugin UI shows a lightweight selection summary first. Full REST-shaped documents are exported only after **Capture & Send**.

MCP callers can use `list_current_selections` before requesting a complete captured node. Compact inspection limits child depth and count. The bridge does not persist snapshots, pairing tokens, or Figma credentials.

## Write boundary

Neither backend exposes Figma write operations.

Any future write-capable Plugin mode must be a separate adapter with a separate permission model, visibly different tool names, per-operation human approval, and post-write verification. It must not be enabled by changing an environment variable on an existing read tool.

## Verification boundary

CI can verify the Node.js protocol, MCP schemas, package exports, static Plugin source, secret patterns, and absence of detected Figma write APIs. CI cannot prove behavior inside Figma Desktop.

Before a release claims the local Plugin bridge is ready, a maintainer must test the exact candidate commit in Figma Desktop and record successful pairing, capture, status, list, inspect, generate, and clear operations using non-sensitive data.
