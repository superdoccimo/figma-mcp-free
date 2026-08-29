import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const directory = join(root, "plugins", "local-bridge");
const templatePath = join(directory, "manifest.template.json");
const codePath = join(directory, "code.js");
const uiPath = join(directory, "ui.html");
const generatorPath = join(directory, "create-manifest.mjs");

for (const path of [templatePath, codePath, uiPath, generatorPath]) {
  assert.equal(existsSync(path), true, `Local plugin file is missing: ${path}`);
}
assert.equal(existsSync(join(directory, "manifest.json")), false, "Generated manifest.json must remain untracked.");

const manifest = JSON.parse(readFileSync(templatePath, "utf8"));
assert.equal(manifest.id, "REPLACE_WITH_FIGMA_GENERATED_PLUGIN_ID");
assert.deepEqual(manifest.editorType, ["figma"]);
assert.equal(manifest.documentAccess, "dynamic-page");
assert.deepEqual(manifest.networkAccess?.allowedDomains, ["none"]);
assert.deepEqual(
  manifest.networkAccess?.devAllowedDomains,
  ["http://127.0.0.1:3845", "http://localhost:3845"]
);
for (const domain of manifest.networkAccess.devAllowedDomains) {
  const parsed = new URL(domain);
  assert.equal(parsed.protocol, "http:");
  assert.ok(["127.0.0.1", "localhost"].includes(parsed.hostname));
  assert.equal(parsed.port, "3845");
}

const code = readFileSync(codePath, "utf8");
assert.match(code, /JSON_REST_V1/);
assert.match(code, /capture-selection/);
const forbiddenWrites = [
  /figma\.create[A-Z]/,
  /\.appendChild\s*\(/,
  /\.insertChild\s*\(/,
  /\.remove\s*\(/,
  /setPluginData/,
  /setSharedPluginData/,
  /figma\.variables\.(?:create|set)/,
  /figma\.clientStorage/
];
for (const pattern of forbiddenWrites) {
  assert.doesNotMatch(code, pattern, `Read-only plugin contains a forbidden write pattern: ${pattern}`);
}

const ui = readFileSync(uiPath, "utf8");
assert.match(ui, /Capture &amp; Send/);
assert.match(ui, /Authorization/);
assert.doesNotMatch(ui, /localStorage|sessionStorage|indexedDB/i, "Plugin UI must not persist pairing credentials.");
for (const match of ui.matchAll(/https?:\/\/[^\s"'`<]+/g)) {
  const parsed = new URL(match[0]);
  assert.ok(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname), `Unexpected plugin UI network URL: ${match[0]}`);
}

for (const path of [codePath, generatorPath]) {
  const checked = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
}

console.log("Local plugin integrity check passed: explicit capture, loopback-only network, no credential persistence, no detected write APIs.");
