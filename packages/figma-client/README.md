# @figma-mcp-free/figma-client

Rate-aware, read-only Figma REST backend used by `figma-mcp-free`.

## Capabilities

- Parse `/file` and `/design` URLs.
- Normalize common numeric share-link node IDs.
- Read files, components, frames and selected nodes.
- Batch and de-duplicate multiple node IDs.
- Coalesce identical concurrent requests.
- Keep a bounded in-memory TTL cache.
- Enforce an optional per-process network request budget.
- Retry short-lived network, timeout, `429` and `5xx` failures within explicit limits.
- Fail clearly for long-lived or plan-related rate limits.
- Report backend capabilities, request statistics and structured error metadata.

## Source usage

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

The cache is memory-only. The package does not persist Figma responses to disk.

## Errors

- `FigmaApiError`
- `FigmaRateLimitError`
- `FigmaRequestTimeoutError`
- `FigmaRequestBudgetError`

Do not log tokens or raw private design responses while handling errors.

## Backend contract

`FigmaClient` implements `FigmaReadBackend` and reports read-only REST capabilities. This boundary is intended to let a future local plugin bridge implement the same read operations without changing every MCP or CLI tool.

See the root [README](../../README.md) and [architecture](../../docs/architecture.md).
