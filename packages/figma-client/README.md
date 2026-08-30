# @figma-mcp-free/figma-client

Read-only Figma access primitives used by `figma-mcp-free`.

The package exposes two explicit entry points:

- `@figma-mcp-free/figma-client`: quota-aware Figma REST reads;
- `@figma-mcp-free/figma-client/plugin-bridge`: authenticated local current-selection transport.

Neither entry point writes to Figma.

## REST capabilities

- Parse `/file` and `/design` URLs.
- Normalize common numeric share-link node IDs.
- Read files, components, frames, and selected nodes.
- Batch and de-duplicate multiple node IDs.
- Coalesce identical concurrent requests.
- Keep a bounded in-memory TTL cache.
- Enforce an optional per-client network request budget.
- Retry short-lived network, timeout, `429`, and `5xx` failures within explicit limits.
- Fail clearly for long-lived or plan-related rate limits.
- Report backend capabilities, request statistics, and structured error metadata.

## REST source usage

Build the workspace first:

```bash
pnpm install --frozen-lockfile
pnpm -r build
```

```ts
import { FigmaClient } from "@figma-mcp-free/figma-client";

const client = new FigmaClient({
  token: process.env.FIGMA_TOKEN!,
  cacheTtlMs: 30_000,
  maxNodeIdsPerRequest: 50,
  requestBudget: 6
});

const nodes = await client.getNodes("<FILE_ID>", ["1-2", "3:4"]);
console.log(client.getStats());
```

The REST cache is memory-only. The package does not persist Figma responses to disk.

REST errors:

- `FigmaApiError`
- `FigmaRateLimitError`
- `FigmaRequestTimeoutError`
- `FigmaRequestBudgetError`

## Local Plugin bridge capabilities

The bridge accepts one explicit snapshot from the Figma development Plugin and exposes it to trusted local CLI or MCP processes.

```ts
import {
  PluginBridgeClient,
  startPluginBridgeServer
} from "@figma-mcp-free/figma-client/plugin-bridge";

const server = await startPluginBridgeServer({ port: 3845 });
console.log(server.url, server.sessionId);
// Treat server.token as sensitive configuration.

const client = new PluginBridgeClient({
  baseUrl: server.url,
  token: server.token
});

console.log(await client.health());
```

Security properties:

- loopback-only server and client origins;
- remote-address and Host-header validation;
- 32-to-512-character bearer token with timing-safe comparison;
- redirect refusal;
- one bounded in-memory snapshot;
- body, selection, node, depth, header, and timeout limits;
- no non-loopback override;
- no credential persistence.

The bridge client does not expose a method to post arbitrary snapshots. Snapshot writes are reserved for the explicit Figma Plugin capture flow.

## Backend contract

`FigmaClient` implements `FigmaReadBackend` for whole-file and headless REST operations.

The local Plugin bridge intentionally has a narrower current-selection contract. It returns REST-shaped `FigmaNode` documents so existing inspection and generation code can be reused without pretending that the Plugin supports whole-file REST endpoints.

Do not log tokens, pairing secrets, raw private design responses, or captured snapshots while handling errors.

See the root [README](../../README.md), [architecture](../../docs/architecture.md), and [local bridge guide](../../docs/local-plugin-bridge.md).
