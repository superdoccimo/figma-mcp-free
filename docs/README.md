# Documentation Index

Start here:

- [Quickstart](quickstart.md)
- [Standalone npm distribution](distribution.md)
- [Local Figma Plugin bridge](local-plugin-bridge.md)
- [Figma Desktop smoke test](desktop-smoke-test.md)
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

A single-package npm release candidate can be staged and clean-installed locally, but the package is not publicly advertised as released until registry verification and a real Figma Desktop evidence gate pass.

## Documentation rule

Documentation must describe implemented and tested behavior. Package installation commands, client compatibility, Figma plan allowances, Plugin capabilities, platform verification, and write operations must not be advertised before they are verifiable.
