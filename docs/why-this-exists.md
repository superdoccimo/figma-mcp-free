# Why This Exists

Figma-to-code workflows often begin with a simple promise: give an AI tool access to a design and generate implementation context. The difficult part appears after the first successful demo.

Real workflows need to answer:

- How many API calls were actually made?
- Were identical requests duplicated?
- Can multiple selected nodes be fetched together?
- What happens when a limit is short-lived versus plan-related?
- Can the current selection be used without spending REST quota?
- Can a contributor fork run CI without upstream secrets?
- Is generated output deterministic enough to review?
- Does adding a local Plugin silently add write or network risk?

`figma-mcp-free` exists to keep those boundaries explicit.

## The REST path

The REST backend is useful for headless automation, whole-file reads, node batches, component metadata, token extraction, and code generation. It remains read-only and subject to Figma's current access and rate-limit rules.

The client therefore batches nodes, coalesces duplicate reads, uses a bounded memory cache, exposes request statistics, supports an optional hard request budget, and distinguishes short-lived failures from long-lived or plan-related limits.

## The local Plugin path

The local Figma development-Plugin bridge exists for a narrower job: capture the node or nodes the user is currently looking at without a PAT or REST request.

That convenience is shipped with a complete local boundary rather than a loose localhost listener:

- capture occurs only after an explicit button press;
- Figma exports a REST-shaped node document;
- the server binds only to loopback;
- every request is authenticated with an ephemeral pairing token;
- remote address and Host header are validated;
- redirects and non-loopback origins are refused;
- snapshot bytes, selections, document nodes, depth, headers, and request time are bounded;
- one snapshot is stored in memory and discarded on shutdown;
- bridge credentials remain outside model-visible MCP schemas;
- Figma document-write calls are prohibited by design and checked statically.

The REST and Plugin paths share inspection and generation consumers, but not credentials or automatic fallback behavior.

## Forks as evidence

The project also treats forks as evidence. A unique fork commit can reveal a missing feature even when no issue was opened. Read-only fork auditing and attribution rules make that evidence usable without taking ownership away from the original author.

## Honest release boundaries

Implemented code is not the same as a released product claim.

The bridge protocol, CLI, MCP schemas, package exports, and static Plugin boundary can be tested automatically. Figma Desktop behavior cannot be proven by Node.js CI, so a real-editor smoke test on the exact candidate commit remains mandatory before calling the Plugin bridge release-ready.

The goal is not to imitate every official feature. It is to provide a transparent, inspectable, community-maintained workflow whose limits are visible and whose components can improve independently.
