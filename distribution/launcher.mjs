#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const commands = new Map([
  ["cli", join(packageRoot, "dist", "index.js")],
  ["bridge", join(packageRoot, "dist", "bridge-cli.js")],
  ["mcp", join(packageRoot, "bin", "figma-mcp-free-mcp.js")],
  ["plugin", join(packageRoot, "bin", "figma-mcp-free-plugin.js")]
]);

const requested = process.argv[2];
const target = commands.get(requested) ?? commands.get("cli");
const args = commands.has(requested) ? process.argv.slice(3) : process.argv.slice(2);
const child = spawn(process.execPath, [target, ...args], {
  stdio: "inherit",
  env: process.env,
  windowsHide: true
});

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    try { child.kill(signal); } catch { child.kill(); }
  });
}

child.once("error", (error) => {
  console.error(`Unable to start figma-mcp-free: ${error.message}`);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
