import assert from "node:assert/strict";
import test from "node:test";
import { publicToolSchemas } from "../packages/mcp-server/dist/tool-schemas.js";

const expectedExistingSchemas = {
  get_file: ["fileId", "figmaUrl", "depth"],
  get_components: ["fileId", "figmaUrl", "q", "limit"],
  list_frames: ["fileId", "figmaUrl", "depth"],
  export_tokens: ["fileId", "figmaUrl"],
  generate_code: ["fileId", "figmaUrl", "nodeId", "framework", "tokens", "varPrefix"]
};

test("existing MCP tool names and input keys remain compatible", () => {
  for (const [tool, keys] of Object.entries(expectedExistingSchemas)) {
    assert.ok(tool in publicToolSchemas);
    assert.deepEqual(Object.keys(publicToolSchemas[tool]), keys);
  }
});

test("inspect_selection exposes bounded optional controls", () => {
  const schema = publicToolSchemas.inspect_selection;
  assert.deepEqual(Object.keys(schema), ["fileId", "figmaUrl", "nodeId", "depth", "maxChildren"]);
  assert.equal(schema.depth.safeParse(5).success, true);
  assert.equal(schema.depth.safeParse(6).success, false);
  assert.equal(schema.maxChildren.safeParse(100).success, true);
  assert.equal(schema.maxChildren.safeParse(101).success, false);
});
