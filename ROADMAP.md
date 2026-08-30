# Roadmap

## Current foundation

- [x] Read-only REST MCP server and CLI
- [x] Selected-layer compact inspection
- [x] W3C-style token export and starter code generation
- [x] Batch node reads, cache, request coalescing, request budgets, timeout, and structured rate-limit diagnostics
- [x] Secure local PAT storage and fork intelligence
- [x] Read-only local Figma development-plugin bridge with explicit capture and authenticated loopback pairing
- [x] PAT-free MCP and CLI inspection/generation for the current captured selection
- [x] Static Plugin boundary checks and Node.js protocol tests

## Release gate for the local Plugin bridge

- [ ] Complete a real Figma Desktop smoke test on the exact release candidate commit
- [ ] Record successful capture, status, list, inspect, generate, and clear evidence with a non-sensitive fixture
- [ ] Confirm Windows, macOS, and Linux bridge-server behavior where maintainers have access
- [ ] Add troubleshooting evidence for firewall, port collision, stale token, oversized selection, and unsupported node export
- [ ] Decide whether to remain development-only or prepare a separately reviewed Figma Community publication

The implementation can be reviewed and tested in CI now, but it should not be labeled release-ready until the Figma Desktop gate is complete.

## Next delivery slices

- [ ] npm provenance release workflow after package ownership and explicit release approval
- [ ] Golden design fixtures covering Auto Layout, variants, variables, gradients, masks, and image fills
- [ ] Optional OAuth adapter for applications that should not ask users to paste PATs
- [ ] A backend-neutral internal selection abstraction that can compare REST and Plugin outputs without silently falling back between them
- [ ] Snapshot-size observability that reports counts and byte estimates without logging private node contents
- [ ] Fork-intelligence triage that opens no issues automatically but produces an attributable maintainer review queue

## Write boundary

Write operations are not part of the default roadmap. Any future write-capable Plugin mode must be separate, opt-in, narrowly scoped, visibly named, independently permissioned, approved per operation, and verified after each change. Existing read tools must never become write-capable through a silent configuration change.
