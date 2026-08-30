# Documentation Index

Start here:

- [Quickstart](quickstart.md)
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

The production backend is a read-only Figma REST client. It supports CLI and MCP workflows, selected-layer inspection, design-token extraction, starter code generation, node batching, request coalescing, bounded memory caching, request budgets and structured rate-limit diagnostics.

A local Figma Plugin bridge is an architectural direction, not a released capability. See [architecture.md](architecture.md) and [the roadmap](../ROADMAP.md) for its required security and test boundaries.

## Documentation rule

Documentation must describe implemented and tested behavior. Package installation commands, client compatibility, Figma plan allowances, plugin capabilities and write operations must not be advertised before they are verifiable.
