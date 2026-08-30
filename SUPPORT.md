# Support

## Before opening an issue

Run the offline verification path first:

```bash
pnpm install --frozen-lockfile
pnpm check
```

For local configuration or a Figma URL:

```bash
pnpm --filter figma-mcp-free dev -- doctor "<FIGMA_URL>"
pnpm --filter figma-mcp-free dev -- doctor "<FIGMA_URL>" --json
```

Remove tokens, private file IDs, private layer names, text content and local usernames before sharing output.

## Where to report

- Reproducible bug: GitHub bug report template.
- Feature or design proposal: GitHub feature request template.
- Security issue or possible token exposure: follow [SECURITY.md](SECURITY.md), not a public issue.
- Question about a Figma plan, seat or official quota: consult current Figma documentation or Figma support. This project cannot change account limits.
- Problem limited to a fork: run `pnpm check:fork`, identify the fork commit, and report upstream only when the issue also affects upstream or the change is being proposed for adoption.

## Useful bug information

Include:

- operating system
- Node.js and pnpm versions
- command or MCP client
- backend capability output when available
- sanitized error class, status and rate-limit metadata
- minimal Figma URL shape without a real file ID
- whether the offline demo passes
- whether the problem occurs on upstream `main` or only in a fork
- exact reproduction steps

## Support boundaries

Maintainers can investigate this repository's code and documentation. They cannot recover a Figma account, increase a Figma quota, restore a deleted design, debug a private file without a safe reproduction, or guarantee compatibility with an untested third-party MCP client version.

Generated UI code is a starter. It still requires product-specific accessibility, responsive, interaction and visual review.
