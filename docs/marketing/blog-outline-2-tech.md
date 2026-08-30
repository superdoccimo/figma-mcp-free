# Blog Outline: Inside the dual-backend Figma MCP architecture

Draft status: verify implementation details against the current branch before publication.

## 1. The shared pipeline

```text
REST or Local Plugin
  -> REST-shaped node JSON
  -> compact selection inspector
  -> Design Token indexes
  -> React / Vue / Svelte / HTML starter generation
```

The important design choice is keeping transport separate from context shaping and code generation.

## 2. REST backend

Explain:

- `/file` and `/design` URL parsing;
- node-ID normalization;
- `get_nodes` batching;
- bounded memory cache;
- identical in-flight request deduplication;
- timeout and short transient retry;
- long `Retry-After` surfacing;
- safe plan-tier and rate-limit metadata;
- why compact selected-node context is preferable to raw full-file JSON.

## 3. Local Plugin backend

Explain:

- Figma development plugin uses `JSON_REST_V1` for selected nodes;
- selection changes only update the local UI summary;
- export and transmission occur only after **Capture & Send**;
- bridge binds to loopback;
- every request requires a pairing token;
- one snapshot is kept in memory;
- credentials stay in process environment or the open plugin UI;
- no Figma write API is used.

## 4. MCP boundary

REST tools and Local Plugin tools live in one STDIO server but authenticate independently.

REST examples:

- `inspect_selection`
- `get_nodes`
- `generate_code`

Local examples:

- `get_plugin_bridge_status`
- `inspect_current_selection`
- `generate_current_selection`

Bridge URL and token are not model-visible tool inputs.

## 5. Security and quality gates

- owner-only PAT file permissions;
- atomic config replacement;
- plugin manifest and write-pattern static checks;
- secret scanning;
- package tarball checks;
- Node.js 18, 20, and 22 matrix;
- CodeQL;
- dependency review;
- fork portability.

## 6. Fork intelligence

Describe how GitHub compare data identifies forks with unique commits, why the workflow is read-only, and how contributor provenance is preserved.

## 7. Demo sequence

1. run the offline generator;
2. inspect one REST node with bounded depth;
3. batch three node IDs;
4. start the Local Plugin Bridge;
5. capture a current selection;
6. generate code without a PAT or REST call;
7. show tests and workflow results.

## 8. Limitations and next work

- real Figma Desktop golden fixtures;
- variable, gradient, mask, and image-fill coverage;
- release provenance;
- pairing UX;
- no write capability in the default project.
