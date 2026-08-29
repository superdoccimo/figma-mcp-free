import assert from "node:assert/strict";
import test from "node:test";
import { publicToolSchemas } from "../packages/mcp-server/dist/tool-schemas.js";

const expectedCompatibleSchemas = {
  get_file: ["fileId", "figmaUrl", "depth", "refresh"],
  get_components: ["fileId", "figmaUrl", "q", "limit", "refresh"],
  list_frames: ["fileId", "figmaUrl", "depth", "refresh"],
  export_tokens: ["fileId", "figmaUrl", "refresh"],
  generate_code: ["fileId", "figmaUrl", "nodeId", "framework", "tokens", "varPrefix", "refresh"]
};

test("existing MCP tool names retain existing keys and only add optional refresh", () => {
  for (const [tool, keys] of Object.entries(expectedCompatibleSchemas)) {
    assert.ok(tool in publicToolSchemas);
    assert.deepEqual(Object.keys(publicToolSchemas[tool]), keys);
    assert.equal(publicToolSchemas[tool].refresh.safeParse(undefined).success, true);
  }
});

test("inspect_selection exposes bounded optional controls", () => {
  const schema = publicToolSchemas.inspect_selection;
  assert.deepEqual(Object.keys(schema), ["fileId", "figmaUrl", "nodeId", "depth", "maxChildren", "refresh"]);
  assert.equal(schema.depth.safeParse(5).success, true);
  assert.equal(schema.depth.safeParse(6).success, false);
  assert.equal(schema.maxChildren.safeParse(100).success, true);
  assert.equal(schema.maxChildren.safeParse(101).success, false);
});

test("get_nodes enforces a bounded non-empty batch", () => {
  const schema = publicToolSchemas.get_nodes;
  assert.equal(schema.nodeIds.safeParse([]).success, false);
  assert.equal(schema.nodeIds.safeParse(["1:2", "3:4"]).success, true);
  assert.equal(schema.nodeIds.safeParse(Array.from({ length: 501 }, (_, i) => String(i))).success, false);
});

test("cache control tools are public and require no inputs", () => {
  assert.deepEqual(publicToolSchemas.get_cache_stats, {});
  assert.deepEqual(publicToolSchemas.clear_cache, {});
});
