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

test("plugin bridge tools keep credentials out of model-visible schemas", () => {
  assert.deepEqual(publicToolSchemas.get_plugin_bridge_status, {});
  assert.deepEqual(Object.keys(publicToolSchemas.get_current_selection), ["index"]);
  assert.deepEqual(Object.keys(publicToolSchemas.inspect_current_selection), ["index", "depth", "maxChildren"]);
  assert.deepEqual(Object.keys(publicToolSchemas.generate_current_selection), ["index", "framework", "tokens", "varPrefix"]);
  for (const name of [
    "get_plugin_bridge_status",
    "get_current_selection",
    "inspect_current_selection",
    "generate_current_selection"
  ]) {
    const keys = Object.keys(publicToolSchemas[name]);
    assert.equal(keys.includes("token"), false);
    assert.equal(keys.includes("url"), false);
  }
});

test("plugin selection indexes and inspection limits are bounded", () => {
  assert.equal(publicToolSchemas.get_current_selection.index.safeParse(0).success, true);
  assert.equal(publicToolSchemas.get_current_selection.index.safeParse(49).success, true);
  assert.equal(publicToolSchemas.get_current_selection.index.safeParse(50).success, false);
  assert.equal(publicToolSchemas.inspect_current_selection.depth.safeParse(5).success, true);
  assert.equal(publicToolSchemas.inspect_current_selection.depth.safeParse(6).success, false);
  assert.equal(publicToolSchemas.inspect_current_selection.maxChildren.safeParse(100).success, true);
  assert.equal(publicToolSchemas.inspect_current_selection.maxChildren.safeParse(101).success, false);
});

test("cache control tools are public and require no inputs", () => {
  assert.deepEqual(publicToolSchemas.get_cache_stats, {});
  assert.deepEqual(publicToolSchemas.clear_cache, {});
});
