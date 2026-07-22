import { z } from "zod";

export const getFileInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional(),
  depth: z.number().int().positive().optional()
};

export const getComponentsInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional(),
  q: z.string().optional(),
  limit: z.number().int().positive().max(1000).optional()
};

export const listFramesInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional(),
  depth: z.number().int().positive().optional()
};

export const exportTokensInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional()
};

export const generateCodeInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional(),
  nodeId: z.string().optional(),
  framework: z.enum(["react", "vue", "svelte", "html"]),
  tokens: z.any().optional(),
  varPrefix: z.string().optional()
};

export const inspectSelectionInputSchema = {
  fileId: z.string().optional(),
  figmaUrl: z.string().optional(),
  nodeId: z.string().optional(),
  depth: z.number().int().min(0).max(5).optional(),
  maxChildren: z.number().int().min(0).max(100).optional()
};

export const publicToolSchemas = {
  get_file: getFileInputSchema,
  get_components: getComponentsInputSchema,
  list_frames: listFramesInputSchema,
  export_tokens: exportTokensInputSchema,
  generate_code: generateCodeInputSchema,
  inspect_selection: inspectSelectionInputSchema
} as const;
