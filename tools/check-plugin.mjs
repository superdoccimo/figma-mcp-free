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
const bridgeSourcePath = join(root, "packages", "figma-client", "src", "plugin-bridge.ts");

for (const path of [templatePath, codePath, uiPath, generatorPath, bridgeSourcePath]) {
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

const generator = readFileSync(generatorPath, "utf8");
assert.match(generator, /\[BRIDGE_PORT\]/);
assert.match(generator, /port\s*<\s*1\s*\|\|\s*port\s*>\s*65535/);
assert.match(generator, /networkAccess\.devAllowedDomains/);
assert.match(generator, /http:\/\/127\.0\.0\.1:\$\{port\}/);
assert.match(generator, /http:\/\/localhost:\$\{port\}/);

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
assert.match(ui, /redirect:\s*["']error["']/);
assert.match(ui, /AbortController/);
assert.match(ui, /if \(!parsed\.port\)/);
assert.doesNotMatch(ui, /localStorage|sessionStorage|indexedDB/i, "Plugin UI must not persist pairing credentials.");
for (const match of ui.matchAll(/https?:\/\/[^\s"'`<]+/g)) {
  const parsed = new URL(match[0]);
  assert.ok(["127.0.0.1", "localhost"].includes(parsed.hostname), `Unexpected plugin UI network URL: ${match[0]}`);
}
assert.doesNotMatch(ui, /\["127\.0\.0\.1",\s*"localhost",\s*"::1"\]/, "Figma development manifest does not authorize an IPv6 loopback origin.");

const bridgeSource = readFileSync(bridgeSourcePath, "utf8");
for (const required of [
  /requestHostIsLoopback/,
  /isLoopbackAddress/,
  /timingSafeEqual/,
  /MIN_TOKEN_LENGTH\s*=\s*32/,
  /MAX_TOKEN_LENGTH\s*=\s*512/,
  /redirect:\s*["']error["']/,
  /maxBodyBytes/,
  /maxNodes/,
  /maxDepth/,
  /requestTimeout/
]) {
  assert.match(bridgeSource, required, `Bridge source is missing required boundary: ${required}`);
}
assert.doesNotMatch(bridgeSource, /allowNonLoopback/, "Bridge client must not expose a non-loopback escape hatch.");

for (const path of [codePath, generatorPath]) {
  const checked = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
}

console.log("Local plugin integrity check passed: explicit capture, loopback and Host validation, manifest-aligned ports, bounded payloads, no credential persistence, and no detected Figma writes.");
