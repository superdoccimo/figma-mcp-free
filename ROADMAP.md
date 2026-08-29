# Roadmap

## Current foundation

- [x] Read-only REST MCP server and CLI
- [x] Selected-layer compact inspection
- [x] W3C-style token export and starter code generation
- [x] Batch node reads, cache, request deduplication, timeout, and rate-limit diagnostics
- [x] Secure local PAT storage and fork intelligence

## Next delivery slices

- [ ] Read-only local Figma Plugin bridge using explicit localhost pairing and REST-shaped node export
- [ ] Backend-neutral `current_selection` inspection and generation
- [ ] npm provenance release workflow after package ownership and release approval
- [ ] Golden design fixtures covering Auto Layout, variants, variables, gradients, masks, and image fills
- [ ] Optional OAuth adapter for applications that should not ask users to paste PATs

Write operations are not part of the default roadmap. Any future write-capable plugin mode must be separate, opt-in, narrowly scoped, and verified after each change.
