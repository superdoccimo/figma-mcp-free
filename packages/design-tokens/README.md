# @figma-mcp-free/design-tokens

Deterministic extraction of implementation-oriented design tokens from Figma node JSON.

Current token categories include:

- colors
- spacing and dimensions
- typography
- shadows and effects

Output follows the W3C Design Tokens direction used by this repository. It is generated from available Figma node data and may require project-specific naming, aliasing and semantic review.

## Source usage

```bash
pnpm install --frozen-lockfile
pnpm -r build
pnpm --filter figma-mcp-free dev -- export-tokens "<FIGMA_URL>" > tokens.json
```

Offline sample:

```bash
cat examples/sample-tokens.json
```

Do not commit tokens extracted from a private design system unless the project owner has approved publication.

When changing token output, add deterministic fixtures, document schema changes and run `pnpm check`.

See the root [README](../../README.md).
