import assert from "node:assert/strict";
import test from "node:test";
import {
  PluginBridgeClient,
  PluginBridgeError,
  isLoopbackHostname,
  startPluginBridgeServer
} from "../packages/figma-client/dist/plugin-bridge.js";

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

test("recognizes loopback hostnames only", () => {
  assert.equal(isLoopbackHostname("localhost"), true);
  assert.equal(isLoopbackHostname("127.0.0.1"), true);
  assert.equal(isLoopbackHostname("[::1]"), true);
  assert.equal(isLoopbackHostname("example.com"), false);
});

test("bridge server rejects non-loopback binds and weak tokens", async () => {
  await assert.rejects(
    startPluginBridgeServer({ host: "0.0.0.0", port: 0, token: "a-secure-enough-token" }),
    /loopback/
  );
  await assert.rejects(
    startPluginBridgeServer({ port: 0, token: "short" }),
    /at least 16 characters/
  );
});

test("bridge requires authentication and keeps one snapshot in memory", async () => {
  const handle = await startPluginBridgeServer({ port: 0, token: "test-pairing-token-123456" });
  try {
    const unauthorized = await fetch(`${handle.url}/health`);
    assert.equal(unauthorized.status, 401);
    assert.doesNotMatch(await unauthorized.text(), /test-pairing-token/);

    const client = new PluginBridgeClient({ baseUrl: handle.url, token: handle.token });
    assert.deepEqual(await client.health(), {
      ok: true,
      schemaVersion: 1,
      hasSnapshot: false,
      selectionCount: 0
    });

    const posted = await fetch(`${handle.url}/v1/snapshot`, {
      method: "POST",
      headers: headers(handle.token, { "Content-Type": "application/json" }),
      body: JSON.stringify(samplePayload)
    });
    assert.equal(posted.status, 201);
    const receipt = await posted.json();
    assert.equal(receipt.accepted, true);
    assert.equal(receipt.selectionCount, 1);

    const snapshot = await client.getSnapshot();
    assert.equal(snapshot.schemaVersion, 1);
    assert.equal(snapshot.source, "figma-plugin");
    assert.equal(snapshot.fileName, "Example file");
    assert.equal(snapshot.selections[0].document.children[0].characters, "Hello");
    assert.match(snapshot.capturedAt, /^\d{4}-\d{2}-\d{2}T/);

    assert.equal((await client.health()).selectionCount, 1);
    assert.deepEqual(await client.clearSnapshot(), { cleared: true });
    await assert.rejects(client.getSnapshot(), (error) => {
      assert.ok(error instanceof PluginBridgeError);
      assert.equal(error.status, 404);
      return true;
    });
  } finally {
    await handle.close();
  }
});

test("bridge validates payload shape and selection limits", async () => {
  const handle = await startPluginBridgeServer({ port: 0, token: "test-pairing-token-123456", maxSelections: 1 });
  try {
    const invalid = await fetch(`${handle.url}/v1/snapshot`, {
      method: "POST",
      headers: headers(handle.token, { "Content-Type": "application/json" }),
      body: JSON.stringify({ selections: [{ id: "1:2" }] })
    });
    assert.equal(invalid.status, 400);

    const tooMany = await fetch(`${handle.url}/v1/snapshot`, {
      method: "POST",
      headers: headers(handle.token, { "Content-Type": "application/json" }),
      body: JSON.stringify({ selections: [samplePayload.selections[0], samplePayload.selections[0]] })
    });
    assert.equal(tooMany.status, 400);
  } finally {
    await handle.close();
  }
});

test("bridge enforces a bounded request body", async () => {
  const handle = await startPluginBridgeServer({ port: 0, token: "test-pairing-token-123456", maxBodyBytes: 256 });
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

test("client refuses non-loopback and non-http bridge URLs", () => {
  assert.throws(
    () => new PluginBridgeClient({ baseUrl: "https://127.0.0.1:3845", token: "test-pairing-token-123456" }),
    /must use http/
  );
  assert.throws(
    () => new PluginBridgeClient({ baseUrl: "http://example.com:3845", token: "test-pairing-token-123456" }),
    /refuses non-loopback/
  );
});

test("client reports bridge request timeouts", async () => {
  const fetchImpl = async (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });
  const client = new PluginBridgeClient({
    baseUrl: "http://127.0.0.1:3845",
    token: "test-pairing-token-123456",
    timeoutMs: 5,
    fetchImpl
  });
  await assert.rejects(client.health(), /timed out/);
});
