#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { resolveRepositoryContext } from "./repository-context.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const config = JSON.parse(readFileSync(path.join(root, "repo.config.json"), "utf8"));

export function usage() {
  return [
    "Usage: node tools/audit-forks.mjs [options]",
    "",
    "Options:",
    "  --repo owner/name       Repository running the audit. Inferred from GitHub or origin when omitted.",
    "  --upstream owner/name   Canonical upstream override.",
    "  --all                   Inspect every public fork of upstream, even when run in a fork.",
    "  --format FORMAT         stdout format: markdown (default), json, or both.",
    "  --json PATH             JSON report path (default: fork-audit.json).",
    "  --markdown PATH         Markdown report path (default: fork-audit.md).",
    "  --no-files              Do not write report files.",
    "  --concurrency NUMBER    Concurrent comparisons, 1-10 (default: 4).",
    "  --fail-on-ahead         Exit with status 2 when a comparable fork is ahead.",
    "  --help, -h              Show this help."
  ].join("\n");
}

export function parseArgs(argv, env = process.env) {
  const context = resolveRepositoryContext({
    upstreamRepository: config.upstreamRepository,
    env,
    cwd: root
  });
  const options = {
    repo: env.GITHUB_REPOSITORY ?? context.currentRepository ?? config.upstreamRepository,
    upstream: undefined,
    all: false,
    format: "markdown",
    json: "fork-audit.json",
    markdown: "fork-audit.md",
    writeFiles: true,
    concurrency: 4,
    failOnAhead: false
  };

  const takeValue = (index, flag) => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--repo") options.repo = takeValue(index++, value);
    else if (value === "--upstream") options.upstream = takeValue(index++, value);
    else if (value === "--all") options.all = true;
    else if (value === "--format") options.format = takeValue(index++, value);
    else if (value === "--json") options.json = takeValue(index++, value);
    else if (value === "--markdown") options.markdown = takeValue(index++, value);
    else if (value === "--no-files") options.writeFiles = false;
    else if (value === "--concurrency") options.concurrency = Number(takeValue(index++, value));
    else if (value === "--fail-on-ahead") options.failOnAhead = true;
    else if (value === "--help" || value === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${value}`);
  }

  for (const [name, repository] of [["repo", options.repo], ["upstream", options.upstream]]) {
    if (repository !== undefined && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
      throw new Error(`${name} must be supplied as owner/name.`);
    }
  }
  if (!new Set(["markdown", "json", "both"]).has(options.format)) {
    throw new Error("--format must be markdown, json, or both.");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 10) {
    throw new Error("--concurrency must be an integer from 1 to 10.");
  }
  return options;
}

function repositoryPath(repository) {
  return repository.split("/").map(encodeURIComponent).join("/");
}

function compareSpec(baseBranch, fork) {
  const base = encodeURIComponent(baseBranch);
  const head = encodeURIComponent(`${fork.owner.login}:${fork.default_branch}`);
  return `${base}...${head}`;
}

export function hasNextPage(linkHeader) {
  if (!linkHeader) return false;
  return linkHeader.split(",").some((part) => /rel="next"/.test(part));
}

export async function listForks(repository, github) {
  const forks = [];
  for (let page = 1; ; page += 1) {
    const response = await github(`/repos/${repositoryPath(repository)}/forks?per_page=100&page=${page}&sort=newest`);
    const items = response.data;
    if (!Array.isArray(items)) throw new Error("GitHub fork listing did not return an array.");
    forks.push(...items);
    if (!hasNextPage(response.headers.get("link")) && items.length < 100) break;
    if (!hasNextPage(response.headers.get("link")) && items.length === 0) break;
  }
  return forks;
}

function comparisonFailure(fork, message, classification = "comparison-error") {
  return {
    fullName: fork.full_name,
    url: fork.html_url,
    owner: fork.owner.login,
    defaultBranch: fork.default_branch,
    archived: Boolean(fork.archived),
    disabled: Boolean(fork.disabled),
    stars: fork.stargazers_count ?? 0,
    forks: fork.forks_count ?? 0,
    createdAt: fork.created_at,
    updatedAt: fork.updated_at,
    pushedAt: fork.pushed_at,
    classification,
    aheadBy: null,
    behindBy: null,
    comparisonStatus: null,
    comparisonError: message,
    uniqueCommits: []
  };
}

export async function inspectFork(upstream, upstreamMeta, fork, github) {
  try {
    const response = await github(
      `/repos/${repositoryPath(upstream)}/compare/${compareSpec(upstreamMeta.default_branch, fork)}`,
      { optionalStatuses: [404, 409, 422] }
    );
    if (!response.data) {
      return comparisonFailure(fork, `GitHub returned ${response.status} for the comparison.`, "uncomparable");
    }

    const comparison = response.data;
    const uniqueCommits = (comparison.commits ?? []).slice(-20).map((commit) => ({
      sha: commit.sha,
      title: String(commit.commit?.message ?? "").split("\n")[0],
      author: commit.author?.login ?? commit.commit?.author?.name ?? null,
      url: commit.html_url
    }));
    const aheadBy = comparison.ahead_by ?? 0;
    const behindBy = comparison.behind_by ?? 0;
    let classification = "in-sync";
    if (aheadBy > 0) classification = behindBy > 0 ? "diverged-with-unique-work" : "ahead-with-unique-work";
    else if (behindBy > 0) classification = "behind-upstream";

    return {
      fullName: fork.full_name,
      url: fork.html_url,
      owner: fork.owner.login,
      defaultBranch: fork.default_branch,
      archived: Boolean(fork.archived),
      disabled: Boolean(fork.disabled),
      stars: fork.stargazers_count ?? 0,
      forks: fork.forks_count ?? 0,
      createdAt: fork.created_at,
      updatedAt: fork.updated_at,
      pushedAt: fork.pushed_at,
      classification,
      aheadBy,
      behindBy,
      comparisonStatus: comparison.status ?? null,
      comparisonError: null,
      uniqueCommits
    };
  } catch (error) {
    return comparisonFailure(fork, error instanceof Error ? error.message : String(error));
  }
}

export async function mapLimit(items, limit, operation) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await operation(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function cell(value) {
  return String(value ?? "-").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function markdownReport(report) {
  const lines = [
    "# Fork intelligence report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Current repository: \`${report.currentRepository}\`  `,
    `Canonical upstream: \`${report.upstream}\`  `,
    `Mode: ${report.mode}  `,
    `Forks inspected: ${report.summary.forkCount}  `,
    `Forks ahead: ${report.summary.forksAhead}  `,
    `Comparison errors: ${report.summary.comparisonErrors}`,
    "",
    "| Fork | Classification | Ahead | Behind | Last push | Unique commits sampled |",
    "| --- | --- | ---: | ---: | --- | ---: |"
  ];

  for (const fork of report.forks) {
    lines.push(`| [${cell(fork.fullName)}](${fork.url}) | ${cell(fork.classification)} | ${cell(fork.aheadBy)} | ${cell(fork.behindBy)} | ${cell(fork.pushedAt)} | ${fork.uniqueCommits.length} |`);
  }
  if (!report.forks.length) lines.push("| _No public forks found_ | in-sync | 0 | 0 | - | 0 |");

  const unique = report.forks.filter((fork) => (fork.aheadBy ?? 0) > 0);
  lines.push("", "## Upstream candidates", "");
  if (!unique.length) lines.push("No comparable fork currently has commits ahead of upstream.");
  for (const fork of unique) {
    lines.push(`### ${fork.fullName}`, "");
    if (!fork.uniqueCommits.length) lines.push(`GitHub reports ${fork.aheadBy} commit(s) ahead, but no commit sample was returned.`);
    for (const commit of fork.uniqueCommits) {
      lines.push(`- [\`${commit.sha.slice(0, 7)}\`](${commit.url}) ${cell(commit.title)}${commit.author ? `, by ${cell(commit.author)}` : ""}`);
    }
    lines.push("");
  }

  const failures = report.forks.filter((fork) => fork.comparisonError);
  lines.push("", "## Comparison exceptions", "");
  if (!failures.length) lines.push("No comparison exceptions were recorded.");
  for (const fork of failures) lines.push(`- **${cell(fork.fullName)}**: ${cell(fork.comparisonError)}`);

  lines.push(
    "",
    "## Interpretation",
    "",
    "- `ahead-with-unique-work`: review for a possible upstream contribution.",
    "- `diverged-with-unique-work`: review carefully because the fork is both ahead and behind.",
    "- `behind-upstream`: no unique comparable commits were detected.",
    "- `uncomparable`: GitHub could not compare the histories.",
    "- `comparison-error`: one fork failed without aborting the rest of the audit.",
    ""
  );
  return lines.join("\n");
}

