import { chmodSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (path) => readFileSync(join(root, path), "utf8");
const writeText = (path, content) => {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content.endsWith("\n") ? content : `${content}\n`, "utf8");
};
const readJson = (path) => JSON.parse(readText(path));
const writeJson = (path, value) => writeText(path, `${JSON.stringify(value, null, 2)}\n`);

function appendOnce(path, marker, content) {
  const current = readText(path);
  if (!current.includes(marker)) writeText(path, `${current.trimEnd()}\n\n${content.trim()}\n`);
}

const rootPackage = readJson("package.json");
rootPackage.devDependencies = {
  ...(rootPackage.devDependencies ?? {}),
  esbuild: "0.28.1"
};
rootPackage.scripts = {
  ...rootPackage.scripts,
  "build:public": "node tools/build-public-package.mjs",
  "check:public": "node tools/check-public-package.mjs",
  "pack:smoke": "node tools/smoke-packed-install.mjs",
  "evidence:check": "node tools/check-desktop-evidence.mjs",
  "release:check": "pnpm check && pnpm run pack:smoke"
};
if (!rootPackage.scripts.check.includes("check:public")) {
  rootPackage.scripts.check = rootPackage.scripts.check.replace(
    "&& pnpm run pack:check",
    "&& pnpm run check:public && pnpm run pack:check"
  );
}
writeJson("package.json", rootPackage);

const cliPath = "packages/cli/package.json";
const cliPackage = readJson(cliPath);
const buildDependencies = {
  ...(cliPackage.devDependencies ?? {}),
  ...(cliPackage.dependencies ?? {}),
  ...(cliPackage.optionalDependencies ?? {})
};
cliPackage.name = "figma-mcp-free";
cliPackage.private = false;
cliPackage.type = "module";
cliPackage.engines = { node: ">=18" };
cliPackage.bin = {
  "figma-mcp-free": "dist/index.js",
  "figma-mcp-free-bridge": "dist/bridge-cli.js",
  "figma-mcp-free-mcp": "dist/mcp-cli.js",
  "figma-mcp-free-verify-desktop": "dist/verify-desktop.js",
  "figma-mcp-free-plugin": "dist/plugin-cli.js"
};
cliPackage.files = ["dist", "plugin", "README.md", "LICENSE"];
cliPackage.scripts = {
  ...(cliPackage.scripts ?? {}),
  build: "node ../../tools/build-public-package.mjs",
  prepack: "node ../../tools/build-public-package.mjs"
};
cliPackage.dependencies = {};
delete cliPackage.optionalDependencies;
cliPackage.devDependencies = buildDependencies;
cliPackage.publishConfig = { access: "public" };
cliPackage.repository = {
  type: "git",
  url: "git+https://github.com/superdoccimo/figma-mcp-free.git",
  directory: "packages/cli"
};
cliPackage.bugs = { url: "https://github.com/superdoccimo/figma-mcp-free/issues" };
cliPackage.homepage = "https://github.com/superdoccimo/figma-mcp-free#readme";
delete cliPackage.main;
delete cliPackage.module;
delete cliPackage.types;
delete cliPackage.exports;
writeJson(cliPath, cliPackage);

for (const path of [
  "packages/mcp-server/package.json",
  "packages/figma-client/package.json",
  "packages/config/package.json",
  "packages/design-tokens/package.json",
  "packages/code-generator/package.json"
]) {
  const manifest = readJson(path);
  manifest.private = true;
  writeJson(path, manifest);
}

writeText("packages/cli/src/mcp-cli.ts", String.raw`#!/usr/bin/env node
import { readFileSync } from "node:fs";

function buildInfo(): { version: string; commit: string } {
  try {
    return JSON.parse(readFileSync(new URL("./build-info.json", import.meta.url), "utf8"));
  } catch {
    return { version: "0.0.0-development", commit: "unknown" };
  }
}

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log(`figma-mcp-free-mcp

Read-only MCP STDIO server for the Figma REST backend and authenticated local Plugin bridge.

Usage:
  figma-mcp-free-mcp
  figma-mcp-free-mcp --version
  figma-mcp-free-mcp --help

REST reads use FIGMA_TOKEN. Local Plugin reads use FIGMA_PLUGIN_BRIDGE_URL and FIGMA_PLUGIN_BRIDGE_TOKEN.`);
} else if (args.has("--version") || args.has("-V")) {
  console.log(buildInfo().version);
} else {
  await import("../../mcp-server/src/index.js");
}
`);

