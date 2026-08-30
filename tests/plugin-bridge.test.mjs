import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import {
  PluginBridgeClient,
  PluginBridgeError,
  isLoopbackHostname,
  startPluginBridgeServer
} from "../packages/figma-client/dist/plugin-bridge.js";

const TOKEN = "test-pairing-token-1234567890-abcdef";
const samplePayload = {
  fileName: "Example file",
  pageName: "Components",
  selections: [
    {
      id: "1:2",
      name: "Card",
      type: "FRAME",
      document: {
        id: "1:2",
        name: "Card",
        type: "FRAME",
        children: [{ id: "1:3", name: "Title", type: "TEXT", characters: "Hello" }]
      }
    }
  ]
};

function headers(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

function rawRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: options.method || "GET",
      headers: options.headers
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    });
    request.on("error", reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

function nestedDocument(depth) {
  const root = { id: "1:0", name: "Root", type: "FRAME", children: [] };
  let current = root;
  for (let index = 1; index <= depth; index += 1) {
    const child = { id: `1:${index}`, name: `Node ${index}`, type: "FRAME", children: [] };
    current.children.push(child);
    current = child;
  }
  return root;
}

test("recognizes loopback hostnames only", () => {
  assert.equal(isLoopbackHostname("localhost"), true);
  assert.equal(isLoopbackHostname("127.0.0.1"), true);
  assert.equal(isLoopbackHostname("[::1]"), true);
  assert.equal(isLoopbackHostname("example.com"), false);
});

test("bridge rejects non-loopback binds and weak tokens", async () => {
  await assert.rejects(
    startPluginBridgeServer({ host: "0.0.0.0", port: 0, token: TOKEN }),
    /loopback/
  );
  await assert.rejects(
    startPluginBridgeServer({ port: 0, token: "short" }),
    /at least 32 characters/
  );
});

test("bridge requires authentication and keeps one snapshot in memory", async () => {
  const handle = await startPluginBridgeServer({ port: 0, token: TOKEN });
  try {
    const unauthorized = await fetch(`${handle.url}/health`);
    assert.equal(unauthorized.status, 401);
    assert.doesNotMatch(await unauthorized.text(), /test-pairing-token/);

    const client = new PluginBridgeClient({ baseUrl: handle.url, token: handle.token });
    const emptyHealth = await client.health();
    assert.equal(emptyHealth.ok, true);
    assert.equal(emptyHealth.schemaVersion, 1);
    assert.equal(emptyHealth.sessionId, handle.sessionId);
    assert.equal(emptyHealth.hasSnapshot, false);
    assert.equal(emptyHealth.selectionCount, 0);

    const posted = await fetch(`${handle.url}/v1/snapshot`, {
      method: "POST",
      headers: headers(handle.token, { "Content-Type": "application/json" }),
      body: JSON.stringify(samplePayload)
    });
    assert.equal(posted.status, 201);
    assert.equal(posted.headers.get("access-control-allow-origin"), "*");
    assert.equal(posted.headers.get("cache-control"), "no-store");
    const receipt = await posted.json();
    assert.equal(receipt.accepted, true);
    assert.equal(receipt.sessionId, handle.sessionId);
    assert.equal(receipt.selectionCount, 1);

    const snapshot = await client.getSnapshot();
    assert.equal(snapshot.schemaVersion, 1);
    assert.equal(snapshot.source, "figma-plugin");
    assert.equal(snapshot.sessionId, handle.sessionId);
    assert.equal(snapshot.fileName, "Example file");
    assert.equal(snapshot.selections[0].document.children[0].characters, "Hello");
    assert.match(snapshot.capturedAt, /^\d{4}-\d{2}-\d{2}T/);

    const cleared = await client.clearSnapshot();
    assert.deepEqual(cleared, { cleared: true, sessionId: handle.sessionId });
    await assert.rejects(client.getSnapshot(), (error) => {
      assert.ok(error instanceof PluginBridgeError);
      assert.equal(error.status, 404);
      return true;
    });
  } finally {
    await handle.close();
  }
});

test("bridge rejects DNS-rebinding style Host headers", async () => {
  const handle = await startPluginBridgeServer({ port: 0, token: TOKEN });
  try {
    const response = await rawRequest(`${handle.url}/health`, {
      headers: { Host: "attacker.example", Authorization: `Bearer ${TOKEN}` }
    });
    assert.equal(response.status, 403);
  } finally {
    await handle.close();
  }
});

test("bridge requires JSON and validates identity, depth, and node limits", async () => {
  const handle = await startPluginBridgeServer({
    port: 0,
    token: TOKEN,
    maxSelections: 1,
    maxNodes: 2,
    maxDepth: 1
  });
  try {
    const wrongType = await fetch(`${handle.url}/v1/snapshot`, {
      method: "POST",
      headers: headers(handle.token, { "Content-Type": "text/plain" }),
      body: JSON.stringify(samplePayload)
    });
    assert.equal(wrongType.status, 415);

    const mismatchedId = structuredClone(samplePayload);
    mismatchedId.selections[0].document.id = "9:9";
    const mismatch = await fetch(`${handle.url}/v1/snapshot`, {
      method: "POST",
      headers: headers(handle.token, { "Content-Type": "application/json" }),
      body: JSON.stringify(mismatchedId)
    });
    assert.equal(mismatch.status, 400);

    const deep = structuredClone(samplePayload);
    deep.selections[0].document = nestedDocument(2);
    deep.selections[0].id = "1:0";
    const tooDeep = await fetch(`${handle.url}/v1/snapshot`, {
      method: "POST",
      headers: headers(handle.token, { "Content-Type": "application/json" }),
      body: JSON.stringify(deep)
    });
    assert.equal(tooDeep.status, 400);

    const many = structuredClone(samplePayload);
    many.selections[0].document = {
      id: "1:2",
      name: "Card",
      type: "FRAME",
      children: [
        { id: "1:3", name: "A", type: "TEXT" },
        { id: "1:4", name: "B", type: "TEXT" }
      ]
    };
    const tooManyNodes = await fetch(`${handle.url}/v1/snapshot`, {
      method: "POST",
      headers: headers(handle.token, { "Content-Type": "application/json" }),
      body: JSON.stringify(many)
    });
    assert.equal(tooManyNodes.status, 400);
  } finally {
    await handle.close();
  }
});

test("bridge enforces a bounded request body", async () => {
  const handle = await startPluginBridgeServer({ port: 0, token: TOKEN, maxBodyBytes: 256 });
  try {
    const response = await fetch(`${handle.url}/v1/snapshot`, {
      method: "POST",
      headers: headers(handle.token, { "Content-Type": "application/json" }),
      body: JSON.stringify({ ...samplePayload, padding: "x".repeat(1000) })
    });
    assert.equal(response.status, 413);
  } finally {
    await handle.close();
  }
});

test("client accepts only a credential-free loopback origin", () => {
  assert.throws(
    () => new PluginBridgeClient({ baseUrl: "https://127.0.0.1:3845", token: TOKEN }),
    /must use http/
  );
  assert.throws(
    () => new PluginBridgeClient({ baseUrl: "http://example.com:3845", token: TOKEN }),
    /refuses non-loopback/
  );
  assert.throws(
    () => new PluginBridgeClient({ baseUrl: "http://user:pass@127.0.0.1:3845", token: TOKEN }),
    /must not contain credentials/
  );
  assert.throws(
    () => new PluginBridgeClient({ baseUrl: "http://127.0.0.1:3845/path", token: TOKEN }),
    /without a path/
  );
});

test("client refuses redirects and reports request timeouts", async () => {
  const redirectClient = new PluginBridgeClient({
    baseUrl: "http://127.0.0.1:3845",
    token: TOKEN,
    fetchImpl: async (_input, init) => {
      assert.equal(init.redirect, "error");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });
  await redirectClient.health();

  const timeoutClient = new PluginBridgeClient({
    baseUrl: "http://127.0.0.1:3845",
    token: TOKEN,
    timeoutMs: 5,
    fetchImpl: async (_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })
  });
  await assert.rejects(timeoutClient.health(), /timed out/);
});
