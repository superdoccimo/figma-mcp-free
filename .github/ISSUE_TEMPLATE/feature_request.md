---
name: Feature request
about: Propose a compatible, quota-aware improvement
labels: enhancement
---

## User problem

What real workflow is blocked or unnecessarily expensive today?

## Proposed capability

Describe the smallest useful behavior. Include the preferred CLI command, MCP tool, plugin action, or GitHub workflow when relevant.

## Backend and API cost

- [ ] REST backend
- [ ] Local Plugin backend
- [ ] Shared inspector / generator
- [ ] CLI
- [ ] MCP server
- [ ] GitHub / fork workflow
- [ ] Documentation only

Expected Figma REST calls per operation:

Can reads be batched, cached, bounded, or moved to the explicit-capture Local Plugin path?

## Compatibility

- Existing commands or MCP tools affected:
- Can the change be additive and optional?
- Migration needed for forks or downstream packages:

## Read-only and security boundary

- Does this proposal require a Figma write operation?
- Credentials or private design content involved:
- New network, filesystem, or persistence behavior:

Write-capable proposals must use separate, visibly named, opt-in tools and require a dedicated security review.

## Alternatives considered

What simpler path, existing Figma capability, competitor behavior, or downstream fork implementation was considered?

## Evidence

Links to a fork commit, reproducible fixture, issue, official documentation, or measured workflow are especially useful. Do not include secrets or private design content.

## Success criteria

How should maintainers verify that the feature is useful, compatible, and safe?
