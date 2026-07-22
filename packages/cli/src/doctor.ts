import { spawnSync } from "node:child_process";
import { readConfig } from "@figma-mcp-free/config";
import {
  FigmaApiError,
  FigmaClient,
  normalizeFigmaNodeId,
  parseFigmaUrl,
  type FigmaReference
} from "@figma-mcp-free/figma-client";

export type DoctorCheckStatus = "pass" | "warn" | "fail" | "skip";

export interface DoctorCheck {
  id: string;
  status: DoctorCheckStatus;
  message: string;
}

export interface DoctorReport {
  status: "ok" | "warning" | "error";
  readOnly: true;
  checks: DoctorCheck[];
}

export interface DoctorOptions {
  figmaUrl?: string;
  fileId?: string;
  nodeId?: string;
}

function majorVersion(version: string): number {
  return Number.parseInt(version.replace(/^v/, "").split(".")[0] ?? "0", 10);
}

export function doctorMessageForStatus(status: number): string {
  if (status === 401) return "Token was rejected (401). Create or copy a valid Figma Personal Access Token.";
  if (status === 403) return "Access denied (403). Confirm that the token can access this file.";
  if (status === 404) return "File or node was not found (404). Check the file ID, node ID, and file access.";
  if (status === 429) return "Figma rate limit reached (429). Wait for Retry-After before trying again.";
  if (status >= 500 && status <= 599) return `Figma API is temporarily unavailable (${status}). Retry later.`;
  return `Figma API request failed (${status}). Check the IDs, token, and network connection.`;
}

function resolveReference(options: DoctorOptions, checks: DoctorCheck[]): FigmaReference | undefined {
  if (options.figmaUrl) {
    try {
      const ref = parseFigmaUrl(options.figmaUrl);
      if (!ref) {
        checks.push({ id: "figma_url", status: "fail", message: "The value is not a Figma URL." });
        return undefined;
      }
      checks.push({ id: "figma_url", status: "pass", message: `Recognized a Figma /${ref.urlType} URL.` });
      const nodeId = options.nodeId ? normalizeFigmaNodeId(options.nodeId) : ref.nodeId;
      if (nodeId) {
        checks.push({ id: "node_id", status: "pass", message: `Normalized node ID to ${nodeId}.` });
      } else {
        checks.push({ id: "node_id", status: "skip", message: "No node ID was supplied; the file will be checked." });
      }
      return { ...ref, nodeId };
    } catch (error) {
      checks.push({
        id: "figma_url",
        status: "fail",
        message: error instanceof Error ? error.message : "Unable to parse the Figma URL."
      });
      return undefined;
    }
  }

  if (options.fileId) {
    const nodeId = options.nodeId ? normalizeFigmaNodeId(options.nodeId) : undefined;
    checks.push({ id: "figma_reference", status: "pass", message: "Using the supplied file ID." });
    checks.push(nodeId
      ? { id: "node_id", status: "pass", message: `Normalized node ID to ${nodeId}.` }
      : { id: "node_id", status: "skip", message: "No node ID was supplied; the file will be checked." });
    return { fileId: options.fileId, nodeId };
  }

  checks.push({ id: "figma_reference", status: "skip", message: "No Figma URL or file ID supplied; API validation was skipped." });
  return undefined;
}

export async function runDoctor(options: DoctorOptions): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  const nodeSupported = majorVersion(process.version) >= 18;
  checks.push({
    id: "node",
    status: nodeSupported ? "pass" : "fail",
    message: `Node.js ${process.version} detected; version 18 or newer is required.`
  });

  const pnpm = process.platform === "win32"
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", "pnpm --version"], { encoding: "utf8" })
    : spawnSync("pnpm", ["--version"], { encoding: "utf8" });
  const pnpmVersion = pnpm.status === 0 ? pnpm.stdout.trim() : "";
  checks.push(pnpmVersion
    ? { id: "package_manager", status: "pass", message: `pnpm ${pnpmVersion} is available.` }
    : { id: "package_manager", status: "warn", message: "pnpm was not found; direct package execution can still work after installation." });

  const envTokenValue = process.env.FIGMA_TOKEN?.trim() ?? "";
  const configuredToken = readConfig().token;
  const localTokenValue = typeof configuredToken === "string" ? configuredToken.trim() : "";
  const envToken = Boolean(envTokenValue);
  const localToken = Boolean(localTokenValue);
  checks.push({
    id: "env_token",
    status: envToken ? "pass" : "skip",
    message: envToken ? "FIGMA_TOKEN is set." : "FIGMA_TOKEN is not set."
  });
  checks.push({
    id: "local_token",
    status: localToken ? "pass" : "skip",
    message: localToken ? "A token is stored in local config." : "No token is stored in local config."
  });

  const reference = resolveReference(options, checks);
  const token = envTokenValue || localTokenValue;
  if (!token) {
    checks.push({
      id: "token",
      status: "warn",
      message: "No token is configured. Set FIGMA_TOKEN or run figma-mcp-free init."
    });
  }

  if (reference && token) {
    try {
      const client = new FigmaClient({ token });
      if (reference.nodeId) {
        const node = await client.getNode(reference.fileId, reference.nodeId, 1);
        if (!node) throw new FigmaApiError("Node was not returned by Figma", 404);
        checks.push({ id: "figma_api", status: "pass", message: "The file and node are accessible through the Figma REST API." });
      } else {
        await client.getFile(reference.fileId, 1);
        checks.push({ id: "figma_api", status: "pass", message: "The file is accessible through the Figma REST API." });
      }
    } catch (error) {
      checks.push({
        id: "figma_api",
        status: "fail",
        message: error instanceof FigmaApiError
          ? doctorMessageForStatus(error.status)
          : "Unable to reach the Figma REST API. Check the network connection and try again."
      });
    }
  } else {
    checks.push({
      id: "figma_api",
      status: "skip",
      message: reference ? "API validation requires a configured token." : "API validation requires a Figma URL or file ID."
    });
  }

  checks.push({
    id: "read_only",
    status: "pass",
    message: "This CLI uses read-only Figma REST API requests and cannot modify Figma files."
  });

  const status = checks.some((check) => check.status === "fail")
    ? "error"
    : checks.some((check) => check.status === "warn")
      ? "warning"
      : "ok";
  return { status, readOnly: true, checks };
}

export function printDoctorReport(report: DoctorReport): void {
  for (const check of report.checks) {
    console.log(`${check.status.toUpperCase().padEnd(4)} ${check.message}`);
  }
  console.log(`Result: ${report.status}`);
}
