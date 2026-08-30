import { execFileSync } from "node:child_process";

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

export function parseGitHubRepository(value) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const trimmed = value.trim().replace(/\.git$/i, "");

  const shorthand = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shorthand) return `${shorthand[1]}/${shorthand[2]}`;

  const scp = trimmed.match(/^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/i);
  if (scp) return `${scp[1]}/${scp[2]}`;

  try {
    const url = new URL(trimmed);
    if (!GITHUB_HOSTS.has(url.hostname.toLowerCase())) return undefined;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return undefined;
    return `${parts[0]}/${parts[1]}`;
  } catch {
    return undefined;
  }
}

export function readOriginRemote(cwd = process.cwd()) {
  try {
    return execFileSync("git", ["remote", "get-url", "origin"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return undefined;
  }
}

export function resolveRepositoryContext({
  upstreamRepository,
  currentRepository,
  remoteUrl,
  env = process.env,
  cwd = process.cwd()
}) {
  const upstream = parseGitHubRepository(upstreamRepository);
  if (!upstream) {
    throw new Error(`Invalid upstream repository: ${upstreamRepository}`);
  }

  const current = parseGitHubRepository(currentRepository)
    ?? parseGitHubRepository(env.GITHUB_REPOSITORY)
    ?? parseGitHubRepository(remoteUrl)
    ?? parseGitHubRepository(readOriginRemote(cwd));

  return {
    upstreamRepository: upstream,
    currentRepository: current,
    mode: current ? (current.toLowerCase() === upstream.toLowerCase() ? "upstream" : "fork") : "unknown",
    isFork: current ? current.toLowerCase() !== upstream.toLowerCase() : undefined
  };
}
