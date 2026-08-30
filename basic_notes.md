# Basic Notes

This file is retained as a stable link for older references. Current project truth lives in maintained documentation:

- [README](README.md)
- [Japanese README](jp/README.md)
- [Quickstart](docs/quickstart.md)
- [Architecture](docs/architecture.md)
- [Forking](docs/forking.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Roadmap](ROADMAP.md)

Current production capability is a read-only, rate-aware Figma REST backend with CLI and MCP access, node batching, in-flight request coalescing, bounded memory caching, optional request budgets, design-token extraction and starter-code generation.

A local Figma Plugin bridge is planned but is not described as released until its transport, authentication, safety and real-device tests ship together.

Run the canonical verification gate:

```bash
pnpm install --frozen-lockfile
pnpm check
```
