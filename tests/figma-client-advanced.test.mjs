import assert from "node:assert/strict";
import test from "node:test";

import {
  FigmaClient,
  FigmaRateLimitError,
  FigmaRequestBudgetError
} from "../packages/figma-client/dist/index.js";

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {})
    }
  });
}

function sampleFile(name = "Example") {
  return {
    name,
    document: { id: "0:0", name: "Document", type: "DOCUMENT", children: [] }
  };
}

test("coalesces concurrent reads and serves short-lived cache hits", async () => {
  let calls = 0;
  const client = new FigmaClient({
    token: "test-token",
    cacheTtlMs: 60_000,
    maxRetries: 0,
    fetch: async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return jsonResponse(sampleFile());
    }
  });

  const [first, second] = await Promise.all([
    client.getFile("file-key", 2),
    client.getFile("file-key", 2)
  ]);
  assert.equal(first.name, "Example");
  assert.equal(second.name, "Example");
  assert.equal(calls, 1);
  assert.equal(client.getStats().deduplicatedRequests, 1);

  await client.getFile("file-key", 2);
  assert.equal(calls, 1);
  assert.equal(client.getStats().cacheHits, 1);

  client.clearCache();
  await client.getFile("file-key", 2);
  assert.equal(calls, 2);
});

test("batches, de-duplicates and normalizes node IDs", async () => {
  const requestedBatches = [];
  const client = new FigmaClient({
    token: "test-token",
    cacheTtlMs: 0,
    maxRetries: 0,
    maxNodeIdsPerRequest: 2,
    fetch: async (input) => {
      const url = new URL(String(input));
      const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
      requestedBatches.push(ids);
      return jsonResponse({
        nodes: Object.fromEntries(ids.map((id) => [id, {
          document: { id, name: `Node ${id}`, type: "FRAME" }
        }]))
      });
    }
  });

  const nodes = await client.getNodes("file-key", ["1-2", "3:4", "1:2", "5-6"]);
  assert.deepEqual(requestedBatches, [["1:2", "3:4"], ["5:6"]]);
  assert.equal(nodes["1:2"].id, "1:2");
  assert.equal(nodes["3:4"].id, "3:4");
  assert.equal(nodes["5:6"].id, "5:6");
  assert.equal(client.getStats().networkRequests, 2);
});

test("does not sleep and retry a clearly long-lived rate limit", async () => {
  let calls = 0;
  const client = new FigmaClient({
    token: "test-token",
    maxRetries: 3,
    maxRetryDelayMs: 1_000,
    fetch: async () => {
      calls += 1;
      return jsonResponse({ err: "quota exhausted" }, {
        status: 429,
        headers: {
          "retry-after": "3600",
          "x-figma-plan-tier": "starter",
          "x-figma-rate-limit-type": "monthly"
        }
      });
    }
  });

  await assert.rejects(
    client.getFile("file-key"),
    (error) => {
      assert.ok(error instanceof FigmaRateLimitError);
      assert.equal(error.info.retryable, false);
      assert.equal(error.info.planTier, "starter");
      assert.equal(error.info.rateLimitType, "monthly");
      return true;
    }
  );
  assert.equal(calls, 1);
});

test("retries a short-lived 429 and records the retry", async () => {
  let calls = 0;
  const client = new FigmaClient({
    token: "test-token",
    cacheTtlMs: 0,
    maxRetries: 1,
    retryDelayMs: 0,
    fetch: async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse({ err: "slow down" }, {
          status: 429,
          headers: { "retry-after": "0" }
        });
      }
      return jsonResponse(sampleFile("Recovered"));
    }
  });

  const file = await client.getFile("file-key");
  assert.equal(file.name, "Recovered");
  assert.equal(calls, 2);
  assert.equal(client.getStats().retries, 1);
});

test("enforces an explicit per-process request budget", async () => {
  const client = new FigmaClient({
    token: "test-token",
    cacheTtlMs: 0,
    maxRetries: 0,
    requestBudget: 1,
    fetch: async () => jsonResponse(sampleFile())
  });

  await client.getFile("first-file");
  await assert.rejects(
    client.getFile("second-file"),
    (error) => {
      assert.ok(error instanceof FigmaRequestBudgetError);
      assert.equal(error.limit, 1);
      assert.equal(error.used, 1);
      return true;
    }
  );
  assert.deepEqual(client.getRequestBudgetState(), {
    limit: 1,
    used: 1,
    remaining: 0
  });
});

test("exposes backend capabilities for future transport-independent routing", () => {
  const client = new FigmaClient({ token: "test-token" });
  assert.deepEqual(client.getCapabilities(), {
    backend: "rest",
    read: true,
    write: false,
    headless: true,
    requiresPersonalAccessToken: true
  });
});
