import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { doctorMessageForStatus } from "../packages/cli/dist/doctor.js";

const cli = join(process.cwd(), "packages", "cli", "dist", "index.js");

function isolatedEnv(token) {
  const configHome = mkdtempSync(join(tmpdir(), "figma-mcp-free-test-"));
  const env = { ...process.env, APPDATA: configHome, XDG_CONFIG_HOME: configHome };
  if (token) env.FIGMA_TOKEN = token;
  else delete env.FIGMA_TOKEN;
  return { env, configHome };
}

test("doctor reports token state without exposing the token", () => {
  const secret = "test-token-must-never-appear";
  const { env, configHome } = isolatedEnv(secret);
  try {
    const result = spawnSync(process.execPath, [cli, "doctor", "--json"], { encoding: "utf8", env });
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, new RegExp(secret));
    const report = JSON.parse(result.stdout);
    assert.equal(report.readOnly, true);
    assert.equal(report.checks.find((check) => check.id === "env_token").status, "pass");
  } finally {
    rmSync(configHome, { recursive: true, force: true });
  }
});

test("commands fail clearly when no token is configured", () => {
  const { env, configHome } = isolatedEnv();
  try {
    const result = spawnSync(process.execPath, [cli, "generate", "FILE", "1:2"], { encoding: "utf8", env });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Token not set/);
  } finally {
    rmSync(configHome, { recursive: true, force: true });
  }
});

test("init and config status never print token fragments", () => {
  const secret = "sensitive-value-123456789";
  const { env, configHome } = isolatedEnv();
  try {
    const init = spawnSync(process.execPath, [cli, "init", "--token", secret], { encoding: "utf8", env });
    assert.equal(init.status, 0, init.stderr);
    const status = spawnSync(process.execPath, [cli, "config", "get", "token"], { encoding: "utf8", env });
    assert.equal(status.status, 0, status.stderr);
    const logs = `${init.stdout}${init.stderr}${status.stdout}${status.stderr}`;
    assert.doesNotMatch(logs, /sensitive|6789/);
    assert.match(status.stdout, /Token: \(set\)/);
  } finally {
    rmSync(configHome, { recursive: true, force: true });
  }
});

test("doctor rejects /slides and normalizes manual node IDs", () => {
  const first = isolatedEnv();
  try {
    const slides = spawnSync(process.execPath, [cli, "doctor", "https://figma.com/slides/FILE/Deck?node-id=1-2", "--json"], { encoding: "utf8", env: first.env });
    assert.equal(slides.status, 1);
    assert.match(slides.stdout, /\/slides links are not supported/);
  } finally {
    rmSync(first.configHome, { recursive: true, force: true });
  }

  const second = isolatedEnv();
  try {
    const manual = spawnSync(process.execPath, [cli, "doctor", "--file-id", "FILE", "--node-id", "1-2", "--json"], { encoding: "utf8", env: second.env });
    assert.equal(manual.status, 0, manual.stderr);
    assert.match(manual.stdout, /Normalized node ID to 1:2/);
  } finally {
    rmSync(second.configHome, { recursive: true, force: true });
  }
});

test("doctor maps common Figma API statuses to actionable explanations", () => {
  assert.match(doctorMessageForStatus(401), /Token was rejected/);
  assert.match(doctorMessageForStatus(403), /Access denied/);
  assert.match(doctorMessageForStatus(404), /not found/);
  assert.match(doctorMessageForStatus(429), /Retry-After/);
  assert.match(doctorMessageForStatus(503), /temporarily unavailable/);
});
