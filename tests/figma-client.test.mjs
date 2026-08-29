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
    const fetchImpl = async () => new Response(JSON.stringify({ message: "sample failure" }), {
      status,
      headers: { "content-type": "application/json" }
    });
    const client = new FigmaClient({ token: "test-token", maxRetries: 0, fetchImpl });
    await assert.rejects(client.getFile("FILE"), (error) => {
      assert.ok(error instanceof FigmaApiError);
      assert.equal(error.status, status);
      assert.doesNotMatch(error.message, /test-token/);
      return true;
    });
  });
}

test("honors short Retry-After before retrying a rate-limited request", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return new Response("{}", { status: 429, headers: { "retry-after": "0" } });
    return new Response(JSON.stringify({ name: "File", document: { id: "0:0", name: "Document", type: "DOCUMENT" } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  const client = new FigmaClient({ token: "test-token", maxRetries: 1, retryDelayMs: 5000, fetchImpl });
  const file = await client.getFile("FILE");
  assert.equal(file.name, "File");
  assert.equal(calls, 2);
  assert.equal(client.getStats().retries, 1);
});

test("surfaces long rate limits and Figma plan metadata without wasting retries", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response("{}", {
      status: 429,
      headers: {
        "retry-after": "120",
        "x-figma-plan-tier": "starter",
        "x-figma-rate-limit-type": "low",
        "x-figma-upgrade-link": "https://www.figma.com/pricing"
      }
    });
  };
  const client = new FigmaClient({
    token: "test-token",
    maxRetries: 3,
    maxAutomaticRetryAfterMs: 30000,
    fetchImpl
  });
  await assert.rejects(client.getFile("FILE"), (error) => {
    assert.ok(error instanceof FigmaApiError);
    assert.equal(error.retryAfterMs, 120000);
    assert.equal(error.planTier, "starter");
    assert.equal(error.rateLimitType, "low");
    assert.equal(error.upgradeUrl, "https://www.figma.com/pricing");
    return true;
  });
  assert.equal(calls, 1);
});

test("batch-fetches normalized node IDs in one request", async () => {
  let requestedUrl = "";
  const fetchImpl = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({
      nodes: {
        "1:2": { document: { id: "1:2", name: "One", type: "FRAME" } },
        "3:4": { document: { id: "3:4", name: "Two", type: "TEXT" } }
      }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new FigmaClient({ token: "test-token", fetchImpl });
  const nodes = await client.getNodes("FILE", ["1-2", "3:4", "1:2"], 2);
  assert.deepEqual(Object.keys(nodes), ["1:2", "3:4"]);
  assert.equal(nodes["3:4"]?.name, "Two");
  assert.match(decodeURIComponent(requestedUrl), /ids=1:2,3:4/);
  assert.match(requestedUrl, /depth=2/);
  assert.equal(client.getStats().networkRequests, 1);
});

test("getNode delegates to the batch endpoint", async () => {
  let requestedUrl = "";
  const fetchImpl = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({
      nodes: { "1:2": { document: { id: "1:2", name: "Node", type: "FRAME" } } }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new FigmaClient({ token: "test-token", fetchImpl });
  const node = await client.getNode("FILE", "1-2", 2);
  assert.equal(node?.id, "1:2");
  assert.match(requestedUrl, /ids=1%3A2/);
});

test("caches successful responses and supports explicit refresh", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      name: `File ${calls}`,
      document: { id: "0:0", name: "Document", type: "DOCUMENT" }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new FigmaClient({ token: "test-token", cacheTtlMs: 60000, fetchImpl });
  assert.equal((await client.getFile("FILE")).name, "File 1");
  assert.equal((await client.getFile("FILE")).name, "File 1");
  assert.equal(calls, 1);
  assert.equal((await client.getFile("FILE", undefined, { cache: "reload" })).name, "File 2");
  assert.equal(calls, 2);
  assert.deepEqual(client.getStats(), {
    cacheHits: 1,
    cacheMisses: 1,
    networkRequests: 2,
    retries: 0,
    inFlightJoins: 0,
    cacheEntries: 1
  });
});

test("joins identical in-flight reads", async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const fetchImpl = async () => {
    calls += 1;
    await gate;
    return new Response(JSON.stringify({ name: "File", document: { id: "0:0", name: "Document", type: "DOCUMENT" } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  const client = new FigmaClient({ token: "test-token", fetchImpl });
  const first = client.getFile("FILE");
  const second = client.getFile("FILE");
  release();
  await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.equal(client.getStats().inFlightJoins, 1);
});

test("aborts requests that exceed the configured timeout", async () => {
  const fetchImpl = async (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });
  const client = new FigmaClient({ token: "test-token", requestTimeoutMs: 5, maxRetries: 0, fetchImpl });
  await assert.rejects(client.getFile("FILE"), /timed out/);
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
