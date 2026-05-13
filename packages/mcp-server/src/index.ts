import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { FigmaClient } from "@figma-mcp-free/figma-client";
import { toDesignTokens, buildCssVarIndex, buildTypographyVarIndex, buildSizeSpacingVarIndex, buildShadowVarIndex, shadowKey, normalizeHex } from "@figma-mcp-free/design-tokens";
import { generateCode, type Framework, type GenerateOptions } from "@figma-mcp-free/code-generator";
import { getToken as getConfigToken } from "@figma-mcp-free/config";

function getToken(): string {
  const token = process.env.FIGMA_TOKEN || getConfigToken();
  if (!token) throw new Error("FIGMA_TOKEN is not set");
  return token;
}

async function main() {
  const server = new McpServer({ name: "figma-mcp-free", version: "0.1.0" });

  server.registerTool(
    "get_file",
    {
      description: "Get a Figma file by ID",
      inputSchema: { fileId: z.string() }
    },
    async ({ fileId }) => {
      const client = new FigmaClient({ token: getToken() });
      const file = await client.getFile(fileId);
      return { content: [{ type: "text", text: JSON.stringify(file) }] };
    }
  );

  server.registerTool(
    "get_components",
    {
      description: "List components for a Figma file (normalized)",
      inputSchema: { fileId: z.string(), q: z.string().optional(), limit: z.number().int().positive().max(1000).optional() }
    },
    async ({ fileId, q, limit }: { fileId: string; q?: string; limit?: number }) => {
      const client = new FigmaClient({ token: getToken() });
      const raw = await client.getComponents(fileId);
      let items = raw.meta.components.map(c => ({ key: c.key, nodeId: c.node_id, name: c.name }));
      if (q) {
        const low = q.toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(low));
      }
      if (limit) items = items.slice(0, limit);
      return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
    }
  );

  server.registerTool(
    "list_frames",
    {
      description: "List frame nodes in a file",
      inputSchema: { fileId: z.string() }
    },
    async ({ fileId }) => {
      const client = new FigmaClient({ token: getToken() });
      const frames = await client.listFrames(fileId);
      return { content: [{ type: "text", text: JSON.stringify(frames) }] };
    }
  );

  server.registerTool(
    "export_tokens",
    {
      description: "Export design tokens from a file",
      inputSchema: { fileId: z.string() }
    },
    async ({ fileId }) => {
      const client = new FigmaClient({ token: getToken() });
      const file = await client.getFile(fileId);
      const tokens = toDesignTokens(file);
      return { content: [{ type: "text", text: JSON.stringify(tokens, null, 2) }] };
    }
  );

  server.registerTool(
    "generate_code",
    {
      description: "Generate UI code for a node in a file (optionally with tokens)",
      inputSchema: {
        fileId: z.string(),
        nodeId: z.string(),
        framework: z.enum(["react", "vue", "svelte", "html"]),
        tokens: z.any().optional(),
        varPrefix: z.string().optional()
      }
    },
    async ({ fileId, nodeId, framework, tokens, varPrefix }: { fileId: string; nodeId: string; framework: Framework; tokens?: unknown; varPrefix?: string }) => {
      const client = new FigmaClient({ token: getToken() });
      const node = await client.getNode(fileId, nodeId);
      let opts: GenerateOptions | undefined;
      if (tokens && typeof tokens === "object") {
        try {
          const prefix = varPrefix ?? "--";
          const colorIdx = buildCssVarIndex(tokens as any, { prefix });
          const typoIdx = buildTypographyVarIndex(tokens as any, { prefix });
          const sizeIdx = buildSizeSpacingVarIndex(tokens as any, { prefix });
          const shadowIdx = buildShadowVarIndex(tokens as any, { prefix });
          opts = {
            colorVar: (hex: string) => colorIdx.colorMap[hex.toLowerCase()],
            typography: {
              fontSize: (px: number) => typoIdx.fontSizeMap[Math.round(px)],
              lineHeight: (px: number) => typoIdx.lineHeightMap[Math.round(px)],
              letterSpacing: (px: number) => typoIdx.letterSpacingMap[Math.round(px)],
              fontFamily: (name: string) => typoIdx.fontFamilyMap[name],
              fontWeight: (w: number) => typoIdx.fontWeightMap[Math.round(w)],
            },
            dimension: (px: number) => sizeIdx.sizePxMap[Math.round(px)],
            spacing: (px: number) => sizeIdx.spacingPxMap[Math.round(px)],
            shadowVar: ({ inset, dx, dy, blur, spread, color }: { inset: boolean; dx: number; dy: number; blur: number; spread: number; color: string | undefined }) => shadowIdx.map[shadowKey(!!inset, dx, dy, blur, spread, color ? normalizeHex(color) : undefined)]
          };
        } catch (e) {
          // ignore token building errors and proceed without substitution
        }
      }
      const code = generateCode(node ?? { id: nodeId }, framework, opts);
      return { content: [{ type: "text", text: code }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
