# @figma-mcp-free/figma-client

Shared read layer for `figma-mcp-free`.

This package contains two independent backends that feed the same selection inspector and code-generation pipeline:

- a quota-aware Figma REST client;
- an authenticated, loopback-only local Figma Plugin bridge.

The package is prepared for distribution but is not published from this repository yet.

## REST client

```ts
import { FigmaClient, inspectSelection } from "@figma-mcp-free/figma-client";

const client = new FigmaClient({
  token: process.env.FIGMA_TOKEN!,
  cacheTtlMs: 300_000,
  requestTimeoutMs: 20_000
});

const nodes = await client.getNodes("FILE_ID", ["1:2", "3:4"], 2);
const context = inspectSelection(nodes["1:2"]!, {
  fileId: "FILE_ID",
  nodeId: "1:2",
  depth: 2,
  maxChildren: 20
});
```

REST capabilities include:

- `/file` and `/design` URL parsing;
- node-ID normalization;
- batch node reads;
- bounded in-memory cache;
- identical in-flight request deduplication;
- timeout and transient retry handling;
- structured Figma rate-limit metadata;
- compact selected-layer inspection.

The REST client performs GET requests only.

## Local Plugin bridge

```ts
import {
  PluginBridgeClient,
  startPluginBridgeServer
} from "@figma-mcp-free/figma-client/plugin-bridge";

const bridge = await startPluginBridgeServer({
  host: "127.0.0.1",
  port: 3845
});

console.log(bridge.url, bridge.token);

const client = new PluginBridgeClient({
  baseUrl: bridge.url,
  token: bridge.token
});

const snapshot = await client.getSnapshot();
```

Bridge guarantees:

- loopback bind only;
- pairing token on every non-preflight request;
- constant-time token comparison;
- one memory-only snapshot;
- body-size and selection-count limits;
- non-loopback client URLs rejected by default;
- no Figma write operation.

The bridge accepts REST-shaped JSON exported by the development plugin through Figma's `JSON_REST_V1` export mode.

## Errors and diagnostics

`FigmaApiError` preserves HTTP status and safe rate-limit metadata without including the PAT. `PluginBridgeError` includes the local HTTP status and a bounded error detail.

Do not log PATs, pairing tokens, or private design snapshots.

See the [repository README](https://github.com/superdoccimo/figma-mcp-free#readme), [architecture](../../docs/architecture.md), and [plugin guide](../../plugins/local-bridge/README.md).
