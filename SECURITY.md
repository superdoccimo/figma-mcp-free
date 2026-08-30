# Security Policy

## Supported code

Security fixes target the current default branch and the most recent verifiable release, when releases begin. Old source snapshots and divergent forks may need to apply the fix themselves.

The project has two explicit read paths:

- a Figma REST backend authenticated with `FIGMA_TOKEN`;
- a local Figma development-plugin bridge authenticated with an ephemeral pairing token.

Neither path is intended to write to Figma.

## Report privately

Do not open a public issue for:

- exposed Figma PATs, bridge pairing tokens, or other credentials;
- authentication or authorization bypass;
- arbitrary code, command, or file execution;
- a bridge listener exposed beyond loopback unexpectedly;
- DNS-rebinding or Host-header bypass against the local bridge;
- private Figma content written to logs, persistent caches, artifacts, or telemetry;
- a Figma write operation that can run without explicit opt-in;
- dependency or release-pipeline compromise.

Use GitHub's private vulnerability reporting feature when it is enabled for this repository. If it is unavailable, contact the repository owner through a private channel shown on the owner's GitHub profile and include only the minimum information needed to establish contact. Never send a real production token or private design file as a demonstration.

## Include

- affected commit, tag, or package version;
- operating system and Node.js version;
- minimal reproduction using dummy data;
- impact and required attacker access;
- whether the issue affects REST, CLI, MCP, the local Plugin bridge, packaging, or a fork;
- suggested mitigation, if known.

## REST secret handling

- Never commit `FIGMA_TOKEN`, private file IDs, raw private API responses, or captured private design data.
- Normal CI, tests, smoke checks, Plugin checks, and fork checks must run without secrets.
- Live REST tests must use a dedicated non-sensitive file and least-privilege token.
- Logs and diagnostics must report token presence, not token contents.
- In-memory caching is allowed for bounded process-local reuse. Persistent caching of Figma content requires explicit opt-in, retention rules, encryption decisions, and a security review.
- Revoke a PAT immediately if exposure is suspected.

## Local Plugin bridge boundary

The development Plugin bridge is intentionally local, explicit, bounded, and read-only.

Current controls include:

- binding only to `127.0.0.1`, `localhost`, or `::1`;
- validating the remote socket address and the HTTP Host header;
- requiring a 32-to-512-character bearer token and using timing-safe comparison;
- refusing non-loopback client origins, URL credentials, extra paths, queries, fragments, and redirects;
- accepting a snapshot only after the user presses **Capture & Send** in Figma;
- keeping one snapshot in memory and clearing it when the server exits;
- bounding request bytes, selection count, document node count, child depth, headers, and request time;
- requiring `application/json` for snapshot writes;
- keeping the bridge URL and token in the MCP process environment rather than model-visible tool schemas;
- prohibiting Figma document-write APIs in the development Plugin through a static integrity check.

Figma's Plugin Fetch environment requires reachable APIs to permit cross-origin requests. The bridge therefore uses wildcard CORS while treating the high-entropy bearer token, loopback transport, remote-address validation, Host validation, and redirect refusal as the authorization boundary.

Do not paste the bridge token into websites, public issues, screenshots, shell history, committed MCP configuration, or telemetry. Restart the bridge to rotate both its token and session ID.

## MCP input boundary

MCP tool arguments are untrusted input. Validate identifiers, URLs, indexes, framework values, sizes, recursion depth, and counts before network, generation, or file operations.

Bridge credentials are configuration, not tool arguments. A model can request a bounded bridge operation, but it cannot choose a remote bridge URL or supply a pairing token through the public tool schema.

## Write-capability rule

Write operations are outside the current product boundary. Any future write-capable Plugin mode must be a separate, visibly named, opt-in capability with narrower permissions, per-operation user approval, post-write verification, and an independent security review. It must not silently upgrade existing read tools.

## Coordinated disclosure

Maintainers will acknowledge a usable report, reproduce it, choose a remediation, and coordinate disclosure. Exact timing depends on severity and maintainer availability. Public details should wait until a fix or practical mitigation is available.

## Forks

A security fix merged upstream does not automatically update forks. Fork maintainers should keep an upstream remote, monitor releases and advisories, run the repository's fork and Plugin integrity checks, and preserve attribution when applying a fix.
