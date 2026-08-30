import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesRoot = join(root, "packages");
const cliRoot = join(packagesRoot, "cli");
const pluginRoot = join(root, "plugins", "local-bridge");
const distributionRoot = join(root, "distribution");
const internalPackageDirectories = [
  "code-generator",
  "config",
  "design-tokens",
  "figma-client",
  "mcp-server"
];

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function copyIfPresent(source, target) {
  if (!existsSync(source)) return;
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true, force: true });
}

function rewriteWorkspaceSpec(name, spec, versions) {
  if (typeof spec !== "string" || !spec.startsWith("workspace:")) return spec;
  const version = versions.get(name);
  if (!version) throw new Error(`No workspace version is available for ${name}.`);
  return version;
}

function rewriteDependencyMap(dependencies, versions) {
  if (!dependencies) return undefined;
  return Object.fromEntries(
    Object.entries(dependencies)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, spec]) => [name, rewriteWorkspaceSpec(name, spec, versions)])
  );
}

function keepDefined(value) {
  return value && Object.keys(value).length ? value : undefined;
}

function sanitizeInternalManifest(source, versions) {
  return Object.fromEntries(Object.entries({
    name: source.name,
    version: source.version,
    description: source.description,
    type: source.type,
    main: source.main,
    module: source.module,
    types: source.types,
    exports: source.exports,
    bin: source.bin,
    engines: source.engines,
    license: source.license,
    dependencies: keepDefined(rewriteDependencyMap(source.dependencies, versions)),
    optionalDependencies: keepDefined(rewriteDependencyMap(source.optionalDependencies, versions)),
    peerDependencies: keepDefined(rewriteDependencyMap(source.peerDependencies, versions)),
    peerDependenciesMeta: source.peerDependenciesMeta
  }).filter(([, value]) => value !== undefined));
}

function recordExternalDependencies(target, dependencies, internalNames) {
  for (const [name, spec] of Object.entries(dependencies ?? {})) {
    if (internalNames.has(name)) continue;
    const previous = target.get(name);
    if (previous && previous !== spec) {
      throw new Error(`Conflicting runtime ranges for ${name}: ${previous} and ${spec}.`);
    }
    target.set(name, spec);
  }
}

function currentCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function assertBuilt(path, label) {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) throw new Error();
  } catch {
    throw new Error(`${label} is not built. Run \`pnpm run build\` before staging the package.`);
  }
}

