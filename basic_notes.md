# Basic Notes

This file is retained as a stable link for older references. Current project truth lives in maintained documentation:

- [README](README.md)
- [Japanese README](jp/README.md)
- [Local Plugin bridge](docs/local-plugin-bridge.md)
- [Quickstart](docs/quickstart.md)
- [Architecture](docs/architecture.md)
- [Forking](docs/forking.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Roadmap](ROADMAP.md)

The repository now contains two explicit read paths:

- a read-only, rate-aware Figma REST backend with CLI and MCP access, node batching, in-flight request coalescing, bounded memory caching, optional request budgets, token extraction, and starter-code generation;
- a read-only Figma development-Plugin bridge with explicit capture, authenticated loopback transport, one bounded in-memory snapshot, and PAT-free current-selection inspection and generation.

The Plugin implementation and automated boundary checks are present. A real Figma Desktop smoke test on the exact release candidate remains a separate release gate. The project does not claim npm or Figma Community publication.

Run the canonical verification gate:

```bash
pnpm install --frozen-lockfile
pnpm check
git diff --check
```
