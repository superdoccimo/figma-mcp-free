#!/usr/bin/env node
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(packageRoot, "plugin");
const requiredAssets = ["code.js", "ui.html", "README.md"];

function usage() {
  console.log(`figma-mcp-free plugin

Commands:
  create-manifest <FIGMA_PLUGIN_ID> [--port 3845] [--out-dir ./figma-mcp-free-plugin] [--force] [--json]
  verify [DIRECTORY] [--json]

The generated development Plugin is read-only and may contact only localhost or 127.0.0.1 on the selected port.`);
}

function parseOptions(args) {
  const positional = [];
  const options = { port: 3845, outDir: "figma-mcp-free-plugin", force: false, json: false };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--force") options.force = true;
    else if (value === "--json") options.json = true;
    else if (value === "--port") options.port = Number(args[++index]);
    else if (value === "--out-dir") options.outDir = args[++index];
    else if (value.startsWith("--")) throw new Error(`Unknown option: ${value}`);
    else positional.push(value);
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error("--port must be an integer between 1 and 65535.");
  }
  if (!options.outDir) throw new Error("--out-dir requires a directory.");
  return { positional, options };
}

async function createManifest(args) {
  const { positional, options } = parseOptions(args);
  const pluginId = positional[0]?.trim();
  if (!pluginId || !/^\d+$/.test(pluginId)) {
    throw new Error("A numeric Figma-generated development Plugin ID is required.");
  }
  if (positional.length > 1) throw new Error(`Unexpected argument: ${positional[1]}`);

  const outputDir = resolve(options.outDir);
  const targets = [...requiredAssets, "manifest.json"].map((filename) => join(outputDir, filename));
  if (!options.force && targets.some((path) => existsSync(path))) {
    throw new Error(`Refusing to overwrite files in ${outputDir}. Pass --force after reviewing the directory.`);
  }

  await mkdir(outputDir, { recursive: true });
  for (const filename of requiredAssets) {
    await copyFile(join(sourceDir, filename), join(outputDir, filename));
  }

  const template = JSON.parse(await readFile(join(sourceDir, "manifest.template.json"), "utf8"));
  template.id = pluginId;
  template.networkAccess = {
    allowedDomains: ["none"],
    devAllowedDomains: [
      `http://127.0.0.1:${options.port}`,
      `http://localhost:${options.port}`
    ]
  };
  const manifestPath = join(outputDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(template, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });

  const result = {
    outputDir,
    manifestPath,
    port: options.port,
    allowedOrigins: template.networkAccess.devAllowedDomains,
    readOnly: true
  };
  console.log(options.json ? JSON.stringify(result, null, 2) : `Created ${manifestPath}. Import it in Figma Desktop as a development Plugin.`);
}

async function verifyDirectory(args) {
  const { positional, options } = parseOptions(args);
  if (positional.length > 1) throw new Error(`Unexpected argument: ${positional[1]}`);
  const directory = resolve(positional[0] ?? options.outDir);
  for (const filename of [...requiredAssets, "manifest.json"]) {
    const info = await stat(join(directory, filename));
    if (!info.isFile()) throw new Error(`Missing Plugin file: ${filename}`);
  }

  const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
  if (!/^\d+$/.test(String(manifest.id ?? ""))) throw new Error("manifest.json does not contain a numeric Plugin ID.");
  if (JSON.stringify(manifest.networkAccess?.allowedDomains) !== JSON.stringify(["none"])) {
    throw new Error("manifest.json must deny production domains.");
  }
  const origins = manifest.networkAccess?.devAllowedDomains;
  if (!Array.isArray(origins) || origins.length !== 2) throw new Error("manifest.json requires exactly two development loopback origins.");
  const ports = new Set();
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(parsed.hostname) || !parsed.port) {
      throw new Error(`Unexpected development origin: ${origin}`);
    }
    ports.add(parsed.port);
  }
  if (ports.size !== 1) throw new Error("The two loopback origins must use the same port.");

  const result = { directory, valid: true, pluginId: manifest.id, port: [...ports][0], readOnly: true };
  console.log(options.json ? JSON.stringify(result, null, 2) : `Verified read-only development Plugin files in ${directory}.`);
}

const [command, ...args] = process.argv.slice(2);
try {
  if (!command || command === "help" || command === "--help" || command === "-h") usage();
  else if (command === "create-manifest") await createManifest(args);
  else if (command === "verify") await verifyDirectory(args);
  else throw new Error(`Unknown Plugin command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Plugin setup failed.");
  process.exitCode = 1;
}
