---
name: Bug report
about: Report reproducible incorrect behavior without exposing private Figma data
title: "[Bug] "
labels: bug
assignees: ""
---

## Summary

Describe what happened and what you expected.

## Reproduction

Provide the smallest sequence that reproduces the problem. Replace real file IDs, node text and tokens with placeholders.

```text
commands or MCP tool calls
```

## Environment

- Operating system:
- Node.js:
- pnpm:
- MCP client and version, when applicable:
- Repository commit or release:
- Upstream or fork repository:

## Diagnostics

Does the offline demo pass?

```bash
pnpm check
```

For a Figma URL, include sanitized output from:

```bash
pnpm --filter figma-mcp-free dev -- doctor "<SANITIZED_FIGMA_URL>" --json
```

Do not include a token, real private file ID, private layer names, text content or raw private API response.

## Error

Include the error class, status and sanitized structured metadata. For a `429`, include plan/rate-limit fields only if returned by Figma and safe to share.

## Regression

- Did this work before?
- First known failing commit or version:
- Does it also fail on current upstream `main`?

## Additional context

A screenshot is optional and must not expose private designs or credentials.

For a security or token-exposure issue, stop and follow `SECURITY.md` instead of submitting this public report.
