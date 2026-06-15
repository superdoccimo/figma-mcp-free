#!/usr/bin/env node
import { Command } from "commander";
import { getConfigPath, readConfig, writeConfig, getToken as getCfgToken } from "@figma-mcp-free/config";
import { FigmaClient, resolveFigmaReference } from "@figma-mcp-free/figma-client";
import { toDesignTokens } from "@figma-mcp-free/design-tokens";
import { generateCode, type Framework } from "@figma-mcp-free/code-generator";
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const program = new Command();

const maskToken = (token: string): string => (token.length <= 8 ? "****" : `${token.slice(0, 4)}...${token.slice(-4)}`);
const resolveInputPath = (path: string): string => {
  if (isAbsolute(path)) return path;
  return resolve(process.env.INIT_CWD || process.cwd(), path);
};

program
  .name("figma-mcp-free")
  .description("CLI for figma-mcp-free")
  .version("0.1.0");

program.command("init")
  .description("Initialize figma-mcp-free and store your Figma Personal Access Token")
  .option("--token <token>", "Provide the Figma token non-interactively")
  .action(async (opts: { token?: string }) => {
    const existing = readConfig().token;
    let token: string | undefined = opts.token?.trim();

    if (!token) {
      const envToken = process.env.FIGMA_TOKEN?.trim();
      if (envToken) token = envToken;
    }

    if (!token && input.isTTY && output.isTTY) {
      const rl = createInterface({ input, output, terminal: true });
      try {
        if (existing) {
          console.log(`Existing token detected (${maskToken(existing)}). Press enter to keep it or paste a new token.`);
        }
        const prompt = existing
          ? "Figma Personal Access Token (leave blank to keep current): "
          : "Figma Personal Access Token (starts with figd_): ";
        const answer = await rl.question(prompt);
        const trimmed = answer.trim();
        if (trimmed) token = trimmed;
        else if (existing) token = existing;
      } finally {
        rl.close();
      }
    }

    if (!token) {
      console.error("No token provided. Pass --token, set FIGMA_TOKEN, or run in an interactive terminal.");
      process.exit(1);
    }

    token = token.trim();
    if (!token) {
      console.error("Provided token was empty after trimming. Aborting.");
      process.exit(1);
    }

    writeConfig({ token });

    if (existing && existing === token) {
      console.log(`Token unchanged. Config remains at ${getConfigPath()}`);
    } else {
      console.log(`Saved token (${maskToken(token)}) to ${getConfigPath()}`);
    }

    if (!process.env.FIGMA_TOKEN) {
      console.log("Tip: export FIGMA_TOKEN=<token> to override per-session without touching the config file.");
    }
  });

program.command("generate")
  .description("Generate code from a Figma file/node ID pair or a Figma URL with node-id")
  .argument("<fileIdOrUrl>")
  .argument("[nodeId]")
  .option("--framework <name>", "react|vue|svelte|html", "react")
  .option("--use-tokens <path>", "use W3C tokens JSON to substitute colors with CSS variables")
  .option("--var-prefix <prefix>", "CSS var prefix (default --)")
  .action(async (fileIdOrUrl: string, nodeId: string | undefined, opts: { framework: Framework; useTokens?: string; varPrefix?: string }) => {
    const token = getCfgToken();
    if (!token) {
      console.error("Token not set. Run: figma-mcp-free init (or export FIGMA_TOKEN).");
      process.exit(1);
    }
    const ref = resolveFigmaReference(fileIdOrUrl, nodeId);
    if (!ref.nodeId) {
      console.error("Node ID missing. Pass <NODE_ID> or use a Figma /file or /design URL that includes ?node-id=...");
      process.exit(1);
    }
    const client = new FigmaClient({ token });
    const node = await client.getNode(ref.fileId, ref.nodeId);
    let colorVar: ((hex: string) => string | undefined) | undefined;
    let varOpts: any;
    if (opts.useTokens) {
      try {
        const txt = readFileSync(resolveInputPath(opts.useTokens), "utf8");
        const json = JSON.parse(txt);
        const { buildCssVarIndex, buildTypographyVarIndex, buildSizeSpacingVarIndex, buildShadowVarIndex, shadowKey, normalizeHex } = await import("@figma-mcp-free/design-tokens");
        const idx = buildCssVarIndex(json, { prefix: opts.varPrefix ?? "--" });
        const tdx = buildTypographyVarIndex(json, { prefix: opts.varPrefix ?? "--" });
        const sdx = buildSizeSpacingVarIndex(json, { prefix: opts.varPrefix ?? "--" });
        const shx = buildShadowVarIndex(json, { prefix: opts.varPrefix ?? "--" });
        colorVar = (hex: string) => idx.colorMap[hex.toLowerCase()];
        varOpts = {
          typography: {
            fontSize: (px: number) => tdx.fontSizeMap[Math.round(px)],
            lineHeight: (px: number) => tdx.lineHeightMap[Math.round(px)],
            letterSpacing: (px: number) => tdx.letterSpacingMap[Math.round(px)],
            fontFamily: (name: string) => tdx.fontFamilyMap[name],
            fontWeight: (w: number) => tdx.fontWeightMap[Math.round(w)],
          },
          dimension: (px: number) => sdx.sizePxMap[Math.round(px)],
          spacing: (px: number) => sdx.spacingPxMap[Math.round(px)],
          shadowVar: ({ inset, dx, dy, blur, spread, color }: any) => shx.map[shadowKey(!!inset, dx, dy, blur, spread, color ? normalizeHex(color) : undefined)]
        } as any;
      } catch (e) {
        console.error("Failed to load tokens:", e);
      }
    }
    const code = generateCode(
      node ?? { id: ref.nodeId, name: ref.nodeId, type: "GROUP" },
      opts.framework,
      { colorVar, ...(varOpts || {}) }
    );
    console.log(code);
  });

