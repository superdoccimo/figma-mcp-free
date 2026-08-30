#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pluginId = process.argv[2]?.trim();
const portText = process.argv[3]?.trim() || "3845";
const port = Number(portText);

if (!pluginId || !/^\d+$/.test(pluginId)) {
  console.error("Usage: node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID> [BRIDGE_PORT]");
  process.exit(1);
}
if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("BRIDGE_PORT must be an integer between 1 and 65535.");
  process.exit(1);
}

const directory = dirname(fileURLToPath(import.meta.url));
const templatePath = join(directory, "manifest.template.json");
const outputPath = join(directory, "manifest.json");
const template = JSON.parse(readFileSync(templatePath, "utf8"));
template.id = pluginId;
template.networkAccess.devAllowedDomains = [
  `http://127.0.0.1:${port}`,
  `http://localhost:${port}`
];
writeFileSync(outputPath, `${JSON.stringify(template, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(`Created ${outputPath} for bridge port ${port}. Import it in Figma Desktop as a development plugin.`);
