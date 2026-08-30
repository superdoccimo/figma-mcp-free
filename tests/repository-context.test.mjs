import assert from "node:assert/strict";
import test from "node:test";

import {
  parseGitHubRepository,
  resolveRepositoryContext
} from "../tools/repository-context.mjs";

test("parses GitHub shorthand, HTTPS and SSH remotes", () => {
  assert.equal(parseGitHubRepository("superdoccimo/figma-mcp-free"), "superdoccimo/figma-mcp-free");
  assert.equal(parseGitHubRepository("https://github.com/example/fork.git"), "example/fork");
  assert.equal(parseGitHubRepository("git@github.com:example/fork.git"), "example/fork");
  assert.equal(parseGitHubRepository("https://gitlab.com/example/fork"), undefined);
  assert.equal(parseGitHubRepository("not a repository"), undefined);
});

test("classifies the canonical repository and forks without failing unknown local clones", () => {
  assert.deepEqual(
    resolveRepositoryContext({
      upstreamRepository: "superdoccimo/figma-mcp-free",
      currentRepository: "superdoccimo/figma-mcp-free"
    }),
    {
      upstreamRepository: "superdoccimo/figma-mcp-free",
      currentRepository: "superdoccimo/figma-mcp-free",
      mode: "upstream",
      isFork: false
    }
  );

  assert.deepEqual(
    resolveRepositoryContext({
      upstreamRepository: "superdoccimo/figma-mcp-free",
      currentRepository: "someone/figma-mcp-free"
    }),
    {
      upstreamRepository: "superdoccimo/figma-mcp-free",
      currentRepository: "someone/figma-mcp-free",
      mode: "fork",
      isFork: true
    }
  );

  assert.deepEqual(
    resolveRepositoryContext({
      upstreamRepository: "superdoccimo/figma-mcp-free",
      env: {},
      cwd: "/path/that/does/not/exist"
    }),
    {
      upstreamRepository: "superdoccimo/figma-mcp-free",
      currentRepository: undefined,
      mode: "unknown",
      isFork: undefined
    }
  );
});
