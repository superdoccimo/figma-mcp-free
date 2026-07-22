import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { generateCode } from "../packages/code-generator/dist/index.js";
import { toDesignTokens } from "../packages/design-tokens/dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sampleNode = JSON.parse(readFileSync(join(root, "examples", "sample-node.json"), "utf8"));

for (const framework of ["react", "vue", "svelte", "html"]) {
  test(`${framework} output matches the fixture`, () => {
    const expected = readFileSync(join(root, "tests", "fixtures", `generated-${framework}.txt`), "utf8").trimEnd();
    assert.equal(generateCode(sampleNode, framework).trimEnd(), expected);
  });
}

test("design token export remains deterministic", () => {
  const tokens = toDesignTokens({ document: sampleNode });
  assert.equal(tokens.$schema, "https://design-tokens.github.io/community-group/format/module.v1.json");
  assert.deepEqual(tokens.color?.["demo-text"], { value: "#122133", type: "color" });
  assert.deepEqual(tokens.size?.["demo-text-width"], { value: 200, type: "dimension" });
  assert.equal(tokens.typography?.["demo-text"].value.fontFamily, "Inter");
});
