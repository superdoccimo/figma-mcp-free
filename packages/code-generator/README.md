# @figma-mcp-free/code-generator

Deterministic starter-code generator for Figma node JSON.

Supported output targets:

- React
- Vue
- Svelte
- HTML

The output is a starting point, not a claim of pixel-perfect production code. Product-specific responsiveness, accessibility, interactions, state, assets, semantics and visual review remain necessary.

## Source usage

```bash
pnpm install --frozen-lockfile
pnpm -r build
pnpm --filter figma-mcp-free dev -- generate-from-json ./examples/sample-node.json --framework react
```

Generation tests use checked-in fixtures so changes are reviewable and do not require a live Figma token.

When changing rendering behavior:

1. Add or update a minimal input fixture.
2. Update the expected framework output.
3. Explain compatibility effects in the pull request.
4. Run `pnpm check`.

See the root [README](../../README.md) and [contribution guide](../../CONTRIBUTING.md).
