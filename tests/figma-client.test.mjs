import assert from "node:assert/strict";
import test from "node:test";
import {
  FigmaApiError,
  FigmaClient,
  inspectSelection,
  normalizeFigmaNodeId,
  parseFigmaUrl,
  resolveFigmaReference,
  resolveInspectSelectionLimits
} from "../packages/figma-client/dist/index.js";

test("parses /file URLs and normalizes node-id", () => {
  assert.deepEqual(
    parseFigmaUrl("https://www.figma.com/file/FILE123/Example?node-id=1-2"),
    { fileId: "FILE123", nodeId: "1:2", urlType: "file" }
  );
});

test("parses /design URLs and URL-encoded node IDs", () => {
  assert.deepEqual(
    parseFigmaUrl("https://figma.com/design/FILE456/Example?node-id=12%3A34"),
    { fileId: "FILE456", nodeId: "12:34", urlType: "design" }
  );
  assert.equal(normalizeFigmaNodeId("12%3A34"), "12:34");
});

test("rejects /slides URLs with a clear message", () => {
  assert.throws(
    () => parseFigmaUrl("https://www.figma.com/slides/FILE789/Deck?node-id=1-2"),
    /\/slides links are not supported/
  );
});

test("accepts manual file and node IDs", () => {
  assert.deepEqual(resolveFigmaReference("FILE999", "7-8"), { fileId: "FILE999", nodeId: "7:8" });
});

for (const status of [401, 403, 404, 429, 500]) {
  test(`converts HTTP ${status} into FigmaApiError`, async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ message: "sample failure" }), {
      status,
      headers: { "content-type": "application/json" }
    });
    try {
      const client = new FigmaClient({ token: "test-token", maxRetries: 0 });
      await assert.rejects(client.getFile("FILE"), (error) => {
        assert.ok(error instanceof FigmaApiError);
        assert.equal(error.status, status);
        assert.doesNotMatch(error.message, /test-token/);
        return true;
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}

test("honors Retry-After before retrying a rate-limited request", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return new Response("{}", { status: 429, headers: { "retry-after": "0" } });
    }
    return new Response(JSON.stringify({ name: "File", document: { id: "0:0", name: "Document", type: "DOCUMENT" } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const client = new FigmaClient({ token: "test-token", maxRetries: 1, retryDelayMs: 5000 });
    const file = await client.getFile("FILE");
    assert.equal(file.name, "File");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requests normalized node ID and depth", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({
      nodes: { "1:2": { document: { id: "1:2", name: "Node", type: "FRAME" } } }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const client = new FigmaClient({ token: "test-token" });
    const node = await client.getNode("FILE", "1-2", 2);
    assert.equal(node?.id, "1:2");
    assert.match(requestedUrl, /ids=1%3A2/);
    assert.match(requestedUrl, /depth=2/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("inspectSelection returns a stable compact schema and enforces limits", () => {
  const makeChild = (id) => ({
    id,
    name: `Child ${id}`,
    type: "TEXT",
    characters: "Label",
    style: { fontFamily: "Inter", fontSize: 16, fontWeight: 600, lineHeightPx: 20, letterSpacing: 0 },
    children: [{ id: `${id}:1`, name: "Grandchild", type: "RECTANGLE" }]
  });
  const node = {
    id: "1:2",
    name: "Selected card",
    type: "FRAME",
    absoluteBoundingBox: { x: 10, y: 20, width: 320, height: 180 },
    layoutMode: "VERTICAL",
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    fills: [{ type: "IMAGE", imageRef: "not-exposed" }],
    componentId: "9:9",
    componentProperties: { State: { type: "VARIANT", value: "Default" } },
    children: [makeChild("2:1"), makeChild("2:2")]
  };

  const result = inspectSelection(node, { fileId: "FILE", nodeId: "1:2", depth: 1, maxChildren: 1 });
  assert.equal(result.schemaVersion, "1");
  assert.deepEqual(result.limits, { depth: 1, maxChildren: 1 });
  assert.equal(result.selection.width, 320);
  assert.equal(result.selection.hasImageReference, true);
  assert.equal(JSON.stringify(result).includes("not-exposed"), false);
  assert.equal(result.selection.children.length, 1);
  assert.equal(result.selection.children[0].children.length, 0);
  assert.equal(result.selection.children[0].text.fontFamily, "Inter");
  assert.deepEqual(result.selection.component, { id: "9:9", properties: { State: "Default" } });
  assert.match(result.selection.unsupported.join(" "), /maxChildren/);
  assert.match(result.selection.children[0].unsupported.join(" "), /depth limit/);
});

test("inspect selection defaults and maximums are bounded", () => {
  assert.deepEqual(resolveInspectSelectionLimits({}), { depth: 2, maxChildren: 20 });
  assert.deepEqual(resolveInspectSelectionLimits({ depth: 99, maxChildren: 999 }), { depth: 5, maxChildren: 100 });
});
