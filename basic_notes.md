# figma-mcp-free Basic Notes

## Overview
- Goal: Free, open MCP server alternative to Figma Dev Mode, using MCP STDIO and Figma REST API with Personal Access Token.
- Lang/Runtime: TypeScript on Node.js 18+

## Proposed Packages
- packages/mcp-server: MCP STDIO server (uses `@modelcontextprotocol/sdk`)
- packages/figma-client: Thin Figma REST client (token-based)
- packages/design-tokens: W3C Design Tokens conversion helpers
- packages/code-generator: React/Vue/Svelte/HTML emitters (future)
- packages/cli: User-facing CLI (`figma-mcp-free`)

## Initial MCP Tools (Phase 1)
- get_file(fileId)
- list_frames(fileId)
- get_components(fileId)
- export_tokens(fileId)
- generate_code(componentId, framework)

## Environment
- `FIGMA_TOKEN`: Figma Personal Access Token with file read scope

## Next Steps
1) Scaffold monorepo and packages (see suggested_commands.md)
2) Implement `packages/figma-client` basic getFile + components
3) Register MCP tools in `packages/mcp-server/src/index.ts`
4) Wire CLI to set and store `FIGMA_TOKEN`
5) Add examples for Codex/Cursor configuration under `examples/`

## References
- See `figma_mcp_requirements.md` for full requirements, roadmap, and messaging.

