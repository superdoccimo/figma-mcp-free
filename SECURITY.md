# Security Policy

## Supported code

Security fixes target the current default branch and the most recent verifiable release, when releases begin. Old source snapshots and divergent forks may need to apply the fix themselves.

## Report privately

Do not open a public issue for:

- exposed Figma tokens or other credentials
- authentication or authorization bypass
- arbitrary code, command or file execution
- a network listener exposed beyond loopback unexpectedly
- private Figma content written to logs, caches or artifacts
- a write operation that can run without explicit opt-in
- dependency or release-pipeline compromise

Use GitHub's private vulnerability reporting feature when it is enabled for this repository. If it is unavailable, contact the repository owner through a private channel shown on the owner's GitHub profile and include only the minimum information needed to establish contact. Do not send a real production token or private design file as a demonstration.

## Include

- affected commit, tag or package version
- operating system and Node.js version
- minimal reproduction using dummy data
- impact and required attacker access
- whether the issue affects REST, CLI, MCP, a fork, or a future plugin bridge
- suggested mitigation, if known

## Secret handling

- Never commit `FIGMA_TOKEN`, private file IDs or raw private API responses.
- Normal CI, tests, smoke checks and fork checks must run without secrets.
- Live tests must use a dedicated non-sensitive file and least-privilege token.
- Logs and diagnostics must report token presence, not token contents.
- In-memory caching is allowed for bounded process-local reuse. Persistent caching of Figma content requires explicit opt-in, retention rules and a security review.
- Revoke a token immediately if exposure is suspected.

## MCP and plugin boundary

MCP tool arguments are untrusted input. Validate identifiers, URLs, sizes, recursion depth and counts before network or file operations.

A future local plugin bridge must bind to loopback, authenticate each session, use a versioned and bounded message schema, remain read-only by default, and keep write capabilities behind explicit user approval.

## Coordinated disclosure

Maintainers will acknowledge a usable report, reproduce it, choose a remediation and coordinate disclosure. Exact timing depends on severity and maintainer availability. Public details should wait until a fix or practical mitigation is available.

## Forks

A security fix merged upstream does not automatically update forks. Fork maintainers should keep an upstream remote, monitor releases and advisories, and preserve attribution when applying a fix.