export function createGitHubClient({ token, apiUrl = "https://api.github.com", fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("global fetch is not available in this runtime");
  const baseUrl = apiUrl.replace(/\/+$/, "");
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "figma-mcp-free-fork-audit"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const rateLimit = { remaining: undefined, reset: undefined };

  const github = async (pathname, { optionalStatuses = [] } = {}) => {
    const response = await fetchImpl(`${baseUrl}${pathname}`, { headers });
    rateLimit.remaining = response.headers.get("x-ratelimit-remaining") ?? rateLimit.remaining;
    rateLimit.reset = response.headers.get("x-ratelimit-reset") ?? rateLimit.reset;

    if (optionalStatuses.includes(response.status)) {
      return { data: undefined, status: response.status, headers: response.headers };
    }
    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json();
        detail = typeof body?.message === "string" ? `: ${body.message}` : "";
      } catch {
        // The status and endpoint still provide an actionable failure.
      }
      const remaining = rateLimit.remaining ? `; rate limit remaining=${rateLimit.remaining}` : "";
      throw new Error(`GitHub API ${response.status} for ${pathname}${detail}${remaining}`);
    }
    return { data: await response.json(), status: response.status, headers: response.headers };
  };

  return { github, rateLimit };
}

export async function runAudit(options, env = process.env) {
  const { github, rateLimit } = createGitHubClient({
    token: env.GITHUB_TOKEN || env.GH_TOKEN,
    apiUrl: env.GITHUB_API_URL || "https://api.github.com"
  });
  const currentResponse = await github(`/repos/${repositoryPath(options.repo)}`);
  const currentMeta = currentResponse.data;
  const upstream = options.upstream
    ?? currentMeta.parent?.full_name
    ?? currentMeta.source?.full_name
    ?? config.upstreamRepository
    ?? currentMeta.full_name;
  const upstreamMeta = upstream === currentMeta.full_name
    ? currentMeta
    : (await github(`/repos/${repositoryPath(upstream)}`)).data;

  let targets;
  let mode;
  if (currentMeta.fork && !options.all) {
    targets = [currentMeta];
    mode = "current-fork-vs-upstream";
  } else {
    targets = await listForks(upstream, github);
    mode = currentMeta.fork ? "all-upstream-forks" : "upstream-all-forks";
  }

  const inspected = await mapLimit(
    targets,
    options.concurrency,
    (fork) => inspectFork(upstream, upstreamMeta, fork, github)
  );
  inspected.sort((left, right) => {
    const ahead = (right.aheadBy ?? -1) - (left.aheadBy ?? -1);
    return ahead || String(right.pushedAt ?? "").localeCompare(String(left.pushedAt ?? ""));
  });

  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    currentRepository: currentMeta.full_name,
    upstream,
    mode,
    summary: {
      forkCount: inspected.length,
      forksAhead: inspected.filter((fork) => (fork.aheadBy ?? 0) > 0).length,
      comparisonErrors: inspected.filter((fork) => Boolean(fork.comparisonError)).length,
      rateLimitRemaining: rateLimit.remaining === undefined ? null : Number(rateLimit.remaining),
      rateLimitReset: rateLimit.reset === undefined ? null : Number(rateLimit.reset)
    },
    forks: inspected
  };
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv, env);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  const report = await runAudit(options, env);
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = `${markdownReport(report)}\n`;

  if (options.writeFiles) {
    writeFileSync(options.json, json, "utf8");
    writeFileSync(options.markdown, markdown, "utf8");
  }

  if (options.format === "json") process.stdout.write(json);
  else if (options.format === "both") process.stdout.write(`${markdown}\n${json}`);
  else process.stdout.write(markdown);

  return options.failOnAhead && report.summary.forksAhead > 0 ? 2 : 0;
}

const isDirectExecution = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectExecution) {
  main().then(
    (code) => { process.exitCode = code; },
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  );
}
