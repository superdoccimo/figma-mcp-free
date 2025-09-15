import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";
import { FigmaClient } from "@figma-mcp-free/figma-client";
import { toDesignTokens, buildCssVarIndex, buildTypographyVarIndex, buildSizeSpacingVarIndex, buildShadowVarIndex, shadowKey, normalizeHex } from "@figma-mcp-free/design-tokens";
import { generateCode, type Framework } from "@figma-mcp-free/code-generator";
import { getToken as getConfigToken } from "@figma-mcp-free/config";

function getToken(): string {
  const token = process.env.FIGMA_TOKEN || getConfigToken();
  if (!token) throw new Error("FIGMA_TOKEN is not set");
  return token;
}

async function main() {
  const server = new Server({ name: "figma-mcp-free", version: "0.1.0" });

  server.tool(
    "get_file",
    {
      description: "Get a Figma file by ID",
      inputSchema: z.object({ fileId: z.string() })
    },
    async ({ fileId }) => {
      const client = new FigmaClient({ token: getToken() });
      const file = await client.getFile(fileId);
      return { content: [{ type: "text", text: JSON.stringify(file) }] };
    }
  );

  server.tool(
    "get_components",
    {
      description: "List components for a Figma file (normalized)",
      inputSchema: z.object({ fileId: z.string(), q: z.string().optional(), limit: z.number().int().positive().max(1000).optional() })
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
      return { content: [{ type: "json", json: items }] } as any;
    }
  );

  server.tool(
    "list_frames",
    {
      description: "List frame nodes in a file",
      inputSchema: z.object({ fileId: z.string() })
    },
    async ({ fileId }) => {
      const client = new FigmaClient({ token: getToken() });
      const frames = await client.listFrames(fileId);
      return { content: [{ type: "text", text: JSON.stringify(frames) }] };
    }
  );

  server.tool(
    "export_tokens",
    {
      description: "Export design tokens from a file",
      inputSchema: z.object({ fileId: z.string() })
    },
    async ({ fileId }) => {
      const client = new FigmaClient({ token: getToken() });
      const file = await client.getFile(fileId);
      const tokens = toDesignTokens(file);
      return { content: [{ type: "json", json: tokens }] } as any;
    }
  );

  server.tool(
    "generate_code",
    {
      description: "Generate UI code for a node in a file (optionally with tokens)",
      inputSchema: z.object({
        fileId: z.string(),
        nodeId: z.string(),
        framework: z.enum(["react", "vue", "svelte", "html"]),
        tokens: z.any().optional(),
        varPrefix: z.string().optional()
      })
    },
    async ({ fileId, nodeId, framework, tokens, varPrefix }: { fileId: string; nodeId: string; framework: Framework; tokens?: unknown; varPrefix?: string }) => {
      const client = new FigmaClient({ token: getToken() });
      const node = await client.getNode(fileId, nodeId);
      let opts: Parameters<typeof generateCode>[2] | undefined;
      if (tokens && typeof tokens === "object") {
        try {
          const prefix = varPrefix ?? "--";
          const colorIdx = buildCssVarIndex(tokens as any, { prefix });
          const typoIdx = buildTypographyVarIndex(tokens as any, { prefix });
          const sizeIdx = buildSizeSpacingVarIndex(tokens as any, { prefix });
          const shadowIdx = buildShadowVarIndex(tokens as any, { prefix });
          opts = {
            colorVar: (hex) => colorIdx.colorMap[hex.toLowerCase()],
            typography: {
              fontSize: (px) => typoIdx.fontSizeMap[Math.round(px)],
              lineHeight: (px) => typoIdx.lineHeightMap[Math.round(px)],
              letterSpacing: (px) => typoIdx.letterSpacingMap[Math.round(px)],
              fontFamily: (name) => typoIdx.fontFamilyMap[name],
              fontWeight: (w) => typoIdx.fontWeightMap[Math.round(w)],
            },
            dimension: (px) => sizeIdx.sizePxMap[Math.round(px)],
            spacing: (px) => sizeIdx.spacingPxMap[Math.round(px)],
            shadowVar: ({ inset, dx, dy, blur, spread, color }) => shadowIdx.map[shadowKey(!!inset, dx, dy, blur, spread, color ? normalizeHex(color) : undefined)]
          } as any;
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
