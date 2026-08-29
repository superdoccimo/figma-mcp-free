import { z } from "zod";

const refresh = z.boolean().optional();
const selectionIndex = z.number().int().min(0).max(49).optional();

export const getFileInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional(),
  depth: z.number().int().nonnegative().optional(),
  refresh
};

export const getNodesInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional(),
  nodeIds: z.array(z.string().min(1)).min(1).max(500),
  depth: z.number().int().nonnegative().optional(),
  refresh
};

export const getComponentsInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional(),
  q: z.string().optional(),
  limit: z.number().int().positive().max(1000).optional(),
  refresh
};

export const listFramesInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional(),
  depth: z.number().int().nonnegative().optional(),
  refresh
};

export const exportTokensInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional(),
  refresh
};

export const generateCodeInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional(),
  nodeId: z.string().optional(),
  framework: z.enum(["react", "vue", "svelte", "html"]),
  tokens: z.any().optional(),
  varPrefix: z.string().optional(),
  refresh
};

export const inspectSelectionInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional(),
  nodeId: z.string().optional(),
  depth: z.number().int().min(0).max(5).optional(),
  maxChildren: z.number().int().min(0).max(100).optional(),
  refresh
};

export const pluginBridgeStatusInputSchema = {};

export const currentSelectionInputSchema = {
  index: selectionIndex
};

export const inspectCurrentSelectionInputSchema = {
  index: selectionIndex,
  depth: z.number().int().min(0).max(5).optional(),
  maxChildren: z.number().int().min(0).max(100).optional()
};

export const generateCurrentSelectionInputSchema = {
  index: selectionIndex,
  framework: z.enum(["react", "vue", "svelte", "html"]),
  tokens: z.any().optional(),
  varPrefix: z.string().optional()
};

export const cacheStatsInputSchema = {};
export const clearCacheInputSchema = {};

export const publicToolSchemas = {
  get_file: getFileInputSchema,
  get_nodes: getNodesInputSchema,
  get_components: getComponentsInputSchema,
  list_frames: listFramesInputSchema,
  export_tokens: exportTokensInputSchema,
  generate_code: generateCodeInputSchema,
  inspect_selection: inspectSelectionInputSchema,
  get_plugin_bridge_status: pluginBridgeStatusInputSchema,
  get_current_selection: currentSelectionInputSchema,
  inspect_current_selection: inspectCurrentSelectionInputSchema,
  generate_current_selection: generateCurrentSelectionInputSchema,
  get_cache_stats: cacheStatsInputSchema,
  clear_cache: clearCacheInputSchema
} as const;
