import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const packageDirs = ["cli", "mcp-server", "config", "figma-client", "code-generator", "design-tokens"];
const temp = mkdtempSync(join(tmpdir(), "figma-mcp-free-pack-"));

function runPnpm(args, cwd) {
  if (process.env.npm_execpath) {
    return spawnSync(process.execPath, [process.env.npm_execpath, ...args], { cwd, encoding: "utf8" });
  }
  return spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", args, { cwd, encoding: "utf8" });
}

function runTar(args) {
  const result = spawnSync("tar", args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

try {
  for (const dir of packageDirs) {
    const packageRoot = join(root, "packages", dir);
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    for (const field of ["files", "exports", "types", "engines", "license", "repository", "homepage", "bugs", "keywords", "publishConfig"]) {
      assert.ok(manifest[field], `${manifest.name} is missing ${field}`);
    }
    if (dir === "cli") assert.equal(manifest.bin?.["figma-mcp-free"], "./dist/index.js");

    const before = new Set(readdirSync(temp));
    const packed = runPnpm(["pack", "--pack-destination", temp], packageRoot);
    assert.equal(packed.status, 0, packed.stderr || packed.stdout);
    const archiveName = readdirSync(temp).find((file) => file.endsWith(".tgz") && !before.has(file));
    assert.ok(archiveName, `pnpm pack did not create an archive for ${manifest.name}`);
    const archive = join(temp, archiveName);
    const entries = runTar(["-tf", archive]).split(/\r?\n/).filter(Boolean);
    for (const required of ["package/package.json", "package/README.md", "package/LICENSE", "package/dist/index.js", "package/dist/index.d.ts"]) {
      assert.ok(entries.includes(required), `${manifest.name} archive is missing ${required}`);
    }
    if (dir === "cli") assert.ok(entries.includes("package/dist/doctor.js"));
    if (dir === "mcp-server") assert.ok(entries.includes("package/dist/tool-schemas.js"));

    const packedManifest = JSON.parse(runTar(["-xOf", archive, "package/package.json"]));
    for (const version of Object.values(packedManifest.dependencies ?? {})) {
      assert.doesNotMatch(String(version), /^workspace:/, `${manifest.name} contains an unresolved workspace dependency`);
    }
    const sizeKb = Math.ceil(statSync(archive).size / 1024);
    console.log(`${manifest.name}: ${entries.length} files, ${sizeKb} KiB, workspace dependencies resolved`);
  }
  console.log("Package content check passed; no package was published.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
