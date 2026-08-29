#!/usr/bin/env node
import { writeFileSync } from "node:fs";

function parseArgs(argv) {
  const options = {
    repo: process.env.GITHUB_REPOSITORY,
    upstream: undefined,
    all: false,
    json: "fork-audit.json",
    markdown: "fork-audit.md",
    failOnAhead: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--repo") options.repo = argv[++i];
    else if (value === "--upstream") options.upstream = argv[++i];
    else if (value === "--all") options.all = true;
    else if (value === "--json") options.json = argv[++i];
    else if (value === "--markdown") options.markdown = argv[++i];
    else if (value === "--fail-on-ahead") options.failOnAhead = true;
    else if (value === "--help" || value === "-h") {
      console.log("Usage: node tools/audit-forks.mjs [--repo owner/name] [--upstream owner/name] [--all] [--json path] [--markdown path] [--fail-on-ahead]");
      process.exit(0);
    } else throw new Error(`Unknown argument: ${value}`);
  }
  if (!options.repo || !/^[^/]+\/[^/]+$/.test(options.repo)) {
    throw new Error("Repository must be supplied as owner/name via --repo or GITHUB_REPOSITORY.");
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "figma-mcp-free-fork-audit"
};
if (token) headers.Authorization = `Bearer ${token}`;

async function github(path, { optional = false } = {}) {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (optional && (response.status === 404 || response.status === 409 || response.status === 422)) return undefined;
  if (!response.ok) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    throw new Error(`GitHub API ${response.status} for ${path}${remaining ? ` (rate limit remaining: ${remaining})` : ""}`);
  }
  return response.json();
}

async function listForks(repo) {
  const forks = [];
  for (let page = 1; page <= 10; page += 1) {
    const items = await github(`/repos/${repo}/forks?per_page=100&page=${page}&sort=newest`);
    forks.push(...items);
    if (items.length < 100) break;
  }
  return forks;
}

function compareSpec(baseBranch, fork) {
  return `${encodeURIComponent(baseBranch)}...${encodeURIComponent(`${fork.owner.login}:${fork.default_branch}`)}`;
}

async function inspectFork(upstream, upstreamMeta, fork) {
  const comparison = await github(
    `/repos/${upstream}/compare/${compareSpec(upstreamMeta.default_branch, fork)}`,
    { optional: true }
  );
  const uniqueCommits = (comparison?.commits ?? []).slice(-20).map((commit) => ({
    sha: commit.sha,
    title: String(commit.commit?.message ?? "").split("\n")[0],
    author: commit.author?.login ?? commit.commit?.author?.name ?? null,
    url: commit.html_url
  }));
  const aheadBy = comparison?.ahead_by ?? null;
  const behindBy = comparison?.behind_by ?? null;
  let classification = "uncomparable";
  if (comparison) {
    if (aheadBy > 0) classification = behindBy > 0 ? "diverged-with-unique-work" : "ahead-with-unique-work";
    else if (behindBy > 0) classification = "behind-upstream";
    else classification = "in-sync";
  }
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
    comparisonStatus: comparison?.status ?? null,
    uniqueCommits
  };
}

function cell(value) {
  return String(value ?? "-").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function markdownReport(report) {
  const lines = [
    "# Fork intelligence report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Current repository: \`${report.currentRepository}\`  `,
    `Canonical upstream: \`${report.upstream}\`  `,
    `Mode: ${report.mode}  `,
    `Forks inspected: ${report.forks.length}`,
    "",
    "| Fork | Classification | Ahead | Behind | Last push | Unique commits sampled |",
    "| --- | --- | ---: | ---: | --- | ---: |"
  ];
  for (const fork of report.forks) {
    lines.push(`| [${cell(fork.fullName)}](${fork.url}) | ${cell(fork.classification)} | ${cell(fork.aheadBy)} | ${cell(fork.behindBy)} | ${cell(fork.pushedAt)} | ${fork.uniqueCommits.length} |`);
  }
  const unique = report.forks.filter((fork) => (fork.aheadBy ?? 0) > 0);
  lines.push("", "## Upstream candidates", "");
  if (!unique.length) lines.push("No comparable fork currently has commits ahead of upstream.");
  for (const fork of unique) {
    lines.push(`### ${fork.fullName}`, "");
    for (const commit of fork.uniqueCommits) {
      lines.push(`- [\`${commit.sha.slice(0, 7)}\`](${commit.url}) ${cell(commit.title)}${commit.author ? `, by ${cell(commit.author)}` : ""}`);
    }
    lines.push("");
  }
  lines.push(
    "## Interpretation",
    "",
    "- `ahead-with-unique-work`: review for possible upstream contribution.",
    "- `diverged-with-unique-work`: review carefully because the fork is both ahead and behind.",
    "- `behind-upstream`: no unique comparable commits were detected.",
    "- `uncomparable`: GitHub could not compare the histories; inspect manually before drawing conclusions.",
    ""
  );
  return lines.join("\n");
}

const currentMeta = await github(`/repos/${options.repo}`);
const upstream = options.upstream || currentMeta.parent?.full_name || currentMeta.source?.full_name || currentMeta.full_name;
const upstreamMeta = upstream === currentMeta.full_name ? currentMeta : await github(`/repos/${upstream}`);
let targets;
let mode;
if (currentMeta.fork && !options.all) {
  targets = [currentMeta];
  mode = "current-fork-vs-upstream";
} else {
  targets = await listForks(upstream);
  mode = currentMeta.fork ? "all-upstream-forks" : "upstream-all-forks";
}

const inspected = [];
for (const fork of targets) inspected.push(await inspectFork(upstream, upstreamMeta, fork));
inspected.sort((a, b) => {
  const ahead = (b.aheadBy ?? -1) - (a.aheadBy ?? -1);
  return ahead || String(b.pushedAt ?? "").localeCompare(String(a.pushedAt ?? ""));
});

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  currentRepository: currentMeta.full_name,
  upstream,
  mode,
  forks: inspected
};
const markdown = markdownReport(report);
writeFileSync(options.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(options.markdown, `${markdown}\n`, "utf8");
console.log(markdown);

if (options.failOnAhead && inspected.some((fork) => (fork.aheadBy ?? 0) > 0)) process.exitCode = 2;
