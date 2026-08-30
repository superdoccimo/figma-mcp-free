import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { packDistribution } from "./pack-distribution.mjs";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: options.capture === false ? "inherit" : ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  if (result.status !== 0) {
    throw new Error([
      `Command failed (${result.status}): ${command} ${args.join(" ")}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join("\n"));
  }
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function runInstalled(launcher, args, options = {}) {
  return run(process.execPath, [launcher, ...args], options);
}

async function assertMcpStarts(launcher, cwd) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [launcher, "mcp"], {
      cwd,
      env: { ...process.env, FIGMA_TOKEN: "" },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    let stderr = "";
    let finished = false;
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { stderr += chunk; });

    const finish = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(startTimer);
      clearTimeout(killTimer);
      if (error) reject(error);
      else resolvePromise();
    };

    child.once("error", (error) => finish(error));
    child.once("exit", (code) => {
      if (!finished) finish(new Error(`MCP process exited before the smoke window with code ${code}.\n${stderr}`));
    });

    const startTimer = setTimeout(() => {
      try { child.kill("SIGTERM"); } catch { child.kill(); }
    }, 750);
    const killTimer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch { child.kill(); }
      finish();
    }, 2500);
    child.once("close", () => {
      if (!finished) finish();
    });
  });
}

export async function smokeDistribution() {
  const workRoot = mkdtempSync(join(tmpdir(), "figma-mcp-free-smoke-"));
  const installRoot = join(workRoot, "consumer");
  try {
    const packed = await packDistribution({ workRoot: join(workRoot, "pack") });
    await mkdir(installRoot, { recursive: true });
    await writeFile(join(installRoot, "package.json"), `${JSON.stringify({ private: true }, null, 2)}\n`, "utf8");
    run(npmCommand, [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      packed.tarballPath
    ], { cwd: installRoot });

    const installedRoot = join(installRoot, "node_modules", "figma-mcp-free");
    const installedManifest = JSON.parse(await readFile(join(installedRoot, "package.json"), "utf8"));
    if (installedManifest.version !== packed.releaseManifest.version) {
      throw new Error(`Installed version ${installedManifest.version} does not match ${packed.releaseManifest.version}.`);
    }
    for (const name of packed.releaseManifest.bundledDependencies) {
      const packagePath = join(installedRoot, "node_modules", ...name.split("/"), "package.json");
      const manifest = JSON.parse(await readFile(packagePath, "utf8"));
      if (manifest.name !== name) throw new Error(`Bundled package identity mismatch for ${name}.`);
    }

    const launcher = join(installedRoot, installedManifest.bin["figma-mcp-free"]);
    const help = runInstalled(launcher, ["--help"], { cwd: installRoot });
    if (!/figma-mcp-free/i.test(help.stdout)) throw new Error("The installed CLI help output is missing its identity.");
    runInstalled(launcher, ["bridge", "--help"], { cwd: installRoot });
    runInstalled(launcher, ["plugin", "--help"], { cwd: installRoot });

    const generated = runInstalled(launcher, [
      "generate-from-json",
      join(installedRoot, "examples", "sample-node.json"),
      "--framework",
      "react",
      "--use-tokens",
      join(installedRoot, "examples", "sample-tokens.json")
    ], { cwd: installRoot });
    if (!/export|function|const/.test(generated.stdout)) {
      throw new Error("Offline generation did not produce recognizable starter code.");
    }

    const pluginDir = join(workRoot, "plugin");
    runInstalled(launcher, [
      "plugin",
      "create-manifest",
      "123456789",
      "--port",
      "49152",
      "--out-dir",
      pluginDir,
      "--json"
    ], { cwd: installRoot });
    runInstalled(launcher, ["plugin", "verify", pluginDir, "--json"], { cwd: installRoot });
    const pluginManifest = JSON.parse(await readFile(join(pluginDir, "manifest.json"), "utf8"));
    const expectedOrigins = ["http://127.0.0.1:49152", "http://localhost:49152"];
    if (JSON.stringify(pluginManifest.networkAccess?.devAllowedDomains) !== JSON.stringify(expectedOrigins)) {
      throw new Error("The installed Plugin manifest did not preserve the selected loopback port.");
    }

    await assertMcpStarts(launcher, installRoot);
    return {
      ok: true,
      platform: process.platform,
      node: process.version,
      package: installedManifest.name,
      version: installedManifest.version,
      sha256: packed.releaseManifest.sha256,
      bundledDependencies: packed.releaseManifest.bundledDependencies.length
    };
  } finally {
    if (!process.env.KEEP_FIGMA_MCP_SMOKE) await rm(workRoot, { recursive: true, force: true });
  }
}

const result = await smokeDistribution();
console.log(JSON.stringify(result, null, 2));