program.command("generate-from-json")
  .description("Generate code from a local node JSON (offline demo)")
  .argument("<nodeJsonPath>")
  .option("--framework <name>", "react|vue|svelte|html", "react")
  .option("--use-tokens <path>", "use W3C tokens JSON to substitute colors with CSS variables")
  .option("--var-prefix <prefix>", "CSS var prefix (default --)")
  .action(async (nodeJsonPath: string, opts: { framework: Framework; useTokens?: string; varPrefix?: string }) => {
    const raw = readFileSync(resolveInputPath(nodeJsonPath), "utf8");
    const node = JSON.parse(raw);
    let colorVar: ((hex: string) => string | undefined) | undefined;
    let varOpts: any;
    if (opts.useTokens) {
      try {
        const txt = readFileSync(resolveInputPath(opts.useTokens), "utf8");
        const json = JSON.parse(txt);
        const { buildCssVarIndex, buildTypographyVarIndex, buildSizeSpacingVarIndex, buildShadowVarIndex, shadowKey, normalizeHex } = await import("@figma-mcp-free/design-tokens");
        const idx = buildCssVarIndex(json, { prefix: opts.varPrefix ?? "--" });
        const tdx = buildTypographyVarIndex(json, { prefix: opts.varPrefix ?? "--" });
        const sdx = buildSizeSpacingVarIndex(json, { prefix: opts.varPrefix ?? "--" });
        const shx = buildShadowVarIndex(json, { prefix: opts.varPrefix ?? "--" });
        colorVar = (hex: string) => idx.colorMap[hex.toLowerCase()];
        varOpts = {
          typography: {
            fontSize: (px: number) => tdx.fontSizeMap[Math.round(px)],
            lineHeight: (px: number) => tdx.lineHeightMap[Math.round(px)],
            letterSpacing: (px: number) => tdx.letterSpacingMap[Math.round(px)],
            fontFamily: (name: string) => tdx.fontFamilyMap[name],
            fontWeight: (w: number) => tdx.fontWeightMap[Math.round(w)],
          },
          dimension: (px: number) => sdx.sizePxMap[Math.round(px)],
          spacing: (px: number) => sdx.spacingPxMap[Math.round(px)],
          shadowVar: ({ inset, dx, dy, blur, spread, color }: any) => shx.map[shadowKey(!!inset, dx, dy, blur, spread, color ? normalizeHex(color) : undefined)]
        } as any;
      } catch (e) {
        console.error("Failed to load tokens:", e);
      }
    }
    const code = generateCode(node, opts.framework, { colorVar, ...(varOpts || {}) });
    console.log(code);
  });

program.command("export-tokens")
  .description("Export design tokens from a file (W3C format minimal)")
  .argument("<fileIdOrUrl>")
  .action(async (fileIdOrUrl: string) => {
    const token = getCfgToken();
    if (!token) {
      console.error("Token not set. Run: figma-mcp-free init (or export FIGMA_TOKEN).");
      process.exit(1);
    }
    const ref = resolveFigmaReference(fileIdOrUrl);
    const client = new FigmaClient({ token });
    const file = await client.getFile(ref.fileId);
    const tokens = toDesignTokens(file);
    console.log(JSON.stringify(tokens, null, 2));
  });

program.command("components")
  .description("List components in a file")
  .argument("<fileIdOrUrl>")
  .option("-q, --query <query>", "filter by name contains")
  .option("-l, --limit <n>", "limit number of results", (v) => parseInt(v, 10))
  .option("--json", "output JSON")
  .action(async (fileIdOrUrl: string, opts: { query?: string; limit?: number; json?: boolean }) => {
    const token = getCfgToken();
    if (!token) {
      console.error("Token not set. Run: figma-mcp-free init (or export FIGMA_TOKEN).");
      process.exit(1);
    }
    const ref = resolveFigmaReference(fileIdOrUrl);
    const client = new FigmaClient({ token });
    const raw = await client.getComponents(ref.fileId);
    let items = raw.meta.components.map(c => ({ key: c.key, nodeId: c.node_id, name: c.name }));
    if (opts.query) {
      const q = opts.query.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    if (opts.limit) items = items.slice(0, opts.limit);
    if (opts.json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }
    // human-readable
    console.log("NAME\tKEY\tNODE_ID");
    for (const it of items) {
      console.log(`${it.name}\t${it.key}\t${it.nodeId}`);
    }
  });

const config = program.command("config").description("Manage local configuration");

config
  .command("set token")
  .argument("<token>", "Figma Personal Access Token")
  .description("Set and save the Figma token to local config")
  .action(async (token: string) => {
    writeConfig({ token });
    // eslint-disable-next-line no-console
    console.log(`Saved token to ${getConfigPath()}`);
  });

config
  .command("get token")
  .description("Show token status")
  .action(async () => {
    const cfg = readConfig();
    const t = cfg.token;
    if (!t) {
      // eslint-disable-next-line no-console
      console.log("Token: (not set)");
    } else {
      const masked = t.length <= 8 ? "****" : `${t.slice(0, 4)}...${t.slice(-4)}`;
      // eslint-disable-next-line no-console
      console.log(`Token: ${masked}`);
    }
    // eslint-disable-next-line no-console
    console.log(`Config path: ${getConfigPath()}`);
  });

config
  .command("path")
  .description("Print config file path")
  .action(() => {
    // eslint-disable-next-line no-console
    console.log(getConfigPath());
  });

program.parse();
