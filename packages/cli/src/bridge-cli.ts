#!/usr/bin/env node
import { Command, InvalidArgumentError, Option } from "commander";
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  inspectSelection,
  resolveInspectSelectionLimits,
  type FigmaNode
} from "@figma-mcp-free/figma-client";
import {
  PluginBridgeClient,
  PluginBridgeError,
  startPluginBridgeServer,
  type PluginBridgeSnapshot
} from "@figma-mcp-free/figma-client/plugin-bridge";
import {
  buildCssVarIndex,
  buildShadowVarIndex,
  buildSizeSpacingVarIndex,
  buildTypographyVarIndex,
  normalizeHex,
  shadowKey
} from "@figma-mcp-free/design-tokens";
import { generateCode, type Framework, type GenerateOptions } from "@figma-mcp-free/code-generator";

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

function resolveInputPath(path: string): string {
  return isAbsolute(path) ? path : resolve(process.env.INIT_CWD || process.cwd(), path);
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
  return buildGenerateOptions(JSON.parse(readFileSync(resolveInputPath(path), "utf8")), varPrefix);
}

type ConnectionOptions = { url?: string; token?: string; timeout?: number };

function bridgeClient(options: ConnectionOptions): PluginBridgeClient {
  const token = options.token?.trim() || process.env.FIGMA_PLUGIN_BRIDGE_TOKEN?.trim();
  if (!token) throw new Error("Set FIGMA_PLUGIN_BRIDGE_TOKEN or pass --token.");
  return new PluginBridgeClient({
    baseUrl: options.url || process.env.FIGMA_PLUGIN_BRIDGE_URL,
    token,
    timeoutMs: options.timeout
  });
}

function selected(snapshot: PluginBridgeSnapshot, index: number): { node: FigmaNode; id: string } {
  const entry = snapshot.selections[index];
  if (!entry) throw new Error(`Selection index ${index} is outside the captured range 0-${Math.max(0, snapshot.selections.length - 1)}.`);
  return { node: entry.document, id: entry.id };
}

function addConnectionOptions(command: Command): Command {
  return command
    .option("--url <url>", "bridge URL (default FIGMA_PLUGIN_BRIDGE_URL or http://127.0.0.1:3845)")
    .option("--token <token>", "pairing token (prefer FIGMA_PLUGIN_BRIDGE_TOKEN to avoid shell history)")
    .option("--timeout <ms>", "request timeout", parsePositiveInteger);
}

const program = new Command()
  .name("figma-mcp-free-bridge")
  .description("Authenticated, loopback-only read bridge for the current Figma selection")
  .version("0.1.0");

program.command("serve")
  .description("Start the local in-memory bridge server")
  .addOption(new Option("--host <host>", "loopback bind host").choices(["127.0.0.1", "localhost", "::1"]).default("127.0.0.1"))
  .option("--port <port>", "listen port", parseInteger, 3845)
  .option("--token <token>", "pairing token (prefer FIGMA_PLUGIN_BRIDGE_TOKEN; random when omitted)")
  .option("--max-body-mb <n>", "maximum snapshot body size in MiB", parsePositiveInteger, 10)
  .option("--max-selections <n>", "maximum captured selections", parsePositiveInteger, 50)
  .option("--json", "print startup information as JSON")
  .action(async (options: {
    host: "127.0.0.1" | "localhost" | "::1";
    port: number;
    token?: string;
    maxBodyMb: number;
    maxSelections: number;
    json?: boolean;
  }) => {
    const handle = await startPluginBridgeServer({
      host: options.host,
      port: options.port,
      token: options.token || process.env.FIGMA_PLUGIN_BRIDGE_TOKEN,
      maxBodyBytes: options.maxBodyMb * 1024 * 1024,
      maxSelections: options.maxSelections
    });
    const startup = {
      url: handle.url,
      token: handle.token,
      readOnly: true,
      memoryOnly: true,
      maxSelections: options.maxSelections
    };
    if (options.json) console.log(JSON.stringify(startup, null, 2));
    else {
      console.log(`Local Figma bridge: ${handle.url}`);
      console.log(`Pairing token (sensitive): ${handle.token}`);
      console.log("The bridge is loopback-only, memory-only, and read-only.");
      console.log("Keep this terminal open, then paste the URL and token into the development plugin.");
    }

    let closing = false;
    const close = async () => {
      if (closing) return;
      closing = true;
      await handle.close();
      process.exitCode = 0;
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  });

addConnectionOptions(program.command("status").description("Check bridge health"))
  .action(async (options: ConnectionOptions) => console.log(JSON.stringify(await bridgeClient(options).health(), null, 2)));

addConnectionOptions(program.command("current").description("Print the current captured selection snapshot"))
  .action(async (options: ConnectionOptions) => console.log(JSON.stringify(await bridgeClient(options).getSnapshot(), null, 2)));

addConnectionOptions(program.command("clear").description("Clear the in-memory snapshot"))
  .action(async (options: ConnectionOptions) => console.log(JSON.stringify(await bridgeClient(options).clearSnapshot(), null, 2)));

addConnectionOptions(program.command("inspect").description("Transform one captured selection into compact implementation context"))
  .option("--index <n>", "captured selection index", parseInteger, 0)
  .option("--depth <n>", "child depth to include (0-5)", parseInteger)
  .option("--max-children <n>", "maximum children per node (0-100)", parseInteger)
  .action(async (options: ConnectionOptions & { index: number; depth?: number; maxChildren?: number }) => {
    if (options.depth !== undefined && options.depth > 5) throw new InvalidArgumentError("depth must be between 0 and 5.");
    if (options.maxChildren !== undefined && options.maxChildren > 100) throw new InvalidArgumentError("max-children must be between 0 and 100.");
    const snapshot = await bridgeClient(options).getSnapshot();
    const entry = selected(snapshot, options.index);
    const limits = resolveInspectSelectionLimits(options);
    console.log(JSON.stringify(inspectSelection(entry.node, {
      fileId: `plugin:${snapshot.fileName ?? "current"}`,
      nodeId: entry.id,
      ...limits
    }), null, 2));
  });

addConnectionOptions(program.command("generate").description("Generate starter code from one captured selection"))
  .option("--index <n>", "captured selection index", parseInteger, 0)
  .option("--framework <name>", "react|vue|svelte|html", parseFramework, "react")
  .option("--use-tokens <path>", "substitute values from W3C tokens JSON")
  .option("--var-prefix <prefix>", "CSS variable prefix (default --)")
  .action(async (options: ConnectionOptions & {
    index: number;
    framework: Framework;
    useTokens?: string;
    varPrefix?: string;
  }) => {
    const snapshot = await bridgeClient(options).getSnapshot();
    const entry = selected(snapshot, options.index);
    console.log(generateCode(entry.node, options.framework, readGenerateOptions(options.useTokens, options.varPrefix)));
  });

program.parseAsync().catch((error: unknown) => {
  if (error instanceof PluginBridgeError) console.error(`${error.message}${error.status ? ` (${error.status})` : ""}`);
  else console.error(error instanceof Error ? error.message : "Bridge command failed.");
  process.exitCode = 1;
});