writeText("packages/cli/src/plugin-cli.ts", String.raw`#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function parsePort(value: string): number {
  const port = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new InvalidArgumentError("Port must be an integer between 1 and 65535.");
  }
  return port;
}

const program = new Command()
  .name("figma-mcp-free-plugin")
  .description("Prepare the read-only Figma development Plugin manifest")
  .version("0.1.0");

program.command("manifest")
  .description("Generate an untracked development manifest for the exact local bridge port")
  .argument("<plugin-id>", "numeric ID generated by Figma Desktop")
  .argument("[port]", "local bridge port", parsePort, 3845)
  .option("--out <path>", "output manifest path", "./figma-mcp-free-plugin/manifest.json")
  .action((pluginId: string, port: number, options: { out: string }) => {
    if (!/^\d+$/.test(pluginId)) throw new InvalidArgumentError("Plugin ID must contain digits only.");
    const template = JSON.parse(readFileSync(new URL("../plugin/manifest.template.json", import.meta.url), "utf8"));
    template.id = pluginId;
    template.networkAccess.devAllowedDomains = [
      `http://127.0.0.1:${port}`,
      `http://localhost:${port}`
    ];
    const output = resolve(options.out);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(template, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    console.log(`Created ${output} for loopback bridge port ${port}.`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Plugin manifest generation failed.");
  process.exitCode = 1;
});
`);

writeText("packages/cli/src/verify-desktop.ts", String.raw`#!/usr/bin/env node
import { Command, InvalidArgumentError, Option } from "commander";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { inspectSelection } from "@figma-mcp-free/figma-client";
import { PluginBridgeClient } from "@figma-mcp-free/figma-client/plugin-bridge";
import { generateCode, type Framework } from "@figma-mcp-free/code-generator";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseIndex(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 49) {
    throw new InvalidArgumentError("Selection index must be an integer from 0 to 49.");
  }
  return parsed;
}

function parseTimeout(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 120000) {
    throw new InvalidArgumentError("Timeout must be an integer from 1 to 120000 milliseconds.");
  }
  return parsed;
}

function buildInfo(): { version: string; commit: string } {
  return JSON.parse(readFileSync(new URL("./build-info.json", import.meta.url), "utf8"));
}

