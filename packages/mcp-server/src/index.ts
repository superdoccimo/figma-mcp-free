import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FigmaClient, inspectSelection, resolveFigmaReference, resolveInspectSelectionLimits } from "@figma-mcp-free/figma-client";
import { toDesignTokens, buildCssVarIndex, buildTypographyVarIndex, buildSizeSpacingVarIndex, buildShadowVarIndex, shadowKey, normalizeHex } from "@figma-mcp-free/design-tokens";
import { generateCode, type Framework, type GenerateOptions } from "@figma-mcp-free/code-generator";
import { getToken as getConfigToken } from "@figma-mcp-free/config";
import {
  exportTokensInputSchema,
  generateCodeInputSchema,
  getComponentsInputSchema,
  getFileInputSchema,
  inspectSelectionInputSchema,
  listFramesInputSchema
} from "./tool-schemas.js";

function getToken(): string {
  const token = process.env.FIGMA_TOKEN || getConfigToken();
  if (!token) throw new Error("FIGMA_TOKEN is not set");
  return token;
}

type FigmaInput = { fileId?: string; figmaUrl?: string; nodeId?: string };

function resolveInput(input: FigmaInput) {
  const fileIdOrUrl = input.figmaUrl ?? input.fileId;
  if (!fileIdOrUrl) {
    throw new Error("Provide fileId or figmaUrl.");
  }
  return resolveFigmaReference(fileIdOrUrl, input.nodeId);
}

async function main() {
  const server = new McpServer({ name: "figma-mcp-free", version: "0.1.0" });

  server.registerTool(
    "get_file",
    {
      description: "Get a Figma file by fileId or Figma /file or /design URL",
      inputSchema: getFileInputSchema
    },
    async ({ fileId, figmaUrl, depth }: { fileId?: string; figmaUrl?: string; depth?: number }) => {
      const ref = resolveInput({ fileId, figmaUrl });
      const client = new FigmaClient({ token: getToken() });
      const file = await client.getFile(ref.fileId, depth);
      return { content: [{ type: "text", text: JSON.stringify(file) }] };
    }
  );

  server.registerTool(
    "inspect_selection",
    {
      description: "Organize selected layer REST API data into a compact structure for code implementation. This is not the official get_design_context tool.",
      inputSchema: inspectSelectionInputSchema
    },
    async ({ fileId, figmaUrl, nodeId, depth, maxChildren }: { fileId?: string; figmaUrl?: string; nodeId?: string; depth?: number; maxChildren?: number }) => {
      const ref = resolveInput({ fileId, figmaUrl, nodeId });
      if (!ref.nodeId) {
        throw new Error("nodeId is required unless figmaUrl includes ?node-id=...");
      }
      const client = new FigmaClient({ token: getToken() });
      const limits = resolveInspectSelectionLimits({ depth, maxChildren });
      const node = await client.getNode(ref.fileId, ref.nodeId, Math.max(1, limits.depth));
      if (!node) throw new Error(`Node not found: ${ref.nodeId}`);
      const result = inspectSelection(node, {
        fileId: ref.fileId,
        nodeId: ref.nodeId,
        ...limits
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "get_components",
    {
      description: "List components for a Figma file by fileId or Figma /file or /design URL",
      inputSchema: getComponentsInputSchema
    },
    async ({ fileId, figmaUrl, q, limit }: { fileId?: string; figmaUrl?: string; q?: string; limit?: number }) => {
      const ref = resolveInput({ fileId, figmaUrl });
      const client = new FigmaClient({ token: getToken() });
      const raw = await client.getComponents(ref.fileId);
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
      description: "List frame nodes in a Figma file by fileId or Figma /file or /design URL",
      inputSchema: listFramesInputSchema
    },
    async ({ fileId, figmaUrl, depth }: { fileId?: string; figmaUrl?: string; depth?: number }) => {
      const ref = resolveInput({ fileId, figmaUrl });
      const client = new FigmaClient({ token: getToken() });
      const frames = await client.listFrames(ref.fileId, depth);
      return { content: [{ type: "text", text: JSON.stringify(frames) }] };
    }
  );

  server.registerTool(
    "export_tokens",
    {
      description: "Export design tokens from a Figma file by fileId or Figma /file or /design URL",
      inputSchema: exportTokensInputSchema
    },
    async ({ fileId, figmaUrl }: { fileId?: string; figmaUrl?: string }) => {
      const ref = resolveInput({ fileId, figmaUrl });
      const client = new FigmaClient({ token: getToken() });
      const file = await client.getFile(ref.fileId);
      const tokens = toDesignTokens(file);
      return { content: [{ type: "text", text: JSON.stringify(tokens, null, 2) }] };
    }
  );

  server.registerTool(
    "generate_code",
    {
      description: "Generate UI code from a file/node ID pair or a Figma URL with node-id",
      inputSchema: generateCodeInputSchema
    },
    async ({ fileId, figmaUrl, nodeId, framework, tokens, varPrefix }: { fileId?: string; figmaUrl?: string; nodeId?: string; framework: Framework; tokens?: unknown; varPrefix?: string }) => {
      const ref = resolveInput({ fileId, figmaUrl, nodeId });
      if (!ref.nodeId) {
        throw new Error("nodeId is required unless figmaUrl includes ?node-id=...");
      }
      const client = new FigmaClient({ token: getToken() });
      const node = await client.getNode(ref.fileId, ref.nodeId);
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
      const code = generateCode(node ?? { id: ref.nodeId, name: ref.nodeId, type: "GROUP" }, framework, opts);
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