export async function buildDistribution(options = {}) {
  const outputRoot = resolve(options.outputRoot ?? join(tmpdir(), `figma-mcp-free-stage-${process.pid}`));
  const packageDir = join(outputRoot, "package");
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(packageDir, { recursive: true });

  const cliManifest = await readJson(join(cliRoot, "package.json"));
  const packageRecords = [];
  for (const directory of internalPackageDirectories) {
    const sourceDir = join(packagesRoot, directory);
    const manifest = await readJson(join(sourceDir, "package.json"));
    packageRecords.push({ directory, sourceDir, manifest });
  }

  const versions = new Map([[cliManifest.name, cliManifest.version]]);
  for (const record of packageRecords) versions.set(record.manifest.name, record.manifest.version);
  const internalNames = new Set(packageRecords.map((record) => record.manifest.name));

  await assertBuilt(join(cliRoot, "dist"), "CLI distribution");
  await copyIfPresent(join(cliRoot, "dist"), join(packageDir, "dist"));
  await copyIfPresent(join(cliRoot, "README.md"), join(packageDir, "README.md"));
  await copyIfPresent(join(cliRoot, "LICENSE"), join(packageDir, "LICENSE"));
  await copyIfPresent(join(root, "examples", "sample-node.json"), join(packageDir, "examples", "sample-node.json"));
  await copyIfPresent(join(root, "examples", "sample-tokens.json"), join(packageDir, "examples", "sample-tokens.json"));

  for (const filename of ["code.js", "ui.html", "manifest.template.json", "README.md"]) {
    await copyIfPresent(join(pluginRoot, filename), join(packageDir, "plugin", filename));
  }

  const executableFiles = {
    "figma-mcp-free.js": "launcher.mjs",
    "figma-mcp-free-mcp.js": "mcp-entry.mjs",
    "figma-mcp-free-plugin.js": "plugin-cli.mjs"
  };
  for (const [targetName, sourceName] of Object.entries(executableFiles)) {
    const target = join(packageDir, "bin", targetName);
    await copyIfPresent(join(distributionRoot, sourceName), target);
    await chmod(target, 0o755);
  }

  const externalDependencies = new Map();
  recordExternalDependencies(externalDependencies, cliManifest.dependencies, internalNames);
  recordExternalDependencies(externalDependencies, cliManifest.optionalDependencies, internalNames);

  for (const record of packageRecords) {
    const { manifest, sourceDir } = record;
    await assertBuilt(join(sourceDir, "dist"), manifest.name);
    const targetDir = join(packageDir, "node_modules", ...manifest.name.split("/"));
    await mkdir(targetDir, { recursive: true });
    await copyIfPresent(join(sourceDir, "dist"), join(targetDir, "dist"));
    await copyIfPresent(join(sourceDir, "README.md"), join(targetDir, "README.md"));
    await copyIfPresent(join(sourceDir, "LICENSE"), join(targetDir, "LICENSE"));
    await writeFile(
      join(targetDir, "package.json"),
      `${JSON.stringify(sanitizeInternalManifest(manifest, versions), null, 2)}\n`,
      "utf8"
    );
    recordExternalDependencies(externalDependencies, manifest.dependencies, internalNames);
    recordExternalDependencies(externalDependencies, manifest.optionalDependencies, internalNames);
    recordExternalDependencies(externalDependencies, manifest.peerDependencies, internalNames);
  }

  const dependencies = Object.fromEntries([
    ...[...internalNames].sort().map((name) => [name, versions.get(name)]),
    ...[...externalDependencies.entries()].sort(([left], [right]) => left.localeCompare(right))
  ]);

  const publicManifest = {
    name: "figma-mcp-free",
    version: cliManifest.version,
    description: "Quota-aware, read-only Figma MCP and CLI with a PAT-free local Plugin bridge",
    type: "module",
    files: ["bin", "dist", "plugin", "examples", "node_modules", "README.md", "LICENSE", "BUILD_INFO.json"],
    bin: {
      "figma-mcp-free": "./bin/figma-mcp-free.js",
      "figma-mcp-free-cli": "./dist/index.js",
      "figma-mcp-free-bridge": "./dist/bridge-cli.js",
      "figma-mcp-free-mcp": "./bin/figma-mcp-free-mcp.js",
      "figma-mcp-free-plugin": "./bin/figma-mcp-free-plugin.js"
    },
    main: "./dist/index.js",
    types: "./dist/index.d.ts",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js"
      },
      "./package.json": "./package.json"
    },
    engines: cliManifest.engines ?? { node: ">=18" },
    license: cliManifest.license ?? "MIT",
    repository: cliManifest.repository,
    homepage: cliManifest.homepage,
    bugs: cliManifest.bugs,
    keywords: [
      "figma",
      "mcp",
      "model-context-protocol",
      "design-tokens",
      "code-generation",
      "local-plugin",
      "read-only"
    ],
    publishConfig: { access: "public" },
    dependencies,
    bundledDependencies: [...internalNames].sort()
  };

  await writeFile(join(packageDir, "package.json"), `${JSON.stringify(publicManifest, null, 2)}\n`, "utf8");
  await writeFile(
    join(packageDir, "BUILD_INFO.json"),
    `${JSON.stringify({ schemaVersion: 1, sourceCommit: currentCommit(), version: publicManifest.version }, null, 2)}\n`,
    "utf8"
  );

  const stagedManifests = [join(packageDir, "package.json")];
  for (const record of packageRecords) {
    stagedManifests.push(join(packageDir, "node_modules", ...record.manifest.name.split("/"), "package.json"));
  }
  for (const path of stagedManifests) {
    const text = await readFile(path, "utf8");
    if (text.includes("workspace:")) throw new Error(`Staged manifest still contains a workspace protocol: ${path}`);
  }

  return { outputRoot, packageDir, manifest: publicManifest };
}

const invokedDirectly = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const outputIndex = process.argv.indexOf("--output-root");
  const outputRoot = outputIndex >= 0 ? process.argv[outputIndex + 1] : undefined;
  const result = await buildDistribution({ outputRoot });
  console.log(JSON.stringify({ packageDir: result.packageDir, name: result.manifest.name, version: result.manifest.version }, null, 2));
}