const program = new Command()
  .name("figma-mcp-free-verify-desktop")
  .description("Run a guided, privacy-preserving Figma Desktop smoke test and write sanitized JSON evidence")
  .version("0.1.0")
  .option("--url <url>", "bridge origin", process.env.FIGMA_PLUGIN_BRIDGE_URL || "http://127.0.0.1:3845")
  .option("--token <token>", "pairing token; prefer FIGMA_PLUGIN_BRIDGE_TOKEN")
  .option("--timeout <ms>", "bridge timeout", parseTimeout, 10000)
  .option("--index <n>", "captured selection index", parseIndex, 0)
  .addOption(new Option("--framework <name>", "starter-code framework").choices(["react", "vue", "svelte", "html"]).default("react"))
  .option("--out <path>", "sanitized evidence file", "figma-desktop-smoke.json")
  .option("--confirm-plugin-imported", "confirm that the development Plugin was imported in Figma Desktop")
  .option("--confirm-user-capture", "confirm that a human pressed Capture & Send")
  .option("--keep-snapshot", "do not clear the in-memory snapshot after verification")
  .action(async (options: {
    url: string;
    token?: string;
    timeout: number;
    index: number;
    framework: Framework;
    out: string;
    confirmPluginImported?: boolean;
    confirmUserCapture?: boolean;
    keepSnapshot?: boolean;
  }) => {
    if (!options.confirmPluginImported || !options.confirmUserCapture) {
      throw new Error("Both --confirm-plugin-imported and --confirm-user-capture are required. CI alone cannot prove Figma Desktop interaction.");
    }
    const token = options.token?.trim() || process.env.FIGMA_PLUGIN_BRIDGE_TOKEN?.trim();
    if (!token) throw new Error("Set FIGMA_PLUGIN_BRIDGE_TOKEN or pass --token.");

    const client = new PluginBridgeClient({ baseUrl: options.url, token, timeoutMs: options.timeout });
    const health = await client.health();
    if (!health.hasSnapshot) throw new Error("The bridge has no snapshot. Select a non-sensitive sample node and press Capture & Send first.");
    const snapshot = await client.getSnapshot();
    if (snapshot.sessionId !== health.sessionId) throw new Error("Bridge session changed during verification. Restart the smoke test.");
    const selection = snapshot.selections[options.index];
    if (!selection) throw new Error(`Selection index ${options.index} is outside the captured range.`);

    const syntheticFileId = `plugin:${hash(snapshot.sessionId).slice(0, 16)}`;
    const inspected = inspectSelection(selection.document, {
      fileId: syntheticFileId,
      nodeId: selection.id,
      depth: 2,
      maxChildren: 20
    });
    const generated = generateCode(selection.document, options.framework);
    if (!generated.trim()) throw new Error("Starter-code generation returned empty output.");

    let cleared = false;
    if (!options.keepSnapshot) {
      await client.clearSnapshot();
      const after = await client.health();
      cleared = !after.hasSnapshot && after.selectionCount === 0;
      if (!cleared) throw new Error("The bridge snapshot did not clear after verification.");
    }

    const info = buildInfo();
    const evidence = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      candidate: info,
      environment: {
        platform: process.platform,
        arch: process.arch,
        node: process.version
      },
      confirmations: {
        pluginImportedInFigmaDesktop: true,
        captureTriggeredByHuman: true
      },
      bridge: {
        originSha256: hash(new URL(options.url).origin),
        sessionSha256: hash(snapshot.sessionId),
        capturedAt: snapshot.capturedAt,
        selectionCount: snapshot.selections.length,
        verifiedIndex: options.index
      },
      checks: [
        { id: "health", status: "pass" },
        { id: "snapshot", status: "pass", documentSha256: hash(JSON.stringify(selection.document)) },
        { id: "inspect", status: "pass", outputSha256: hash(JSON.stringify(inspected)) },
        { id: `generate-${options.framework}`, status: "pass", bytes: Buffer.byteLength(generated), outputSha256: hash(generated) },
        { id: "clear", status: options.keepSnapshot ? "skipped" : cleared ? "pass" : "fail" }
      ],
      privacy: {
        rawDesignIncluded: false,
        fileOrPageNamesIncluded: false,
        nodeNamesOrIdsIncluded: false,
        pairingTokenIncluded: false,
        snapshotRetained: Boolean(options.keepSnapshot)
      }
    };

    const output = resolve(options.out);
    writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    console.log(`Desktop smoke evidence: ${output}`);
    console.log(`Evidence SHA256: ${hash(JSON.stringify(evidence))}`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Desktop verification failed.");
  process.exitCode = 1;
});
`);

writeText("tools/build-public-package.mjs", String.raw`import { build } from "esbuild";
import { chmodSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outdir = join(root, "packages", "cli", "dist");
const pluginOut = join(root, "packages", "cli", "plugin");
rmSync(outdir, { recursive: true, force: true });
rmSync(pluginOut, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

await build({
  absWorkingDir: root,
  entryPoints: {
    index: "packages/cli/src/index.ts",
    "bridge-cli": "packages/cli/src/bridge-cli.ts",
    "mcp-cli": "packages/cli/src/mcp-cli.ts",
    "verify-desktop": "packages/cli/src/verify-desktop.ts",
    "plugin-cli": "packages/cli/src/plugin-cli.ts"
  },
  outdir,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  legalComments: "external",
  sourcemap: false,
  treeShaking: true,
  charset: "utf8",
  logLevel: "silent"
});

for (const name of ["index.js", "bridge-cli.js", "mcp-cli.js", "verify-desktop.js", "plugin-cli.js"]) {
  const path = join(outdir, name);
  const body = readFileSync(path, "utf8").replace(/^#![^\n]*\n/, "");
  writeFileSync(path, `#!/usr/bin/env node\n${body}`, "utf8");
  chmodSync(path, 0o755);
}

cpSync(join(root, "plugins", "local-bridge"), pluginOut, {
  recursive: true,
  filter: (source) => !source.endsWith("manifest.json")
});

let commit = process.env.GITHUB_SHA || "unknown";
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
} catch {}
const version = JSON.parse(readFileSync(join(root, "packages", "cli", "package.json"), "utf8")).version;
writeFileSync(join(outdir, "build-info.json"), `${JSON.stringify({ version, commit }, null, 2)}\n`, "utf8");
`);

writeText("tools/check-public-package.mjs", String.raw`import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const directory = join(root, "packages", "cli");
const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
assert.equal(manifest.name, "figma-mcp-free");
assert.equal(manifest.private, false);
assert.deepEqual(manifest.dependencies, {});
for (const section of ["dependencies", "optionalDependencies", "peerDependencies"]) {
  for (const value of Object.values(manifest[section] ?? {})) {
    assert.doesNotMatch(String(value), /^workspace:/, `Published ${section} must not contain workspace protocol values.`);
  }
}
const expectedBins = {
  "figma-mcp-free": "dist/index.js",
  "figma-mcp-free-bridge": "dist/bridge-cli.js",
  "figma-mcp-free-mcp": "dist/mcp-cli.js",
  "figma-mcp-free-verify-desktop": "dist/verify-desktop.js",
  "figma-mcp-free-plugin": "dist/plugin-cli.js"
};
assert.deepEqual(manifest.bin, expectedBins);
for (const path of [...Object.values(expectedBins), "dist/build-info.json", "plugin/manifest.template.json", "plugin/code.js", "plugin/ui.html"]) {
  const absolute = join(directory, path);
  assert.equal(existsSync(absolute), true, `Public package file is missing: ${path}`);
}
for (const path of Object.values(expectedBins)) {
  assert.match(readFileSync(join(directory, path), "utf8"), /^#!\/usr\/bin\/env node\n/);
}
assert.equal(existsSync(join(directory, "plugin", "manifest.json")), false);
console.log("Public package check passed: one package, five binaries, bundled runtime, and no workspace runtime dependencies.");
`);

writeText("tools/smoke-packed-install.mjs", String.raw`import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const packageDir = join(root, "packages", "cli");
const workspace = mkdtempSync(join(tmpdir(), "figma-mcp-free-packed-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", timeout: 180000, ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed (${command} ${args.join(" ")}):\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

try {
  const packDir = join(workspace, "pack");
  const installDir = join(workspace, "install");
  writeFileSync(join(workspace, "placeholder"), "", "utf8");
  const stdout = run(npm, ["pack", "--json", "--pack-destination", packDir], packageDir);
  const match = stdout.match(/\[\s*\{[\s\S]*\}\s*\]\s*$/);
  if (!match) throw new Error(`npm pack did not return JSON:\n${stdout}`);
  const packed = JSON.parse(match[0]);
  const tarball = join(packDir, packed[0].filename);
  assert.equal(existsSync(tarball), true);

  writeFileSync(join(installDir, "package.json"), JSON.stringify({ name: "packed-smoke", private: true }), { encoding: "utf8", flag: "w" });
  run(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], installDir);

  const manifestPath = join(installDir, "node_modules", "figma-mcp-free", "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.name, "figma-mcp-free");
  assert.deepEqual(manifest.dependencies, {});
  assert.doesNotMatch(JSON.stringify(manifest), /workspace:/);

  const binDir = join(installDir, "node_modules", ".bin");
  const suffix = process.platform === "win32" ? ".cmd" : "";
  for (const name of [
    "figma-mcp-free",
    "figma-mcp-free-bridge",
    "figma-mcp-free-mcp",
    "figma-mcp-free-verify-desktop",
    "figma-mcp-free-plugin"
  ]) {
    run(join(binDir, `${name}${suffix}`), ["--help"], installDir);
  }

  const generatedManifest = join(workspace, "plugin", "manifest.json");
  run(join(binDir, `figma-mcp-free-plugin${suffix}`), ["manifest", "123456789", "49152", "--out", generatedManifest], installDir);
  const pluginManifest = JSON.parse(readFileSync(generatedManifest, "utf8"));
  assert.equal(pluginManifest.id, "123456789");
  assert.deepEqual(pluginManifest.networkAccess.devAllowedDomains, [
    "http://127.0.0.1:49152",
    "http://localhost:49152"
  ]);
  run(npm, ["ls", "--omit=dev", "--all"], installDir);
  console.log(`Packed install smoke passed on ${process.platform}/${process.arch}: ${basename(tarball)}`);
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
`);

writeText("tools/check-desktop-evidence.mjs", String.raw`import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const allowUncleared = args.includes("--allow-uncleared");
const path = args.find((value) => !value.startsWith("--"));
if (!path) {
  console.error("Usage: node tools/check-desktop-evidence.mjs <evidence.json> [--expected-commit=<sha>] [--allow-uncleared]");
  process.exit(1);
}
const expectedCommit = args.find((value) => value.startsWith("--expected-commit="))?.split("=", 2)[1];
const evidence = JSON.parse(readFileSync(path, "utf8"));
assert.equal(evidence.schemaVersion, 1);
assert.match(evidence.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
assert.match(evidence.candidate?.commit, /^[0-9a-f]{40}$/);
assert.equal(evidence.confirmations?.pluginImportedInFigmaDesktop, true);
assert.equal(evidence.confirmations?.captureTriggeredByHuman, true);
if (expectedCommit) assert.equal(evidence.candidate.commit, expectedCommit);
for (const id of ["health", "snapshot", "inspect"]) {
  assert.equal(evidence.checks.find((check) => check.id === id)?.status, "pass", `${id} must pass`);
}
assert.equal(evidence.checks.some((check) => check.id.startsWith("generate-") && check.status === "pass"), true);
if (!allowUncleared) assert.equal(evidence.checks.find((check) => check.id === "clear")?.status, "pass");
assert.deepEqual(evidence.privacy, {
  rawDesignIncluded: false,
  fileOrPageNamesIncluded: false,
  nodeNamesOrIdsIncluded: false,
  pairingTokenIncluded: false,
  snapshotRetained: allowUncleared ? evidence.privacy.snapshotRetained : false
});
const forbiddenKeys = /token|rawSnapshot|document|fileName|pageName|nodeName|nodeId/i;
function walk(value, path = "$") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.doesNotMatch(key, forbiddenKeys, `Forbidden evidence key at ${path}.${key}`);
    walk(child, `${path}.${key}`);
  }
}
walk(evidence);
console.log(`Desktop evidence check passed for ${evidence.candidate.commit}.`);
`);

writeText("docs/evidence/figma-desktop-smoke.schema.json", `${JSON.stringify({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "figma-mcp-free Figma Desktop smoke evidence",
  type: "object",
  required: ["schemaVersion", "generatedAt", "candidate", "environment", "confirmations", "bridge", "checks", "privacy"],
  properties: {
    schemaVersion: { const: 1 },
    generatedAt: { type: "string", format: "date-time" },
    candidate: {
      type: "object",
      required: ["version", "commit"],
      properties: {
        version: { type: "string" },
        commit: { type: "string", pattern: "^[0-9a-f]{40}$" }
      },
      additionalProperties: false
    },
    confirmations: {
      type: "object",
      properties: {
        pluginImportedInFigmaDesktop: { const: true },
        captureTriggeredByHuman: { const: true }
      },
      required: ["pluginImportedInFigmaDesktop", "captureTriggeredByHuman"],
      additionalProperties: false
    }
  }
}, null, 2)}\n`);

writeText("docs/desktop-smoke-test.md", String.raw`# Figma Desktop smoke-test evidence

Automated Linux, Windows and macOS checks verify the Node.js bridge protocol, package installation and static Plugin boundary. They cannot prove that Figma Desktop imported the development Plugin or that a human pressed **Capture & Send**.

Use a non-sensitive sample file and the exact release-candidate checkout.

## 1. Build the candidate

```bash
pnpm install --frozen-lockfile
pnpm release:check
```

## 2. Start and import

```bash
pnpm --filter figma-mcp-free bridge -- serve
node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID> 3845
```

Import `plugins/local-bridge/manifest.json` in Figma Desktop, paste the printed pairing token, select a sample node and press **Capture & Send**.

## 3. Generate sanitized evidence

```bash
export FIGMA_PLUGIN_BRIDGE_URL=http://127.0.0.1:3845
export FIGMA_PLUGIN_BRIDGE_TOKEN='<PAIRING_TOKEN>'
node packages/cli/dist/verify-desktop.js \
  --confirm-plugin-imported \
  --confirm-user-capture \
  --out figma-desktop-smoke.json
```

PowerShell uses `$env:FIGMA_PLUGIN_BRIDGE_URL` and `$env:FIGMA_PLUGIN_BRIDGE_TOKEN`.

The verifier reads one snapshot, runs bounded inspection and starter-code generation, clears the in-memory snapshot, and writes hashes plus environment metadata. It does not write the token, file name, page name, node name, node ID or raw design document.

## 4. Validate

```bash
pnpm evidence:check -- figma-desktop-smoke.json --expected-commit=$(git rev-parse HEAD)
```

Attach the sanitized JSON and its printed SHA256 to the release-candidate review. Do not commit private Figma data or pairing credentials.
`);

writeText(".github/workflows/release-candidate.yml", String.raw`name: Release candidate

on:
  workflow_dispatch:
    inputs:
      ref:
        description: Exact branch, tag, or commit to verify
        required: true
        default: main

permissions:
  contents: read

concurrency:
  group: release-candidate-${{ inputs.ref }}
  cancel-in-progress: false

jobs:
  packed-install:
    name: packed install (${{ matrix.os }})
    runs-on: ${{ matrix.os }}
    timeout-minutes: 25
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-24.04, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v7
        with:
          ref: ${{ inputs.ref }}
          fetch-depth: 0
          persist-credentials: false
      - uses: pnpm/action-setup@v6
        with:
          version: 9.15.9
      - uses: actions/setup-node@v7
        with:
          node-version: 22.x
          cache: pnpm
          cache-dependency-path: pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm release:check

  artifact:
    name: unsigned package artifact
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
        with:
          ref: ${{ inputs.ref }}
          fetch-depth: 0
          persist-credentials: false
      - uses: pnpm/action-setup@v6
        with:
          version: 9.15.9
      - uses: actions/setup-node@v7
        with:
          node-version: 22.x
          cache: pnpm
          cache-dependency-path: pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - name: Build and pack without publishing
        shell: bash
        run: |
          set -euo pipefail
          mkdir -p release-artifacts
          npm pack --pack-destination "$PWD/release-artifacts" ./packages/cli
          cd release-artifacts
          sha256sum *.tgz > SHA256SUMS
      - uses: actions/upload-artifact@v7
        with:
          name: figma-mcp-free-unsigned-${{ github.run_id }}
          path: release-artifacts/
          if-no-files-found: error
          retention-days: 14
`);

const ciPath = ".github/workflows/ci.yml";
let ci = readText(ciPath);
if (!ci.includes("name: packed install (")) {
  ci = `${ci.trimEnd()}\n\n  packed-install:\n    name: packed install (\${{ matrix.os }}, 22.x)\n    runs-on: \${{ matrix.os }}\n    timeout-minutes: 25\n    strategy:\n      fail-fast: false\n      matrix:\n        os: [ubuntu-24.04, windows-latest, macos-latest]\n\n    steps:\n      - name: Checkout\n        uses: actions/checkout@v7\n        with:\n          fetch-depth: 0\n          persist-credentials: false\n\n      - name: Setup pnpm\n        uses: pnpm/action-setup@v6\n        with:\n          version: 9.15.9\n\n      - name: Setup Node.js 22.x\n        uses: actions/setup-node@v7\n        with:\n          node-version: 22.x\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n\n      - name: Install dependencies\n        run: pnpm install --frozen-lockfile\n\n      - name: Smoke-test the packed public package\n        run: pnpm run pack:smoke\n`;
  writeText(ciPath, ci);
}

appendOnce("README.md", "## Distribution readiness", String.raw`## Distribution readiness

The repository now builds one self-contained public package named `figma-mcp-free`. The internal workspace packages remain implementation details and are not intended for separate publication.

Before registry publication, use a source checkout. Maintainers can prove the future package without publishing it:

```bash
pnpm release:check
```

That command builds the complete repository, creates the npm tarball, installs it into a clean temporary project and exercises all five binaries. CI repeats the packed-install test on Linux, Windows and macOS.

A real Figma Desktop interaction is still required before a release-ready claim. See [Figma Desktop smoke-test evidence](docs/desktop-smoke-test.md).`);

appendOnce("jp/README.md", "## 配布準備の状態", String.raw`## 配布準備の状態

公開時は内部packageを個別に並べず、`figma-mcp-free`という単一npm packageへCLI、bridge、MCP server、Plugin manifest生成、Desktop証跡生成を同梱します。現在はまだnpm公開していないためsource checkoutを使います。

公開前のtarballは次で検証できます。

```bash
pnpm release:check
```

この検査はcleanな一時projectへtarballをinstallし、5つのcommandを実行します。GitHub ActionsではLinux、Windows、macOSの3環境で繰り返します。

Figma Desktop上のimportと人間による`Capture & Send`だけはCIでは証明できません。手順と匿名化済み証跡の生成方法は[Desktop smoke test](../docs/desktop-smoke-test.md)にあります。`);

appendOnce("docs/releasing.md", "## Single-package release candidate", String.raw`## Single-package release candidate

Only `packages/cli` is the public npm package. Its tarball bundles the CLI, local bridge CLI, MCP STDIO server, Desktop evidence verifier, Plugin manifest generator and read-only Plugin assets. The other workspace packages are private implementation modules.

Run `pnpm release:check`, then use the manual **Release candidate** workflow for an unsigned three-OS artifact. Publication remains a separate human-approved action. A release candidate is not release-ready until sanitized Figma Desktop evidence validates against the exact candidate commit.`);

appendOnce("docs/launch-checklist.md", "## Productization gate", String.raw`## Productization gate

- [ ] `pnpm release:check` passes from a clean checkout.
- [ ] Packed-install jobs pass on Linux, Windows and macOS.
- [ ] Dependency review and both CodeQL jobs pass on the exact commit.
- [ ] Figma Desktop evidence was generated from a non-sensitive sample file.
- [ ] `pnpm evidence:check -- <file> --expected-commit=<sha>` passes.
- [ ] The npm name and publisher identity were verified immediately before publication.
- [ ] A human approved npm publication and GitHub Release creation.`);

appendOnce("packages/cli/README.md", "## Public package layout", String.raw`## Public package layout

This is the only workspace package intended for npm publication. The tarball contains five binaries:

- `figma-mcp-free`
- `figma-mcp-free-bridge`
- `figma-mcp-free-mcp`
- `figma-mcp-free-verify-desktop`
- `figma-mcp-free-plugin`

Runtime code is bundled so registry users do not need separately published `@figma-mcp-free/*` packages. Use `pnpm pack:smoke` from the repository root to prove a clean installation before publication.`);

console.log("Productization source transformation prepared.");
