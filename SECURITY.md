# Security Policy

`figma-mcp-free` handles credentials and private design content. Please report vulnerabilities privately and do not include secrets or customer design data in public issues.

## Supported versions

Security fixes are applied to the latest commit on the default branch and to the newest published release once releases begin. Older source snapshots may not receive backports.

## Private reporting

Email either address:

- `security@minokamo.xyz`
- `summer@minokamo.xyz`

Use a subject such as `figma-mcp-free security report`.

Include:

- affected commit or version;
- REST mode, Local Plugin Bridge, CLI, MCP server, or GitHub workflow;
- reproducible steps or a minimal proof of concept;
- expected impact;
- suggested remediation, if known.

Do not send a real Figma PAT, pairing token, private file ID, or raw private design snapshot. Replace them with synthetic values.

We aim to acknowledge a valid report within 72 hours. Remediation timing depends on severity, reproducibility, upstream dependencies, and whether credential rotation is required.

## Security boundaries

### Figma Personal Access Tokens

- `FIGMA_TOKEN` is preferred for ephemeral sessions and CI secret injection.
- Local config writes are atomic.
- On POSIX systems, the config directory is restricted to `0700` and the token file to `0600` where supported.
- `init`, `doctor`, and `config get token` do not print token values.
- A leaked PAT should be revoked in Figma immediately.

### Local Plugin Bridge

- The server binds only to loopback hosts.
- Every non-preflight request requires a pairing token.
- Pairing comparison uses a timing-safe operation.
- The default bridge stores only the latest snapshot in memory.
- Request bodies and selection counts are bounded.
- Clients reject non-loopback bridge URLs by default.
- The Figma plugin transmits only after the user presses **Capture & Send**.
- The plugin UI does not persist pairing credentials.
- MCP tool schemas do not expose the bridge URL or pairing token to the model.

The bridge is not designed to be exposed through a LAN address, reverse proxy, public tunnel, container ingress, or cloud endpoint.

### Figma operations

The current REST and Local Plugin tools are read-only. They do not create, edit, move, delete, or publish Figma objects. A future write-capable tool requires a separate review, explicit opt-in, visibly different tool names, and post-write verification.

### Private design content

Figma node JSON, selected-layer summaries, layer names, and text can be confidential. The default caches are memory-only, but MCP clients can place tool output into model context or application logs. Capture and inspect only content appropriate for the configured AI service.

## In-scope vulnerability examples

- PAT or pairing-token disclosure through output, logs, errors, or MCP schemas;
- bridge authentication bypass;
- non-loopback bridge exposure;
- unsafe CORS or manifest network expansion;
- unbounded memory or request-body behavior;
- path traversal or arbitrary file writes;
- secret persistence with broad filesystem permissions;
- hidden or accidental Figma write operations;
- private design data written to disk without explicit user action;
- GitHub Actions changes that expose repository or workflow secrets.

## Public issue safety

For ordinary bugs, use the issue template and include safe diagnostics only. Never paste:

- `FIGMA_TOKEN`;
- `FIGMA_PLUGIN_BRIDGE_TOKEN`;
- Authorization headers;
- private Figma URLs or file IDs;
- raw private API responses;
- private bridge snapshots;
- private layer text or screenshots.

## Maintainer response

When a report is confirmed, maintainers should:

1. preserve the report privately;
2. assess credential and data exposure;
3. prepare a minimal fix and regression test;
4. rotate affected credentials when necessary;
5. publish remediation guidance without exposing exploit details prematurely;
6. credit the reporter unless anonymity is requested.
