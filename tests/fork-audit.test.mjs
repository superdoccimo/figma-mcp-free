import assert from "node:assert/strict";
import test from "node:test";

import {
  hasNextPage,
  inspectFork,
  listForks,
  mapLimit,
  markdownReport,
  parseArgs
} from "../tools/audit-forks.mjs";

function fork(name, overrides = {}) {
  const [owner, repo] = name.split("/");
  return {
    full_name: name,
    html_url: `https://github.com/${name}`,
    owner: { login: owner },
    default_branch: "main",
    archived: false,
    disabled: false,
    stargazers_count: 0,
    forks_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    pushed_at: "2026-01-01T00:00:00Z",
    name: repo,
    ...overrides
  };
}

test("parses JSON-only audit mode without writing files", () => {
  const options = parseArgs(
    ["--repo", "example/project", "--format", "json", "--no-files", "--concurrency", "3"],
    {}
  );
  assert.equal(options.repo, "example/project");
  assert.equal(options.format, "json");
  assert.equal(options.writeFiles, false);
  assert.equal(options.concurrency, 3);
});

test("recognizes a next-page relation", () => {
  assert.equal(hasNextPage('<https://api.github.com/items?page=2>; rel="next", <https://api.github.com/items?page=4>; rel="last"'), true);
  assert.equal(hasNextPage('<https://api.github.com/items?page=1>; rel="prev"'), false);
});

test("follows pagination until the final page", async () => {
  const pages = [];
  const github = async (pathname) => {
    pages.push(pathname);
    if (pathname.includes("&page=1&")) {
      return {
        data: [fork("one/project")],
        status: 200,
        headers: new Headers({ link: '<https://api.github.com/items?page=2>; rel="next"' })
      };
    }
    return {
      data: [fork("two/project")],
      status: 200,
      headers: new Headers()
    };
  };

  const forks = await listForks("upstream/project", github);
  assert.deepEqual(forks.map((item) => item.full_name), ["one/project", "two/project"]);
  assert.equal(pages.length, 2);
});

test("isolates a failed comparison instead of aborting the audit", async () => {
  const result = await inspectFork(
    "upstream/project",
    { default_branch: "main" },
    fork("broken/project"),
    async () => { throw new Error("temporary compare failure"); }
  );
  assert.equal(result.classification, "comparison-error");
  assert.match(result.comparisonError, /temporary compare failure/);
  assert.equal(result.aheadBy, null);
});

test("maps with bounded concurrency while preserving result order", async () => {
  let active = 0;
  let maximum = 0;
  const result = await mapLimit([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 3));
    active -= 1;
    return value * 2;
  });
  assert.deepEqual(result, [2, 4, 6, 8, 10]);
  assert.equal(maximum, 2);
});

test("reports ahead forks and comparison exceptions in Markdown", () => {
  const report = {
    generatedAt: "2026-08-30T00:00:00Z",
    currentRepository: "upstream/project",
    upstream: "upstream/project",
    mode: "upstream-all-forks",
    summary: { forkCount: 2, forksAhead: 1, comparisonErrors: 1 },
    forks: [
      {
        ...fork("ahead/project"),
        fullName: "ahead/project",
        url: "https://github.com/ahead/project",
        classification: "ahead-with-unique-work",
        aheadBy: 1,
        behindBy: 0,
        comparisonError: null,
        uniqueCommits: [{ sha: "1234567890", title: "Useful change", author: "ahead", url: "https://example.test/commit" }]
      },
      {
        ...fork("broken/project"),
        fullName: "broken/project",
        url: "https://github.com/broken/project",
        classification: "comparison-error",
        aheadBy: null,
        behindBy: null,
        comparisonError: "failed",
        uniqueCommits: []
      }
    ]
  };
  const markdown = markdownReport(report);
  assert.match(markdown, /Forks ahead: 1/);
  assert.match(markdown, /Useful change/);
  assert.match(markdown, /broken\/project.*failed/);
});
