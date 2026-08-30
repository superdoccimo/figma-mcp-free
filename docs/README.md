# Documentation Index

Start here:

- [Quickstart](quickstart.md)
- [Local Figma Plugin bridge](local-plugin-bridge.md)
- [Troubleshooting](troubleshooting.md)
- [Architecture](architecture.md)
- [Forking and upstream contribution](forking.md)
- [Release policy](releasing.md)
- [Recommended GitHub repository settings](repository-settings.md)
- [Why this exists](why-this-exists.md)
- [Demo runbook](demo/runbook.md)
- [Launch and release checklist](launch-checklist.md)
- [Project roadmap](../ROADMAP.md)
- [Governance](../GOVERNANCE.md)
- [Support](../SUPPORT.md)
- [Security](../SECURITY.md)
- [Japanese README](../jp/README.md)

## Current capability statement

Two explicit read paths are implemented:

1. A quota-aware Figma REST backend for CLI and MCP workflows, selected-layer inspection, design-token extraction, starter code generation, node batching, request coalescing, bounded memory caching, request budgets, and structured rate-limit diagnostics.
2. An authenticated, loopback-only Figma development-plugin bridge for explicit current-selection capture without a PAT or REST request.

The local bridge remains read-only, memory-only, bounded, and opt-in. It does not silently replace REST calls, expose its token to model-visible schemas, or add Figma write capability.

The Node.js protocol and static Plugin boundary are covered by automated Linux, Windows, and macOS checks. A real Figma Desktop smoke test is still required before calling a release candidate release-ready.

## Documentation rule

Documentation must describe implemented and tested behavior. Package installation commands, client compatibility, Figma plan allowances, plugin capabilities, and write operations must not be advertised before they are verifiable.
