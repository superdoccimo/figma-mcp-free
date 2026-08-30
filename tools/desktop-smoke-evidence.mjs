import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requiredSteps = [
  "install-candidate",
  "generate-plugin-manifest",
  "import-development-plugin",
  "start-loopback-bridge",
  "test-pairing",
  "capture-sample-selection",
  "read-bridge-status",
  "list-current-selections",
  "inspect-current-selection",
  "generate-react-starter",
  "clear-snapshot",
  "restart-rotates-session"
];

function git(args, fallback = "unknown") {
  try { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
  catch { return fallback; }
}

function sourceFingerprint() {
  const index = git(["ls-files", "-s"], "");
  if (!index) return "unknown";
  const stable = index
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.includes("\trelease-evidence/"))
    .sort()
    .join("\n");
  return createHash("sha256").update(stable).digest("hex");
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function inspectSecrets(value, path = "$") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (/token|secret|password|authorization/i.test(key) && child !== false && child !== null && child !== "") {
      throw new Error(`Sensitive value must not be recorded at ${childPath}.`);
    }
    if (child && typeof child === "object") inspectSecrets(child, childPath);
  }
}

async function packageVersion() {
  return JSON.parse(await readFile(resolve(root, "packages/cli/package.json"), "utf8")).version;
}

async function createTemplate(args) {
  const platform = option(args, "--platform", "windows");
  assert(["windows", "macos"].includes(platform), "--platform must be windows or macos.");
  const output = resolve(option(args, "--output", `release-evidence/desktop-smoke-${platform}.json`));
  const template = {
    schemaVersion: 1,
    candidate: {
      sourceFingerprint: sourceFingerprint(),
      startingCommit: git(["rev-parse", "HEAD"]),
      packageVersion: await packageVersion(),
      tarballSha256: ""
    },
    environment: {
      platform,
      osVersion: "",
      nodeVersion: process.version,
      figmaDesktopVersion: ""
    },
    executedAt: "",
    bridge: {
      url: "http://127.0.0.1:3845",
      pairingTokenPersisted: false
    },
    steps: requiredSteps.map((id) => ({ id, status: "pending", note: "" })),
    attestation: {
      readOnlyObserved: false,
      figmaDocumentWritesObserved: false,
      privateDesignDataAttached: false,
      pairingTokenExposed: false
    },
    notes: ""
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(template, null, 2)}\n`, "utf8");
  console.log(`Created ${output}. Complete it using docs/desktop-smoke-test.md, then run the verify command.`);
}

async function verifyEvidence(args) {
  const path = args.find((value) => !value.startsWith("--") && value !== "verify");
  assert(path, "Usage: node tools/desktop-smoke-evidence.mjs verify <evidence.json>");
  const resolved = resolve(path);
  const evidence = JSON.parse(await readFile(resolved, "utf8"));
  inspectSecrets(evidence);

  assert(evidence.schemaVersion === 1, "Unsupported Desktop evidence schemaVersion.");
  assert(["windows", "macos"].includes(evidence.environment?.platform), "Desktop evidence platform must be windows or macos.");
  assert(typeof evidence.environment?.osVersion === "string" && evidence.environment.osVersion.trim(), "osVersion is required.");
  assert(typeof evidence.environment?.figmaDesktopVersion === "string" && evidence.environment.figmaDesktopVersion.trim(), "figmaDesktopVersion is required.");
  assert(!Number.isNaN(Date.parse(evidence.executedAt)), "executedAt must be an ISO timestamp.");
  assert(/^https?:\/\/(127\.0\.0\.1|localhost):\d+$/.test(evidence.bridge?.url ?? ""), "bridge.url must be an explicit IPv4 or localhost loopback origin with a port.");
  assert(evidence.bridge?.pairingTokenPersisted === false, "The pairing token must not be persisted.");
  assert(evidence.candidate?.sourceFingerprint === sourceFingerprint(), "Evidence does not match the current source fingerprint.");
  assert(/^\d+\.\d+\.\d+(?:[-+].+)?$/.test(evidence.candidate?.packageVersion ?? ""), "packageVersion is invalid.");
  assert(/^[a-f0-9]{64}$/.test(evidence.candidate?.tarballSha256 ?? ""), "tarballSha256 is required.");

  const steps = new Map((evidence.steps ?? []).map((step) => [step.id, step]));
  assert(steps.size === requiredSteps.length, "Desktop evidence has missing or unexpected steps.");
  for (const id of requiredSteps) {
    const step = steps.get(id);
    assert(step?.status === "pass", `Desktop smoke step is not complete: ${id}`);
  }
  assert(evidence.attestation?.readOnlyObserved === true, "The read-only behavior must be attested.");
  assert(evidence.attestation?.figmaDocumentWritesObserved === false, "Any observed Figma write blocks release.");
  assert(evidence.attestation?.privateDesignDataAttached === false, "Do not attach private design data to evidence.");
  assert(evidence.attestation?.pairingTokenExposed === false, "Any exposed pairing token blocks release.");

  const digest = createHash("sha256").update(await readFile(resolved)).digest("hex");
  console.log(JSON.stringify({ valid: true, path: resolved, platform: evidence.environment.platform, evidenceSha256: digest }, null, 2));
}

const [command = "help", ...args] = process.argv.slice(2);
try {
  if (command === "template") await createTemplate(args);
  else if (command === "verify") await verifyEvidence([command, ...args]);
  else {
    console.log(`Desktop smoke evidence

  template [--platform windows|macos] [--output PATH]
  verify <evidence.json>

Evidence never stores a pairing token or private Figma design data.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Desktop evidence command failed.");
  process.exitCode = 1;
}
