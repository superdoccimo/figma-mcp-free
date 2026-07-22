import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const cli = join(process.cwd(), "packages", "cli", "dist", "index.js");
for (const framework of ["react", "vue", "svelte", "html"]) {
  const result = spawnSync(process.execPath, [cli, "generate-from-json", "examples/sample-node.json", "--framework", framework], {
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Hello Figmas!/);
}

console.log("Offline CLI smoke check passed for React, Vue, Svelte, and HTML.");
