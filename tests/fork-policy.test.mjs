import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const checker = fileURLToPath(new URL("../tools/check-fork-compat.mjs", import.meta.url));

function run(repository) {
  const output = execFileSync(process.execPath, [checker, "--json"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_REPOSITORY: repository
    }
  });
  return JSON.parse(output);
}

test("fork policy passes in canonical repository context", () => {
  const report = run("superdoccimo/figma-mcp-free");
  assert.equal(report.mode, "upstream");
  assert.equal(report.isFork, false);
  assert.deepEqual(report.errors, []);
});

test("fork policy passes without upstream secrets or owner-specific runtime source", () => {
  const report = run("example-maintainer/figma-mcp-free");
  assert.equal(report.mode, "fork");
  assert.equal(report.isFork, true);
  assert.equal(report.currentRepository, "example-maintainer/figma-mcp-free");
  assert.deepEqual(report.errors, []);
});
