# Roadmap

## Current foundation

- [x] Read-only REST MCP server and CLI
- [x] Selected-layer compact inspection
- [x] W3C-style token export and starter code generation
- [x] Batch node reads, cache, request deduplication, timeout, and rate-limit diagnostics
- [x] Secure local PAT storage and fork intelligence
- [x] Read-only local Figma Plugin bridge using explicit loopback pairing and REST-shaped node export
- [x] Backend-neutral current-selection inspection and generation

## Next delivery slices

- [ ] npm provenance release workflow after package ownership and release approval
- [ ] Golden design fixtures covering Auto Layout, variants, variables, gradients, masks, and image fills
- [ ] Signed bridge-session file or operating-system credential-store integration for easier persistent pairing
- [ ] Optional OAuth adapter for applications that should not ask users to paste PATs
- [ ] Published Figma Community development companion after plugin review and owner approval
- [ ] End-to-end desktop smoke test that captures a real selection and verifies generated output

Write operations are not part of the default roadmap. Any future write-capable plugin mode must be separate, opt-in, narrowly scoped, and verified after each change.
