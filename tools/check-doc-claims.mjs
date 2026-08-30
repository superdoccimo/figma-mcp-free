import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const extensions = new Set([".md", ".svg", ".html", ".txt"]);
const ignoredDirectories = new Set([".git", "node_modules", "dist"]);
const forbidden = [
  { label: "obsolete Dev Mode alternative claim", pattern: /alternative to Figma Dev Mode/i },
  { label: "obsolete Japanese Dev Mode replacement title", pattern: /無料でFigma Dev Modeを取り戻す/ },
  { label: "misleading Dev Mode free-conversion title", pattern: /Figma Dev Modeを無料化/ },
  { label: "unsupported equivalence claim", pattern: /完全無料で同じことができます/ },
  { label: "unsupported Dev Mode-equivalent experience claim", pattern: /Dev Mode級の体験/ },
  { label: "obsolete issue-file reference", pattern: /大問題\.txt/ },
  { label: "obsolete placeholder health check", pattern: /health-check: OK \(placeholder\)/ },
  { label: "obsolete placeholder migration", pattern: /migration steps here \(placeholder\)/i },
  { label: "unpublished global npm install command", pattern: /npm install -g figma-mcp-free/ },
  { label: "unpublished npx initialization command", pattern: /npx figma-mcp-free init/ },
  { label: "obsolete external server example", pattern: /figma-developer-mcp/ }
];
const failures = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    if (ignoredDirectories.has(name)) continue;
    const full = join(directory, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full);
      continue;
    }
    if (!extensions.has(extname(name).toLowerCase())) continue;
    const rel = relative(root, full).replaceAll("\\", "/");
    const content = readFileSync(full, "utf8");
    for (const rule of forbidden) {
      if (rule.pattern.test(content)) failures.push(`${rel}: ${rule.label}`);
    }
  }
}

walk(root);
assert.deepEqual(failures, [], `Documentation integrity check failed:\n${failures.join("\n")}`);
console.log("Documentation integrity check passed: no known obsolete claims, placeholder scripts, or unpublished install commands were found.");
