import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  FigmaClient,
  inspectSelection,
  resolveFigmaReference,
  resolveInspectSelectionLimits,
  type FigmaRequestOptions
} from "@figma-mcp-free/figma-client";
import {
  toDesignTokens,
  buildCssVarIndex,
  buildTypographyVarIndex,
  buildSizeSpacingVarIndex,
  buildShadowVarIndex,
  shadowKey,
  normalizeHex
} from "@figma-mcp-free/design-tokens";
import { generateCode, type Framework, type GenerateOptions } from "@figma-mcp-free/code-generator";
import { getToken as getConfigToken } from "@figma-mcp-free/config";
import {
  cacheStatsInputSchema,
  clearCacheInputSchema,
  exportTokensInputSchema,
  generateCodeInputSchema,
  getComponentsInputSchema,
  getFileInputSchema,
  getNodesInputSchema,
  inspectSelectionInputSchema,
  listFramesInputSchema
} from "./tool-schemas.js";

function getToken(): string {
  const token = process.env.FIGMA_TOKEN?.trim() || getConfigToken();
  if (!token) throw new Error("FIGMA_TOKEN is not set");
  return token;
}

function envInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

let sharedClient: FigmaClient | undefined;
let sharedToken: string | undefined;

function getClient(): FigmaClient {
  const token = getToken();
  if (!sharedClient || sharedToken !== token) {
    sharedToken = token;
    sharedClient = new FigmaClient({
      token,
      cacheTtlMs: envInteger("FIGMA_MCP_CACHE_TTL_MS", 5 * 60 * 1000),
      maxCacheEntries: envInteger("FIGMA_MCP_MAX_CACHE_ENTRIES", 128),
      requestTimeoutMs: envInteger("FIGMA_MCP_REQUEST_TIMEOUT_MS", 20000),
      maxRetries: envInteger("FIGMA_MCP_MAX_RETRIES", 2),
      nodeBatchSize: envInteger("FIGMA_MCP_NODE_BATCH_SIZE", 100)
    });
  }
  return sharedClient;
}

function requestOptions(refresh?: boolean): FigmaRequestOptions {
  return refresh ? { cache: "reload" } : {};
}

type FigmaInput = { fileId?: string; figmaUrl?: string; nodeId?: string };

function resolveInput(input: FigmaInput) {
  const fileIdOrUrl = input.figmaUrl ?? input.fileId;
  if (!fileIdOrUrl) throw new Error("Provide fileId or figmaUrl.");
  return resolveFigmaReference(fileIdOrUrl, input.nodeId);
}

