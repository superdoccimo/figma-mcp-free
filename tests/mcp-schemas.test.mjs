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

const forbiddenBridgeCredentialKeys = new Set([
  "token",
  "bridgeToken",
  "pairingToken",
  "secret",
  "credential",
  "credentials",
  "url",
  "baseUrl",
  "bridgeUrl"
].map((key) => key.toLowerCase()));

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

test("plugin bridge schemas expose no bridge credentials to the model", () => {
  const pluginTools = [
    "get_plugin_bridge_status",
    "list_current_selections",
    "get_current_selection",
    "inspect_current_selection",
    "generate_current_selection"
  ];
  for (const tool of pluginTools) {
    assert.ok(tool in publicToolSchemas);
    const keys = Object.keys(publicToolSchemas[tool]);
    assert.deepEqual(
      keys.filter((key) => forbiddenBridgeCredentialKeys.has(key.toLowerCase())),
      [],
      `${tool} must not accept a bridge URL or pairing credential`
    );
  }
  assert.deepEqual(publicToolSchemas.get_plugin_bridge_status, {});
  assert.deepEqual(publicToolSchemas.list_current_selections, {});
  assert.ok("tokens" in publicToolSchemas.generate_current_selection, "Design-token substitution remains a legitimate generation input.");
});

test("plugin selection indexes and inspection limits are bounded", () => {
  const current = publicToolSchemas.get_current_selection;
  assert.equal(current.index.safeParse(0).success, true);
  assert.equal(current.index.safeParse(49).success, true);
  assert.equal(current.index.safeParse(50).success, false);

  const inspect = publicToolSchemas.inspect_current_selection;
  assert.equal(inspect.depth.safeParse(5).success, true);
  assert.equal(inspect.depth.safeParse(6).success, false);
  assert.equal(inspect.maxChildren.safeParse(100).success, true);
  assert.equal(inspect.maxChildren.safeParse(101).success, false);
});

test("cache control tools are public and require no inputs", () => {
  assert.deepEqual(publicToolSchemas.get_cache_stats, {});
  assert.deepEqual(publicToolSchemas.clear_cache, {});
});
