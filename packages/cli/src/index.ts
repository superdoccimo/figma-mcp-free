#!/usr/bin/env node
import { Command } from "commander";
import { getConfigPath, readConfig, writeConfig, getToken as getCfgToken } from "@figma-mcp-free/config";
import { FigmaClient } from "@figma-mcp-free/figma-client";
import { toDesignTokens } from "@figma-mcp-free/design-tokens";
import { generateCode, type Framework } from "@figma-mcp-free/code-generator";

const program = new Command();
program
  .name("figma-mcp-free")
  .description("CLI for figma-mcp-free")
  .version("0.1.0");

program.command("init")
  .description("Initialize figma-mcp-free and prompt for token")
  .action(async () => {
    // eslint-disable-next-line no-console
    console.log("Init wizard TBD (store FIGMA_TOKEN)");
  });

program.command("generate")
  .description("Generate code from component")
  .argument("<fileId>")
  .argument("<nodeId>")
  .option("--framework <name>", "react|vue|svelte|html", "react")
  .option("--use-tokens <path>", "use W3C tokens JSON to substitute colors with CSS variables")
  .option("--var-prefix <prefix>", "CSS var prefix (default --)")
  .action(async (fileId: string, nodeId: string, opts: { framework: Framework; useTokens?: string; varPrefix?: string }) => {
    const token = getCfgToken();
    if (!token) {
      console.error("Token not set. Use: figma-mcp-free config set token <TOKEN>");
      process.exit(1);
    }
    const client = new FigmaClient({ token });
    const node = await client.getNode(fileId, nodeId);
    let colorVar: ((hex: string) => string | undefined) | undefined;
    let varOpts: any;
    if (opts.useTokens) {
      try {
        const fs = await import("node:fs");
        const txt = fs.readFileSync(opts.useTokens, "utf8");
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
      node ?? { id: nodeId, name: nodeId, type: "GROUP" },
      opts.framework,
      { colorVar, ...(varOpts || {}) }
    );
    console.log(code);
  });

program.command("export-tokens")
  .description("Export design tokens from a file (W3C format minimal)")
  .argument("<fileId>")
  .action(async (fileId: string) => {
    const token = getCfgToken();
    if (!token) {
      console.error("Token not set. Use: figma-mcp-free config set token <TOKEN>");
      process.exit(1);
    }
    const client = new FigmaClient({ token });
    const file = await client.getFile(fileId);
    const tokens = toDesignTokens(file);
    console.log(JSON.stringify(tokens, null, 2));
  });

program.command("components")
  .description("List components in a file")
  .argument("<fileId>")
  .option("-q, --query <query>", "filter by name contains")
  .option("-l, --limit <n>", "limit number of results", (v) => parseInt(v, 10))
  .option("--json", "output JSON")
  .action(async (fileId: string, opts: { query?: string; limit?: number; json?: boolean }) => {
    const token = getCfgToken();
    if (!token) {
      console.error("Token not set. Use: figma-mcp-free config set token <TOKEN>");
      process.exit(1);
    }
    const client = new FigmaClient({ token });
    const raw = await client.getComponents(fileId);
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
