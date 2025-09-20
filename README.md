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

Documentation map
- `docs/quickstart.md` – English quickstart covering install, token storage, and CLI usage.
- `docs/troubleshooting.md` – Common pitfalls (token scopes, rate limits) and recovery steps.
- `index.md` – Working draft for the detailed Japanese walkthrough.
- Campaign article (JP): https://minokamo.tokyo/2025/09/18/9360/
- Upcoming English deep dive: https://vibelsd.com/figma-mcp-free (placeholder)
- Upcoming Spanish deep dive: https://vibelsd.net/figma-mcp-free (placeholder)

Free, open MCP server alternative to Figma Dev Mode.

- Protocol: MCP STDIO
- API: Figma REST (Personal Access Token)
- Language: TypeScript / Node 18+

Getting started and roadmap: see `figma_mcp_requirements.md` and `docs/`.

- Campaign article for GitHub users (JP): `jp/docs/marketing/github-article.md`
- Japanese documentation: [jp/README.md](jp/README.md)

- Setup notes: `basic_notes.md`
- Suggested commands: `suggested_commands.md`
- Example env: `.env.example` (do not commit real tokens)

## Why this project exists

- Figma restricts its official MCP server to paid Dev Mode seats even though MCP itself is an open standard; Personal Access Tokens remain read-only.
- `figma-mcp-free` proves that the read-only API still unlocks practical workflows and challenges enclosure strategies around open technology.

### Visual comparison

![Comparison of enclosure strategies highlighting community alternatives](figma_comparison_chart_en.svg)

| Company/Product | Enclosure strategy | Community alternative |
| --- | --- | --- |
| Figma Dev Mode | Monetized MCP server, write API restricted | `figma-mcp-free` (read-only API is enough) |
| Docker Desktop | OSS engine bundled with commercial licensing | Podman, Rancher Desktop |
| Elasticsearch | Shift from OSS to Elastic License | OpenSearch |
| Terraform | Re-licensed under HashiCorp License | OpenTofu |
| MongoDB | SSPL limits third-party cloud hosting | FerretDB, DocumentDB |
| Supabase | Paid packaging of an OSS stack | Operate the OSS components directly |

### What read-only access still delivers

- Extract design tokens -> generate CSS/Tailwind/W3C design token JSON
- Inspect component structure -> output React/Vue/Svelte/HTML code
- Capture layout data -> plan responsive implementation
- Gather color/typography info -> feed themes and design systems
- Inventory assets -> seed an image optimization pipeline

Even if you need write access, there are free-tier detours:
- **Figma Plugin**: execute `figma.createComponent(componentData);` inside a plugin to write back
- **Browser automation**: drive the web UI via Playwright/Puppeteer
- **Import workflow**: export with figma-mcp-free -> tweak locally -> re-import via SVG or other supported formats

### Package capabilities

| Package | Purpose | Highlights |
| --- | --- | --- |
| `@figma-mcp-free/figma-client` | Thin wrapper around the Figma REST API | Handles auth headers, pagination, component & token fetch helpers |
| `@figma-mcp-free/code-generator` | Converts node JSON into framework code | React/Vue/Svelte/HTML renderers with layout, text, and shadow mapping |
| `@figma-mcp-free/design-tokens` | Normalises styles into W3C design token JSON | Generates color/spacing/size/typography/shadow tokens with var substitution |
| `@figma-mcp-free/mcp-server` | MCP STDIO server exposing Figma tools | `generate_code`, `get_components`, `export_tokens` tools ready for Claude/Cursor |
| `@figma-mcp-free/cli` | Developer CLI companion | `components`, `generate`, `export-tokens`, config storage for local tokens |

### Architecture overview

![Architecture diagram showing Claude/Cursor clients talking to the figma-mcp-free server and Figma API](figma_architecture_diagram_en.svg)

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
- If `FIGMA_TOKEN` is not present in the environment, the server falls back to the local config (`@figma-mcp-free/config`).

CLI commands
- Generate code: `pnpm --filter figma-mcp-free dev -- generate <FILE_ID> <NODE_ID> --framework react`
- Export tokens: `pnpm --filter figma-mcp-free dev -- export-tokens <FILE_ID>`
- List components: `pnpm --filter figma-mcp-free dev -- components <FILE_ID> [--query <text>] [--limit <n>] [--json]`
  - Optional: `--use-tokens ./tokens.json [--var-prefix --]` replaces hex colors with CSS variables derived from a W3C design token JSON (e.g., `var(--color-page-frame-shape)`).
  - With tokens, typography values map to variables when matches exist (font-size, line-height, letter-spacing, font-family, font-weight).
  - Size/spacing tokens map width, height, and padding pixel values to `var(--size-...)` / `var(--spacing-...)` when exact matches exist.
  - Shadow tokens map DROP_SHADOW/INNER_SHADOW styles to `var(--shadow-...)` when the design token index contains a matching shadow.

Exporting design tokens
- Tool: `export_tokens` (input: `{ fileId: string }`)
- Output: W3C Design Tokens (module v1)
  - color: SOLID fills -> `color` tokens (`#RRGGBB` / `#RRGGBBAA`)
  - spacing: padding on each edge (where present) -> `spacing/<path>-padding-{top|right|bottom|left}`
  - size: width/height (`absoluteBoundingBox`) -> `size/<path>-{width|height}`
  - typography: TEXT node `fontFamily/fontSize/lineHeight/letterSpacing/fontWeight` -> `typography/<path>`
  - shadow: DROP_SHADOW/INNER_SHADOW -> `shadow/<path>` (CSS `box-shadow` syntax, multiple shadows comma-separated)
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
- Shadows: convert DROP_SHADOW/INNER_SHADOW to `box-shadow` (substituting tokens when available).
- Shadow tokens: when a shadow structure matches `tokens.shadow`, output `var(--shadow-...)` instead.
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

Sample output (React)

```jsx
export function ButtonPrimary() {
  return (
    <div
      style={{
        backgroundColor: "var(--color-page-frame-shape)",
        borderRadius: "12px",
        padding: "var(--spacing-page-frame-shape-padding-top) var(--spacing-page-frame-shape-padding-right)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          color: "#FFFFFF",
          fontFamily: "'Inter', sans-serif",
          fontSize: "16px",
          fontWeight: 600,
        }}
      >
        Get Started
      </span>
    </div>
  );
}
```

### End-to-end workflow

![Timeline diagram illustrating setup, design token export, component generation, and deployment flow](figma_workflow_timeline_en.svg)

Community
- File an issue if you hit a missing endpoint or authenticator gap.
- Start a discussion to share workflows or request new framework/token support.
- PRs welcome—see `CONTRIBUTING.md` for required checks.
