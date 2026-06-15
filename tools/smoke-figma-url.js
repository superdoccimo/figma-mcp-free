#!/usr/bin/env node

const assert = require("node:assert/strict");

(async () => {
  const { normalizeFigmaNodeId, parseFigmaUrl, resolveFigmaReference } = await import("../packages/figma-client/dist/index.js");

  assert.equal(normalizeFigmaNodeId("1-2"), "1:2");
  assert.equal(normalizeFigmaNodeId("10%3A20"), "10:20");

  assert.deepEqual(
    resolveFigmaReference("https://www.figma.com/design/ABC123/Example?node-id=1-2"),
    { fileId: "ABC123", nodeId: "1:2", urlType: "design" }
  );

  assert.deepEqual(
    resolveFigmaReference("https://figma.com/file/FILE456/Example?node_id=10%3A20", "3-4"),
    { fileId: "FILE456", nodeId: "3:4", urlType: "file" }
  );

  assert.equal(parseFigmaUrl("https://notfigma.com/design/ABC123/Example?node-id=1-2"), undefined);

  assert.throws(
    () => parseFigmaUrl("https://www.figma.com/slides/ABC123/Deck?node-id=1-2"),
    /\/slides links are not supported/
  );

  console.log("Figma URL parsing smoke check passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
