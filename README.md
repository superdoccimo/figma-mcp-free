# figma-mcp-free

![CI](https://github.com/superdoccimo/figma-mcp-free/actions/workflows/ci.yml/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Quick Start (from clone)
- Star this repo to support the project!
- Clone: `git clone https://github.com/superdoccimo/figma-mcp-free.git`
- Install: `cd figma-mcp-free && pnpm install && pnpm -r build`
- Set token: `pnpm --filter figma-mcp-free dev -- config set token <FIGMA_TOKEN>`
- Find components: `pnpm --filter figma-mcp-free dev -- components <FILE_ID> --query Button --limit 5`
- Generate (no tokens): `pnpm --filter figma-mcp-free dev -- generate <FILE_ID> <NODE_ID> --framework react > out-no-tokens.jsx`
- Export tokens: `pnpm --filter figma-mcp-free dev -- export-tokens <FILE_ID> > tokens.json`
- Generate (with tokens): `pnpm --filter figma-mcp-free dev -- generate <FILE_ID> <NODE_ID> --framework react --use-tokens ./tokens.json > out-with-tokens.jsx`

Demo scripts
- `./scripts/demo.sh` runs the above end-to-end. Requires env: `FIGMA_TOKEN`, `FILE_ID`, `NODE_ID`.
- Offline fallback: `pnpm --filter figma-mcp-free dev -- generate-from-json ./examples/sample-node.json --framework react --use-tokens ./examples/sample-tokens.json`

Free, open MCP server alternative to Figma Dev Mode.

- Protocol: MCP STDIO
- API: Figma REST (Personal Access Token)
- Language: TypeScript / Node 18+

Getting started and roadmap: see `figma_mcp_requirements.md` and `docs/`.

- Setup notes: `basic_notes.md`
- Suggested commands: `suggested_commands.md`
- Example env: `.env.example` (do not commit real tokens)

Basic usage (client only)
- Set `FIGMA_TOKEN` in your environment (or wire into the server/CLI later)
- Use `FigmaClient` to call the API:

```ts
import { FigmaClient } from "@figma-mcp-free/figma-client";
const client = new FigmaClient({ token: process.env.FIGMA_TOKEN! });
const file = await client.getFile("<FILE_ID>");
const components = await client.getComponents("<FILE_ID>");
const frames = await client.listFrames("<FILE_ID>");
```

Run MCP Server (stdio)
- Build packages: `pnpm -r build`
- Ensure `FIGMA_TOKEN` is set in environment
- Start server: `node packages/mcp-server/dist/index.js`

CLI token setup
- Save token locally: `pnpm --filter figma-mcp-free dev -- config set token <FIGMA_TOKEN>`
- Check status: `pnpm --filter figma-mcp-free dev -- config get token`
- Serverは `FIGMA_TOKEN` が未設定のとき、ローカル設定（`@figma-mcp-free/config`）から自動取得します。

CLI commands
- Generate code: `pnpm --filter figma-mcp-free dev -- generate <FILE_ID> <NODE_ID> --framework react`
- Export tokens: `pnpm --filter figma-mcp-free dev -- export-tokens <FILE_ID>`
- List components: `pnpm --filter figma-mcp-free dev -- components <FILE_ID> [--query <text>] [--limit <n>] [--json]`
  - Optional: `--use-tokens ./tokens.json [--var-prefix --]` to replace hex colors with CSS variables from W3C tokens JSON (e.g., `var(--color-page-frame-shape)`).
  - With tokens, typography may also map to vars when matching values exist: font-size, line-height, letter-spacing, font-family, font-weight.
  - Size/spacing tokens: width/height（dimension）やpaddingは一致するpx値があれば `var(--size-...)` / `var(--spacing-...)` に置換されます。
  - Shadow tokens: DROP_SHADOW/INNER_SHADOW が tokens.shadow に一致する場合、`box-shadow: var(--shadow-...)` に置換されます。

Exporting design tokens
- Tool: `export_tokens` (input: `{ fileId: string }`)
- Output: W3C Design Tokens (module v1)
  - color: SOLID fills → `color` tokens（`#RRGGBB`/`#RRGGBBAA`）
  - spacing: padding各辺（存在する箇所のみ）→ `spacing/<path>-padding-{top|right|bottom|left}`
  - size: width/height（absoluteBoundingBox）→ `size/<path>-{width|height}`
  - typography: TEXTノードの `fontFamily/fontSize/lineHeight/letterSpacing/fontWeight` → `typography/<path>`
  - shadow: DROP_SHADOW/INNER_SHADOW → `shadow/<path>`（CSS `box-shadow`形式、複数影はカンマ区切り）
  - Token keys reflect the node path, e.g. `page/frame/shape`

List components (normalized)
- Tool: `get_components` (input: `{ fileId: string, q?: string, limit?: number }`)
- Optional filters: `{ q?: string, limit?: number }`
- Output: `[{ key, nodeId, name }]`

Generate code from a node
- Tool: `generate_code` (input: `{ fileId: string, nodeId: string, framework: "react" | "vue" | "svelte" | "html" }`)
- Minimal implementation inspects node type/size/fills and TEXT characters, building simple nested markup.
- Also maps basic styles when available: border (stroke), border radius, padding, auto-layout (flex direction/gap), and text styles (font size/line-height/weight/align).
- Enhanced mapping: text color from fills, font-family, letter-spacing, flex alignment (justify/align), and absolute positioning (`layoutPositioning=ABSOLUTE` uses `left/top`).
- Shadows: DROP_SHADOW/INNER_SHADOW を `box-shadow` に変換（色はtokensがあれば置換）。
- Shadow tokens: tokens.shadow に構造的に一致する場合は、`var(--shadow-...)` で出力。
- Tokens support: pass `{ tokens, varPrefix? }` to substitute colors/typography/size/spacing/shadow with CSS variables.

MCP example (generate_code)
Input (JSON):
```
{
  "fileId": "<FILE_ID>",
  "nodeId": "<NODE_ID>",
  "framework": "react",
  "tokens": { "$schema": "https://design-tokens.github.io/community-group/format/module.v1.json", "color": { "page/frame/shape": { "value": "#112233" } } },
  "varPrefix": "--"
}
```
Output: Code string with color replaced by `var(--color-page-frame-shape)` when matched.
