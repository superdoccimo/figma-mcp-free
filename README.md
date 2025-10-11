# figma-mcp-free

![CI](https://github.com/superdoccimo/figma-mcp-free/actions/workflows/ci.yml/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## Supported Figma links (Important)

- ✅ Supports **/file** or **/design** links (e.g., `https://www.figma.com/design/<FILE_ID>/...`)
- ❌ **/slides** are not supported by the API (node information cannot be retrieved)
- **Node ID format**: Figma URLs use `?node-id=1-2`, but the API/CLI requires `1:2` (hyphen to colon).

Quick check:
```bash
# If you can issue a temporary URL for an image (expires soon), it's OK.
curl -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/images/<FILE_ID>?ids=1:2&format=png"
```

Quick Start (from clone)

0) In Figma, get a **/design** (or /file) link and execute **Link to selection** on the target frame.
   → Convert the `?node-id=1-2` in the URL to **`1:2`** and make a note (this is `<NODE_ID>`)

1) Operation verification (optional)
```bash
curl -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/files/<FILE_ID>/nodes?ids=<NODE_ID>"
```
→ If JSON is returned, it's OK. Then execute the following commands.

- Star this repo to support the project!
- Clone: `git clone https://github.com/superdoccimo/figma-mcp-free.git`
- Install: `cd figma-mcp-free && pnpm install && pnpm -r build`
- Set token: `pnpm --filter figma-mcp-free dev -- init`
- Find components: `pnpm --filter figma-mcp-free dev -- components <FILE_ID> --query Button --limit 5`
- Generate (no tokens): `pnpm --filter figma-mcp-free dev -- generate <FILE_ID> <NODE_ID> --framework react > out-no-tokens.jsx`
- Export tokens: `pnpm --filter figma-mcp-free dev -- export-tokens <FILE_ID> > tokens.json`
- Generate (with tokens): `pnpm --filter figma-mcp-free dev -- generate <FILE_ID> <NODE_ID> --framework react --use-tokens ./tokens.json > out-with-tokens.jsx`

## Assets / Images Handling (Important)

- **Figma view URLs (/slides, /design, /file) are not direct image links.**
- You can use temporary URLs from the **Images API** during development, but they **expire quickly**.
- For production, use **(a) images exported from Figma to `/public/images`** or **(b) direct links from your own server/CDN**.

Next.js configuration (when using external direct links):
```js
// next.config.js
export default {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'minokamo.tokyo' },
      { protocol: 'https', hostname: 'vibelsd.com' }
      // If using temporary URLs, also add images.figma.com / s3-*.amazonaws.com etc.
    ]
  }
}
```

## Troubleshooting: Only a black frame is displayed

- `next/image` **allowed domain missing** → `/_next/image?...` returns 400
- **Temporary URL expired** → 403/404
- **Path/extension/case mismatch** (e.g., expecting `/public` but file is not there)
- **Export mismatch** (e.g., using only rounded rectangles and forgetting to replace images)
- Mask/clip related issues → Try `use_absolute_bounds=true` with the Images API

Demo scripts
- Prerequisite: `FIGMA_TOKEN`, `FILE_ID`, and `NODE_ID` are all required (`NODE_ID` in `1:2` format).
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

Note: The Figma REST API is fundamentally **read-only**. **Writing operations** such as adding, editing, or moving designs **cannot be done via REST**. If necessary, use the **Figma Plugin API** (executed within the editor) or **browser automation**.

### Visual comparison