function jsonContent(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function buildGenerateOptions(tokens: unknown, varPrefix?: string): GenerateOptions | undefined {
  if (!tokens || typeof tokens !== "object") return undefined;
  const prefix = varPrefix ?? "--";
  const colorIdx = buildCssVarIndex(tokens as any, { prefix });
  const typoIdx = buildTypographyVarIndex(tokens as any, { prefix });
  const sizeIdx = buildSizeSpacingVarIndex(tokens as any, { prefix });
  const shadowIdx = buildShadowVarIndex(tokens as any, { prefix });
  return {
    colorVar: (hex: string) => colorIdx.colorMap[hex.toLowerCase()],
    typography: {
      fontSize: (px: number) => typoIdx.fontSizeMap[Math.round(px)],
      lineHeight: (px: number) => typoIdx.lineHeightMap[Math.round(px)],
      letterSpacing: (px: number) => typoIdx.letterSpacingMap[Math.round(px)],
      fontFamily: (name: string) => typoIdx.fontFamilyMap[name],
      fontWeight: (weight: number) => typoIdx.fontWeightMap[Math.round(weight)]
    },
    dimension: (px: number) => sizeIdx.sizePxMap[Math.round(px)],
    spacing: (px: number) => sizeIdx.spacingPxMap[Math.round(px)],
    shadowVar: ({ inset, dx, dy, blur, spread, color }) => shadowIdx.map[
      shadowKey(Boolean(inset), dx, dy, blur, spread, color ? normalizeHex(color) : undefined)
    ]
  };
}

async function main() {
  const server = new McpServer({ name: "figma-mcp-free", version: "0.1.0" });

  server.registerTool(
    "get_file",
    {
      description: "Get a Figma file by fileId or Figma /file or /design URL. Prefer a narrow depth for large files.",
      inputSchema: getFileInputSchema
    },
    async ({ fileId, figmaUrl, depth, refresh }) => {
      const ref = resolveInput({ fileId, figmaUrl });
      const file = await getClient().getFile(ref.fileId, depth, requestOptions(refresh));
      return jsonContent(file);
    }
  );

  server.registerTool(
    "get_nodes",
    {
      description: "Batch-fetch multiple Figma nodes in as few REST requests as possible.",
      inputSchema: getNodesInputSchema
    },
    async ({ fileId, figmaUrl, nodeIds, depth, refresh }) => {
      const ref = resolveInput({ fileId, figmaUrl });
      const nodes = await getClient().getNodes(ref.fileId, nodeIds, depth, requestOptions(refresh));
      const missing = Object.entries(nodes).filter(([, node]) => !node).map(([id]) => id);
      return jsonContent({ nodes, missing, stats: getClient().getStats() });
    }
  );

  server.registerTool(
    "inspect_selection",
    {
      description: "Organize selected-layer REST data into compact implementation context. This is not the official get_design_context tool.",
      inputSchema: inspectSelectionInputSchema
    },
    async ({ fileId, figmaUrl, nodeId, depth, maxChildren, refresh }) => {
      const ref = resolveInput({ fileId, figmaUrl, nodeId });
      if (!ref.nodeId) throw new Error("nodeId is required unless figmaUrl includes ?node-id=...");
      const limits = resolveInspectSelectionLimits({ depth, maxChildren });
      const node = await getClient().getNode(
        ref.fileId,
        ref.nodeId,
        Math.max(1, limits.depth),
        requestOptions(refresh)
      );
      if (!node) throw new Error(`Node not found: ${ref.nodeId}`);
      return jsonContent(inspectSelection(node, { fileId: ref.fileId, nodeId: ref.nodeId, ...limits }));
    }
  );

  server.registerTool(
    "get_components",
    {
      description: "List component metadata for a Figma file.",
      inputSchema: getComponentsInputSchema
    },
    async ({ fileId, figmaUrl, q, limit, refresh }) => {
      const ref = resolveInput({ fileId, figmaUrl });
      const raw = await getClient().getComponents(ref.fileId, requestOptions(refresh));
      let items = raw.meta.components.map((component) => ({
        key: component.key,
        nodeId: component.node_id,
        name: component.name,
        description: component.description
      }));
      if (q) {
        const query = q.toLowerCase();
        items = items.filter((item) => item.name.toLowerCase().includes(query));
      }
      if (limit) items = items.slice(0, limit);
      return jsonContent(items);
    }
  );

  server.registerTool(
    "list_frames",
    {
      description: "List frame nodes in a Figma file. Prefer a narrow depth for large files.",
      inputSchema: listFramesInputSchema
    },
    async ({ fileId, figmaUrl, depth, refresh }) => {
      const ref = resolveInput({ fileId, figmaUrl });
      const frames = await getClient().listFrames(ref.fileId, depth, requestOptions(refresh));
      return jsonContent(frames);
    }
  );

  server.registerTool(
    "export_tokens",
    {
      description: "Export W3C-style design tokens from a Figma file.",
      inputSchema: exportTokensInputSchema
    },
    async ({ fileId, figmaUrl, refresh }) => {
      const ref = resolveInput({ fileId, figmaUrl });
      const file = await getClient().getFile(ref.fileId, undefined, requestOptions(refresh));
      return jsonContent(toDesignTokens(file));
    }
  );

  server.registerTool(
    "generate_code",
    {
      description: "Generate starter UI code from a file/node pair or Figma URL with node-id.",
      inputSchema: generateCodeInputSchema
    },
    async ({ fileId, figmaUrl, nodeId, framework, tokens, varPrefix, refresh }) => {
      const ref = resolveInput({ fileId, figmaUrl, nodeId });
      if (!ref.nodeId) throw new Error("nodeId is required unless figmaUrl includes ?node-id=...");
      const node = await getClient().getNode(ref.fileId, ref.nodeId, undefined, requestOptions(refresh));
      if (!node) throw new Error(`Node not found: ${ref.nodeId}`);
      const options = buildGenerateOptions(tokens, varPrefix);
      const code = generateCode(node, framework as Framework, options);
      return { content: [{ type: "text" as const, text: code }] };
    }
  );

  server.registerTool(
    "get_cache_stats",
    { description: "Show in-memory REST request cache and retry statistics.", inputSchema: cacheStatsInputSchema },
    async () => jsonContent(getClient().getStats())
  );

  server.registerTool(
    "clear_cache",
    { description: "Clear the in-memory REST response cache without changing credentials.", inputSchema: clearCacheInputSchema },
    async () => {
      getClient().clearCache();
      return jsonContent({ cleared: true, stats: getClient().getStats() });
    }
  );

  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
