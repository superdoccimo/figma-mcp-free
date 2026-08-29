#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";
import {
  getConfigPath,
  getConfigSecurityStatus,
  readConfig,
  writeConfig,
  getToken as getCfgToken
} from "@figma-mcp-free/config";
import {
  FigmaApiError,
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
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { printDoctorReport, runDoctor } from "./doctor.js";

const program = new Command();

function resolveInputPath(path: string): string {
  return isAbsolute(path) ? path : resolve(process.env.INIT_CWD || process.cwd(), path);
}

function parseInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new InvalidArgumentError("Expected a non-negative integer.");
  return parsed;
}

function parsePositiveInteger(value: string): number {
  const parsed = parseInteger(value);
  if (parsed < 1) throw new InvalidArgumentError("Expected a positive integer.");
  return parsed;
}

function parseFramework(value: string): Framework {
  if (["react", "vue", "svelte", "html"].includes(value)) return value as Framework;
  throw new InvalidArgumentError("Framework must be react, vue, svelte, or html.");
}

function envInteger(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function requireToken(): string {
  const token = getCfgToken();
  if (!token) throw new Error("Token not set. Run: figma-mcp-free init (or export FIGMA_TOKEN).");
  return token;
}

let sharedClient: FigmaClient | undefined;
let sharedToken: string | undefined;

function getClient(): FigmaClient {
  const token = requireToken();
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

function safeFilename(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "figma-node";
}

function extensionFor(framework: Framework): string {
  if (framework === "react") return "tsx";
  if (framework === "vue") return "vue";
  if (framework === "svelte") return "svelte";
  return "html";
}

function buildGenerateOptions(tokens: unknown, varPrefix?: string): GenerateOptions | undefined {
  if (!tokens || typeof tokens !== "object") return undefined;
  const prefix = varPrefix ?? "--";
  const colors = buildCssVarIndex(tokens as any, { prefix });
  const typography = buildTypographyVarIndex(tokens as any, { prefix });
  const sizes = buildSizeSpacingVarIndex(tokens as any, { prefix });
  const shadows = buildShadowVarIndex(tokens as any, { prefix });
  return {
    colorVar: (hex: string) => colors.colorMap[hex.toLowerCase()],
    typography: {
      fontSize: (px: number) => typography.fontSizeMap[Math.round(px)],
      lineHeight: (px: number) => typography.lineHeightMap[Math.round(px)],
      letterSpacing: (px: number) => typography.letterSpacingMap[Math.round(px)],
      fontFamily: (name: string) => typography.fontFamilyMap[name],
      fontWeight: (weight: number) => typography.fontWeightMap[Math.round(weight)]
    },
    dimension: (px: number) => sizes.sizePxMap[Math.round(px)],
    spacing: (px: number) => sizes.spacingPxMap[Math.round(px)],
    shadowVar: ({ inset, dx, dy, blur, spread, color }) => shadows.map[
      shadowKey(Boolean(inset), dx, dy, blur, spread, color ? normalizeHex(color) : undefined)
    ]
  };
}

function readGenerateOptions(path?: string, varPrefix?: string): GenerateOptions | undefined {
  if (!path) return undefined;
  const raw = readFileSync(resolveInputPath(path), "utf8");
  return buildGenerateOptions(JSON.parse(raw), varPrefix);
}

program
  .name("figma-mcp-free")
  .description("Quota-aware, read-only Figma REST API CLI and MCP toolkit")
  .version("0.1.0");

program.command("init")
  .description("Store a Figma Personal Access Token in the local protected config")
  .option("--token <token>", "provide the token non-interactively (shell history may retain it)")
  .action(async (opts: { token?: string }) => {
    const existing = readConfig().token;
    let token = opts.token?.trim() || process.env.FIGMA_TOKEN?.trim();

    if (!token && input.isTTY && output.isTTY) {
      const rl = createInterface({ input, output, terminal: true });
      try {
        if (existing) console.log("Existing token detected. Press enter to keep it or paste a new token.");
        const answer = await rl.question(existing
          ? "Figma Personal Access Token (leave blank to keep current): "
          : "Figma Personal Access Token (starts with figd_): ");
        token = answer.trim() || existing;
      } finally {
        rl.close();
      }
    }

    if (!token?.trim()) throw new Error("No token provided. Pass --token, set FIGMA_TOKEN, or run in an interactive terminal.");
    token = token.trim();
    writeConfig({ token });
    console.log(existing === token
      ? `Token unchanged. Config remains at ${getConfigPath()}`
      : `Saved token to ${getConfigPath()}`);
    console.log(getConfigSecurityStatus().message);
    if (!process.env.FIGMA_TOKEN) console.log("Tip: set FIGMA_TOKEN to override the stored token for one session.");
  });

program.command("file")
  .description("Fetch a Figma file, optionally at a narrow depth")
  .argument("<fileIdOrUrl>")
  .option("--depth <n>", "response depth", parseInteger)
  .option("--refresh", "bypass the in-process cache")
  .action(async (fileIdOrUrl: string, opts: { depth?: number; refresh?: boolean }) => {
    const ref = resolveFigmaReference(fileIdOrUrl);
    const file = await getClient().getFile(ref.fileId, opts.depth, requestOptions(opts.refresh));
    console.log(JSON.stringify(file, null, 2));
  });

program.command("nodes")
  .description("Batch-fetch multiple nodes in as few Figma REST calls as possible")
  .argument("<fileIdOrUrl>")
  .argument("<nodeIds...>")
  .option("--depth <n>", "response depth", parseInteger)
  .option("--refresh", "bypass the in-process cache")
  .action(async (fileIdOrUrl: string, nodeIds: string[], opts: { depth?: number; refresh?: boolean }) => {
    const ref = resolveFigmaReference(fileIdOrUrl);
    const nodes = await getClient().getNodes(ref.fileId, nodeIds, opts.depth, requestOptions(opts.refresh));
    const missing = Object.entries(nodes).filter(([, node]) => !node).map(([id]) => id);
    console.log(JSON.stringify({ nodes, missing, stats: getClient().getStats() }, null, 2));
  });

program.command("frames")
  .description("List frames in a Figma file")
  .argument("<fileIdOrUrl>")
  .option("--depth <n>", "response depth", parseInteger)
  .option("--refresh", "bypass the in-process cache")
  .action(async (fileIdOrUrl: string, opts: { depth?: number; refresh?: boolean }) => {
    const ref = resolveFigmaReference(fileIdOrUrl);
    const frames = await getClient().listFrames(ref.fileId, opts.depth, requestOptions(opts.refresh));
    console.log(JSON.stringify(frames, null, 2));
  });

program.command("generate")
  .description("Generate starter code from a Figma node")
  .argument("<fileIdOrUrl>")
  .argument("[nodeId]")
  .option("--framework <name>", "react|vue|svelte|html", parseFramework, "react")
  .option("--use-tokens <path>", "substitute values from W3C tokens JSON")
  .option("--var-prefix <prefix>", "CSS variable prefix (default --)")
  .option("--refresh", "bypass the in-process cache")
  .action(async (
    fileIdOrUrl: string,
    nodeId: string | undefined,
    opts: { framework: Framework; useTokens?: string; varPrefix?: string; refresh?: boolean }
  ) => {
    const ref = resolveFigmaReference(fileIdOrUrl, nodeId);
    if (!ref.nodeId) throw new Error("Node ID missing. Pass one explicitly or use a Figma URL with ?node-id=...");
    const node = await getClient().getNode(ref.fileId, ref.nodeId, undefined, requestOptions(opts.refresh));
    if (!node) throw new Error(`Node not found: ${ref.nodeId}`);
    console.log(generateCode(node, opts.framework, readGenerateOptions(opts.useTokens, opts.varPrefix)));
  });

program.command("generate-many")
  .description("Batch-fetch nodes once and generate one file per node")
  .argument("<fileIdOrUrl>")
  .argument("<nodeIds...>")
  .requiredOption("--out-dir <path>", "output directory")
  .option("--framework <name>", "react|vue|svelte|html", parseFramework, "react")
  .option("--depth <n>", "node response depth", parseInteger)
  .option("--use-tokens <path>", "substitute values from W3C tokens JSON")
  .option("--var-prefix <prefix>", "CSS variable prefix (default --)")
  .option("--refresh", "bypass the in-process cache")
  .action(async (
    fileIdOrUrl: string,
    nodeIds: string[],
    opts: {
      outDir: string;
      framework: Framework;
      depth?: number;
      useTokens?: string;
      varPrefix?: string;
      refresh?: boolean;
    }
  ) => {
    const ref = resolveFigmaReference(fileIdOrUrl);
    const nodes = await getClient().getNodes(ref.fileId, nodeIds, opts.depth, requestOptions(opts.refresh));
    const outDir = resolveInputPath(opts.outDir);
    mkdirSync(outDir, { recursive: true });
    const generateOptions = readGenerateOptions(opts.useTokens, opts.varPrefix);
    const extension = extensionFor(opts.framework);
    const manifest: Array<{ nodeId: string; file?: string; missing?: true }> = [];

    for (const [nodeId, node] of Object.entries(nodes)) {
      if (!node) {
        manifest.push({ nodeId, missing: true });
        continue;
      }
      const filename = `${safeFilename(node.name)}-${safeFilename(nodeId)}.${extension}`;
      const path = join(outDir, filename);
      writeFileSync(path, `${generateCode(node, opts.framework, generateOptions)}\n`, "utf8");
      manifest.push({ nodeId, file: basename(path) });
    }
    writeFileSync(join(outDir, "figma-mcp-free-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ outDir, files: manifest, stats: getClient().getStats() }, null, 2));
  });

program.command("generate-from-json")
  .description("Generate code from local node JSON without calling Figma")
  .argument("<nodeJsonPath>")
  .option("--framework <name>", "react|vue|svelte|html", parseFramework, "react")
  .option("--use-tokens <path>", "substitute values from W3C tokens JSON")
  .option("--var-prefix <prefix>", "CSS variable prefix (default --)")
  .action(async (nodeJsonPath: string, opts: { framework: Framework; useTokens?: string; varPrefix?: string }) => {
    const node = JSON.parse(readFileSync(resolveInputPath(nodeJsonPath), "utf8"));
    console.log(generateCode(node, opts.framework, readGenerateOptions(opts.useTokens, opts.varPrefix)));
  });

program.command("export-tokens")
  .description("Export design tokens in W3C-style JSON")
  .argument("<fileIdOrUrl>")
  .option("--refresh", "bypass the in-process cache")
  .action(async (fileIdOrUrl: string, opts: { refresh?: boolean }) => {
    const ref = resolveFigmaReference(fileIdOrUrl);
    const file = await getClient().getFile(ref.fileId, undefined, requestOptions(opts.refresh));
    console.log(JSON.stringify(toDesignTokens(file), null, 2));
  });

program.command("inspect-selection")
  .description("Build compact, implementation-oriented context for one selected layer")
  .argument("<fileIdOrUrl>")
  .argument("[nodeId]")
  .option("--depth <n>", "child depth to include (0-5)", parseInteger)
  .option("--max-children <n>", "maximum children per node (0-100)", parseInteger)
  .option("--refresh", "bypass the in-process cache")
  .action(async (
    fileIdOrUrl: string,
    nodeId: string | undefined,
    opts: { depth?: number; maxChildren?: number; refresh?: boolean }
  ) => {
    if (opts.depth !== undefined && opts.depth > 5) throw new InvalidArgumentError("depth must be between 0 and 5.");
    if (opts.maxChildren !== undefined && opts.maxChildren > 100) throw new InvalidArgumentError("max-children must be between 0 and 100.");
    const ref = resolveFigmaReference(fileIdOrUrl, nodeId);
    if (!ref.nodeId) throw new Error("Node ID missing. Pass one explicitly or use a Figma URL with ?node-id=...");
    const limits = resolveInspectSelectionLimits(opts);
    const node = await getClient().getNode(ref.fileId, ref.nodeId, Math.max(1, limits.depth), requestOptions(opts.refresh));
    if (!node) throw new Error(`Node not found: ${ref.nodeId}`);
    console.log(JSON.stringify(inspectSelection(node, { fileId: ref.fileId, nodeId: ref.nodeId, ...limits }), null, 2));
  });

program.command("components")
  .description("List components in a Figma file")
  .argument("<fileIdOrUrl>")
  .option("-q, --query <query>", "filter by name")
  .option("-l, --limit <n>", "limit results", parsePositiveInteger)
  .option("--json", "output JSON")
  .option("--refresh", "bypass the in-process cache")
  .action(async (
    fileIdOrUrl: string,
    opts: { query?: string; limit?: number; json?: boolean; refresh?: boolean }
  ) => {
    const ref = resolveFigmaReference(fileIdOrUrl);
    const raw = await getClient().getComponents(ref.fileId, requestOptions(opts.refresh));
    let items = raw.meta.components.map((component) => ({
      key: component.key,
      nodeId: component.node_id,
      name: component.name,
      description: component.description
    }));
    if (opts.query) {
      const query = opts.query.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(query));
    }
    if (opts.limit) items = items.slice(0, opts.limit);
    if (opts.json) console.log(JSON.stringify(items, null, 2));
    else {
      console.log("NAME\tKEY\tNODE_ID");
      for (const item of items) console.log(`${item.name}\t${item.key}\t${item.nodeId}`);
    }
  });

program.command("doctor")
  .description("Check runtime, token protection, URL parsing, and optional Figma access")
  .argument("[figmaUrl]")
  .option("--file-id <fileId>", "Figma file ID to validate")
  .option("--node-id <nodeId>", "Figma node ID to validate")
  .option("--json", "output JSON")
  .action(async (figmaUrl: string | undefined, opts: { fileId?: string; nodeId?: string; json?: boolean }) => {
    const report = await runDoctor({ figmaUrl, fileId: opts.fileId, nodeId: opts.nodeId });
    if (opts.json) console.log(JSON.stringify(report, null, 2));
    else printDoctorReport(report);
    if (report.status === "error") process.exitCode = 1;
  });

const config = program.command("config").description("Manage local configuration");

config.command("set")
  .argument("<key>", "currently only: token")
  .argument("<value>")
  .description("Set a local config value")
  .action((key: string, value: string) => {
    if (key !== "token") throw new Error("Only the token key is supported.");
    if (!value.trim()) throw new Error("Token must not be empty.");
    writeConfig({ token: value.trim() });
    console.log(`Saved token to ${getConfigPath()}`);
    console.log(getConfigSecurityStatus().message);
  });

config.command("get")
  .argument("<key>", "currently only: token")
  .description("Show config status without revealing secrets")
  .action((key: string) => {
    if (key !== "token") throw new Error("Only the token key is supported.");
    console.log(readConfig().token ? "Token: (set)" : "Token: (not set)");
    console.log(`Config path: ${getConfigPath()}`);
  });

config.command("path")
  .description("Print the config file path")
  .action(() => console.log(getConfigPath()));

config.command("security")
  .description("Inspect local config file permissions without reading the token")
  .option("--json", "output JSON")
  .action((opts: { json?: boolean }) => {
    const status = getConfigSecurityStatus();
    if (opts.json) console.log(JSON.stringify(status, null, 2));
    else console.log(status.message);
    if (status.secure === false) process.exitCode = 1;
  });

program.parseAsync().catch((error: unknown) => {
  if (error instanceof FigmaApiError && error.upgradeUrl) {
    console.error(`${error.message}\nFigma plan or seat information: ${error.upgradeUrl}`);
  } else {
    console.error(error instanceof Error ? error.message : "Command failed.");
  }
  process.exitCode = 1;
});
