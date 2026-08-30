---
name: Bug report
about: Report a reproducible problem without exposing credentials or private design data
labels: bug
---

> Security vulnerabilities must be reported privately through `SECURITY.md`.
> Never paste a PAT, pairing token, Authorization header, private Figma URL, private snapshot, or private layer text.

## Backend

- [ ] REST CLI
- [ ] REST MCP tool
- [ ] Local Plugin UI
- [ ] Local Plugin Bridge CLI
- [ ] Local Plugin MCP tool
- [ ] Fork audit / GitHub Actions
- [ ] Offline generator

## Description

What failed, and what user-visible impact did it have?

## Reproduction

1. Command or MCP tool name:
2. Safe synthetic input:
3. Steps:
4. Frequency: always / intermittent / once

## Expected behavior

What should have happened?

## Actual behavior

What happened instead?

## Environment

- Repository commit or version:
- Node.js:
- pnpm:
- Operating system:
- Figma Desktop version, if relevant:
- MCP client and version, if relevant:
- Fork repository, if relevant:

## Safe diagnostics

- `doctor --json` result with identifiers removed:
- `figma-mcp-free-bridge status` result:
- HTTP status only, if relevant:
- Cache / retry stats, if relevant:
- CI run or failing test name:

## API and security notes

- Number of Figma REST calls expected:
- Did the problem require `--refresh`?
- Was any secret or private content exposed? Do not paste it here. Report privately if yes.

## Additional context

Minimal public fixtures, screenshots with private content removed, or links to a fork commit are welcome.
