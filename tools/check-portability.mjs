import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const scanRoots = ["packages", "scripts", "tools"];
const extensions = new Set([".ts", ".js", ".mjs", ".cjs", ".json", ".sh"]);
const canonicalOwner = ["super", "doccimo"].join("");
const forbidden = [
  { name: "canonical owner hard-coded in operational code", pattern: new RegExp(canonicalOwner, "i") },
  { name: "developer home path", pattern: /(?:\/home\/[^/]+|\/Users\/[^/]+|[A-Za-z]:\\\\Users\\\\[^\\]+)/ },
  { name: "local secret-like file path", pattern: /(?:\.env\.local|config\.json).*figd_/i }
];
const ignored = new Set(["tools/check-portability.mjs"]);
const failures = [];

function walk(path) {
  for (const name of readdirSync(path)) {
    const full = join(path, name);
    const rel = relative(root, full).replaceAll("\\", "/");
    if (ignored.has(rel) || name === "dist" || name === "node_modules") continue;
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (extensions.has(extname(name))) {
      const content = readFileSync(full, "utf8");
      for (const rule of forbidden) if (rule.pattern.test(content)) failures.push(`${rel}: ${rule.name}`);
    }
  }
}

for (const directory of scanRoots) walk(join(root, directory));
assert.deepEqual(failures, [], `Fork portability check failed:\n${failures.join("\n")}`);
console.log("Fork portability check passed: operational code has no owner-specific paths or repository assumptions.");
