import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
const files = listed.split(/\r?\n/).filter(Boolean).filter((file) => file !== "chatgpt.txt");
const patterns = [
  { name: "Figma personal access token", regex: /figd_[A-Za-z0-9_-]{20,}/g },
  { name: "GitHub classic token", regex: /gh[pousr]_[A-Za-z0-9]{30,}/g },
  { name: "GitHub fine-grained token", regex: /github_pat_[A-Za-z0-9_]{40,}/g },
  { name: "private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g }
];

const findings = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (text.includes("\0")) continue;
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern.regex)) {
      const candidate = match[0];
      if (/^figd_x+$/i.test(candidate)) continue;
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      findings.push(`${file}:${line} ${pattern.name}`);
    }
  }
}

if (findings.length) {
  console.error("Potential secrets detected:\n" + findings.join("\n"));
  process.exit(1);
}

console.log(`Secret pattern check passed (${files.length} files scanned; token values were not printed).`);
