#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pluginId = process.argv[2]?.trim();
if (!pluginId || !/^\d+$/.test(pluginId)) {
  console.error("Usage: node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID>");
  process.exit(1);
}

const directory = dirname(fileURLToPath(import.meta.url));
const templatePath = join(directory, "manifest.template.json");
const outputPath = join(directory, "manifest.json");
const template = JSON.parse(readFileSync(templatePath, "utf8"));
template.id = pluginId;
writeFileSync(outputPath, `${JSON.stringify(template, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(`Created ${outputPath}. Import this manifest in Figma Desktop as a development plugin.`);
