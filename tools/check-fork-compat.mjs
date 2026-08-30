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

const config = await readJson("repo.config.json");
const context = resolveRepositoryContext({
  upstreamRepository: config.upstreamRepository,
  cwd: root
});
const errors = [];

if (config.schemaVersion !== 1) {
  fail(errors, `Unsupported repo.config.json schemaVersion: ${config.schemaVersion}`);
}

if (!/^@[A-Za-z0-9_.-]+$/.test(config.packageScope)) {
  fail(errors, `Invalid packageScope: ${config.packageScope}`);
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
}

const packageManifests = ["package.json", ...(await walk("packages")).filter((file) => file.endsWith("/package.json"))];
for (const file of packageManifests) {
  const manifest = await readJson(file);
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
  for (const file of runtimeFiles) {
    const text = await readFile(path.join(root, file), "utf8");
    if (new RegExp(`\\b${owner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) {
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
  errors
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`[fork-check] mode=${report.mode} current=${report.currentRepository ?? "unknown"} upstream=${report.upstreamRepository}`);
  console.log(`[fork-check] checked ${report.workflowsChecked} workflows and ${report.packageManifestsChecked} package manifests`);
  for (const error of errors) console.error(`[fork-check] ERROR: ${error}`);
}

if (errors.length) process.exitCode = 1;
