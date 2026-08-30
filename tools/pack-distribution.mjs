import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildDistribution } from "./build-distribution.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function packDistribution(options = {}) {
  const workRoot = options.workRoot ?? mkdtempSync(join(tmpdir(), "figma-mcp-free-pack-"));
  const artifactDir = resolve(options.artifactDir ?? join(workRoot, "artifacts"));
  const stageRoot = join(workRoot, "stage");
  await rm(artifactDir, { recursive: true, force: true });
  await mkdir(artifactDir, { recursive: true });

  const staged = await buildDistribution({ outputRoot: stageRoot });
  const output = execFileSync(
    npmCommand,
    ["pack", "--json", "--ignore-scripts", "--pack-destination", artifactDir],
    { cwd: staged.packageDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  const packed = JSON.parse(output);
  if (!Array.isArray(packed) || packed.length !== 1 || !packed[0].filename) {
    throw new Error("npm pack did not return exactly one package artifact.");
  }

  const tarballPath = join(artifactDir, packed[0].filename);
  const tarball = await readFile(tarballPath);
  const manifest = {
    schemaVersion: 1,
    package: staged.manifest.name,
    version: staged.manifest.version,
    sourceCommit: JSON.parse(await readFile(join(staged.packageDir, "BUILD_INFO.json"), "utf8")).sourceCommit,
    filename: packed[0].filename,
    sha256: sha256(tarball),
    size: tarball.length,
    files: packed[0].files?.length ?? null,
    bundledDependencies: staged.manifest.bundledDependencies
  };
  const manifestPath = join(artifactDir, "release-manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...staged, artifactDir, tarballPath, manifestPath, releaseManifest: manifest };
}

const invokedDirectly = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const outputIndex = process.argv.indexOf("--output");
  const artifactDir = outputIndex >= 0 ? process.argv[outputIndex + 1] : undefined;
  const result = await packDistribution({ artifactDir });
  console.log(JSON.stringify({
    tarballPath: result.tarballPath,
    manifestPath: result.manifestPath,
    sha256: result.releaseManifest.sha256
  }, null, 2));
}