![Comparison of enclosure strategies highlighting community alternatives](https://private-us-east-1.manuscdn.com/sessionFile/cYYyfjHYjPMypbmfJARaoH/sandbox/PnoIpgKScKT1IADGEN4iGk-images_1758603284019_na1fn_L2hvbWUvdWJ1bnR1L2ZpZ21hLW1jcC1mcmVlL2ZpZ21hX2NvbXBhcmlzb25fY2hhcnRfZW4.svg?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvY1lZeWZqSFlqUE15cGJtZkpBUmFvSC9zYW5kYm94L1Bub0lwZ0tTY0tUMUlBREdFTjRpR2staW1hZ2VzXzE3NTg2MDMyODQwMTlfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwyWnBaMjFoTFcxamNDMW1jbVZsTDJacFoyMWhYMk52YlhCaGNtbHpiMjVmWTJoaGNuUmZaVzQuc3ZnIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=HSAqTEMZxiCMQvmAIAuXUBctSdHOzA3a3AL4DBn0I7B5COupG2Qf5i5gp9iVwHq1c9fm3QRw2LoC8FJIQGsMsz-sU7f5XbZlv7HvTyOR9MueDui0iD9ZYnqWwCTGBqaxOhWsWdufhhW1w6iAzddvf~XFneLBQTrUzlsSupTKEq0JxZKL9Dy5LnK9flAjSwvVS7YCv4l~qR~k5~F2Ta5ssnHWdps4eRcaKN2lIPAOb5GZTVyBxrHA4tQxTwXiJnIwiKADI9eaYndkyS2U6hucGRa0PhUmwtW0bzeFOmhHGdc3TWpGDvOQfC~pay8~-jLZ88fHfCx7Fdl702FDXoKU0w__)

| Company/Product | Enclosure strategy | Community alternative |
| --- | --- | --- |
| Figma Dev Mode | Monetized MCP server, write API restricted | `figma-mcp-free` (read-only API is enough) |
| Docker Desktop | OSS engine bundled with commercial licensing | Podman, Rancher Desktop |
| Elasticsearch | Shift from OSS to Elastic License | OpenSearch |
| Terraform | Re-licensed under HashiCorp License | OpenTofu |
| MongoDB | SSPL limits third-party cloud hosting | FerretDB, DocumentDB |
| Supabase | Paid packaging of an OSS stack | Operate the OSS components directly |

### What read-only access still delivers

> **Note:** Figma REST API is primarily **read-only**. **Adding/editing/moving designs cannot be done through REST**. For write operations, use the **Figma Plugin API** (runs inside the editor) or **browser automation**.

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

![Architecture diagram showing Claude/Cursor clients talking to the figma-mcp-free server and Figma API](https://private-us-east-1.manuscdn.com/sessionFile/cYYyfjHYjPMypbmfJARaoH/sandbox/PnoIpgKScKT1IADGEN4iGk-images_1758603284020_na1fn_L2hvbWUvdWJ1bnR1L2ZpZ21hLW1jcC1mcmVlL2ZpZ21hX2FyY2hpdGVjdHVyZV9kaWFncmFtX2Vu.svg?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvY1lZeWZqSFlqUE15cGJtZkpBUmFvSC9zYW5kYm94L1Bub0lwZ0tTY0tUMUlBREdFTjRpR2staW1hZ2VzXzE3NTg2MDMyODQwMjBfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwyWnBaMjFoTFcxamNDMW1jbVZsTDJacFoyMWhYMkZ5WTJocGRHVmpkSFZ5WlY5a2FXRm5jbUZ0WDJWdS5zdmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=M1AXYtBJ7N4Hj~ERJOX6xbrYhyfvVN2NTrdfQz319Q0OB2YpQh2JCuxjTcd4IdRCIoUff8Y0SEBx2QbI88SVN9x80e~9s8IoqgzvTv5VbddskHR1T~yrX9B6e~5pmB~rKxcpKm12EdHH06Q102WqsaI30fCouJuPgr5XIKJHfAHTxFM1Ve82LKA0IUBcpcA~6mwjX2E7McRxtxiFys~hpOw3XuWTx-GjrJBVQfCvpTCcywviosl-841LZLsfI7VagHNtJPsU1OJl-VpdgjPRCfnbTfRNGru30sXWyMEU-gnO5nX~siNjMMOO0K0u4NHVM80HM1yFdCzPBftY9fnqdg__)

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

## Security: Handling FIGMA_TOKEN

- Save it in `.env` or local configuration, and **do not commit it to Git** (refer to `.env.example`)
- Inject it as an environment variable in CI (`-- init --token <FIGMA_TOKEN>` is also possible)
- In case of leakage, **Revoke and re-issue** from Figma's Personal access tokens settings.

CLI token setup
- Save token locally: `pnpm --filter figma-mcp-free dev -- init` (or `-- init --token <FIGMA_TOKEN>` for CI)
- Check status: `pnpm --filter figma-mcp-free dev -- config get token`
- If `FIGMA_TOKEN` is not present in the environment, the server falls back to the local config (`@figma-mcp-free/config`).

## Security: FIGMA_TOKEN Handling

- Store in `.env` or local config, **never commit to Git** (see `.env.example`)
- For CI: inject via environment variables (`-- init --token <FIGMA_TOKEN>` is also supported)
- If leaked: **go to Figma Personal access tokens -> Revoke -> regenerate**

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

![Timeline diagram illustrating setup, design token export, component generation, and deployment flow](https://private-us-east-1.manuscdn.com/sessionFile/cYYyfjHYjPMypbmfJARaoH/sandbox/PnoIpgKScKT1IADGEN4iGk-images_1758603284021_na1fn_L2hvbWUvdWJ1bnR1L2ZpZ21hLW1jcC1mcmVlL2ZpZ21hX3dvcmtmbG93X3RpbWVsaW5lX2Vu.svg?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvY1lZeWZqSFlqUE15cGJtZkpBUmFvSC9zYW5kYm94L1Bub0lwZ0tTY0tUMUlBREdFTjRpR2staW1hZ2VzXzE3NTg2MDMyODQwMjFfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwyWnBaMjFoTFcxamNDMW1jbVZsTDJacFoyMWhYM2R2Y210bWJHOTNYM1JwYldWc2FXNWxYMlZ1LnN2ZyIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=v6iWicOTpKQrQNPNL8dt1FEHMUOG4AEkU~4HyuE-LgCllvzko3N1tNXaHoJhfsVE~K6Wjrh~vWkYkCXpYjJlCoEDIWD4p90ec5-cXyRWI0hIhOAxMOubqtbrMvNcTqz2DRAqU5l9-q03z14fp5zAamTfU2kSrtQfHPYFK-vOUVPX7pys3NCLuhD8Z7BL1fKs80IzD0EQpbbg8M8ppPA185rHeXJseWM3PZNjo0xwRwdSNjiE~F9bEcfbqMB1Y10-2SufMpEp~8uTR1LgMTIFLTxSmFUolxnvTvFQX4bc3EnIBoCuWhMSihvOzE~vToRSWSzKOxBWe6LrQCRO1uoLGQ__)

Community
- File an issue if you hit a missing endpoint or authenticator gap.
- Start a discussion to share workflows or request new framework/token support.
- PRs welcome—see `CONTRIBUTING.md` for required checks.

## Resources

### Tutorials & Guides
- 🌐 **English**: [Comprehensive Setup Guide](https://betelgeuse.work/figma-mcp/)
- 🌍 **Español**: [Guía de Configuración](https://ehrigite.com/figma-mcp/)
- 🇯🇵 **日本語**: [詳細セットアップガイド](https://minokamo.tokyo/2025/09/18/9360/)

### Video Tutorials
- 🎥 **English**: [figma-mcp-free Setup Tutorial](https://youtu.be/5c2QNSXRwyk)
- 🎥 **日本語**: [figma-mcp-free セットアップチュートリアル](https://youtu.be/f2YqnKAy80Y)


