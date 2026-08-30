import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { resolveRepositoryContext } from "./repository-context.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function walk(relativePath) {
  const absolute = path.join(root, relativePath);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await walk(child));
    else files.push(child.replaceAll(path.sep, "/"));
  }
  return files;
}

function fail(errors, message) {
  errors.push(message);
}

function permissionsBlock(workflow) {
  return workflow.match(/^permissions:\s*\n((?:[ \t]+[^\n]*(?:\n|$))*)/m)?.[1] ?? "";
}

const config = await readJson("repo.config.json");
const rootManifest = await readJson("package.json");
const context = resolveRepositoryContext({
  upstreamRepository: config.upstreamRepository,
  cwd: root
});
const errors = [];

if (config.$schema !== "./docs/repo-config.schema.json") {
  fail(errors, "repo.config.json must reference ./docs/repo-config.schema.json.");
}
if (config.schemaVersion !== 1) {
  fail(errors, `Unsupported repo.config.json schemaVersion: ${config.schemaVersion}`);
}
if (!/^@[A-Za-z0-9_.-]+$/.test(config.packageScope)) {
  fail(errors, `Invalid packageScope: ${config.packageScope}`);
}

const requiredScripts = {
  "check:fork": "node tools/check-fork-compat.mjs",
  "fork:audit": "node tools/audit-forks.mjs",
  "fork:audit:json": "node tools/audit-forks.mjs --format json --no-files"
};
for (const [name, command] of Object.entries(requiredScripts)) {
  if (rootManifest.scripts?.[name] !== command) {
    fail(errors, `package.json script ${name} must be exactly: ${command}`);
  }
}
if (!String(rootManifest.scripts?.check ?? "").includes("pnpm run check:fork")) {
  fail(errors, "The complete pnpm check gate must include pnpm run check:fork.");
}
if (!String(rootManifest.scripts?.check ?? "").includes("pnpm run pack:check")) {
  fail(errors, "The complete pnpm check gate must include pnpm run pack:check.");
}

const workflowFiles = (await walk(".github/workflows")).filter((file) => /\.ya?ml$/i.test(file));
for (const file of workflowFiles) {
  const text = await readFile(path.join(root, file), "utf8");
  if (!config.forkPolicy.pullRequestTargetAllowed && /^\s*pull_request_target\s*:/m.test(text)) {
    fail(errors, `${file} uses pull_request_target, which is disabled by the fork policy.`);
  }
  if (config.forkPolicy.ciMustNotRequireSecrets && !/release|publish/i.test(path.basename(file)) && /\$\{\{\s*secrets\./.test(text)) {
    fail(errors, `${file} requires a repository secret in a normal CI workflow.`);
  }
  if (!/^\s*contents:\s*read\s*$/m.test(permissionsBlock(text))) {
    fail(errors, `${file} must declare contents: read in its top-level permissions block.`);
  }
  if (/uses:\s*actions\/checkout@/i.test(text) && !/persist-credentials:\s*false/i.test(text)) {
    fail(errors, `${file} checks out code without persist-credentials: false.`);
  }
  if (!/timeout-minutes:\s*\d+/i.test(text)) {
    fail(errors, `${file} must bound job execution with timeout-minutes.`);
  }
}

const packageManifests = ["package.json", ...(await walk("packages")).filter((file) => file.endsWith("/package.json"))];
for (const file of packageManifests) {
  const manifest = file === "package.json" ? rootManifest : await readJson(file);
  if (file === "package.json") {
    if (manifest.private !== true) fail(errors, "The workspace root must remain private to prevent accidental publication.");
    continue;
  }
  if (manifest.name !== "figma-mcp-free" && !manifest.name?.startsWith(`${config.packageScope}/`)) {
    fail(errors, `${file} has a package name outside ${config.packageScope}: ${manifest.name ?? "<missing>"}`);
  }
}

if (config.forkPolicy.runtimeSourceMustBeOwnerNeutral) {
  const owner = config.upstreamRepository.split("/")[0];
  const runtimeFiles = (await walk("packages")).filter((file) => /\/src\/.*\.(?:ts|tsx|js|mjs|cjs)$/i.test(file));
  const ownerPattern = new RegExp(`\\b${owner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  for (const file of runtimeFiles) {
    const text = await readFile(path.join(root, file), "utf8");
    if (ownerPattern.test(text)) {
      fail(errors, `${file} hard-codes the upstream owner in runtime source.`);
    }
  }
}

const report = {
  ...context,
  defaultBranch: config.defaultBranch,
  packageScope: config.packageScope,
  workflowsChecked: workflowFiles.length,
  packageManifestsChecked: packageManifests.length,
  requiredScriptsChecked: Object.keys(requiredScripts).length,
  errors
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`[fork-check] mode=${report.mode} current=${report.currentRepository ?? "unknown"} upstream=${report.upstreamRepository}`);
  console.log(`[fork-check] checked ${report.workflowsChecked} workflows, ${report.packageManifestsChecked} package manifests, and ${report.requiredScriptsChecked} required scripts`);
  for (const error of errors) console.error(`[fork-check] ERROR: ${error}`);
}

if (errors.length) process.exitCode = 1;
