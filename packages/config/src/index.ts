import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { randomBytes } from "node:crypto";

export interface AppConfig {
  token?: string;
}

export interface ConfigSecurityStatus {
  path: string;
  exists: boolean;
  mode?: number;
  secure: boolean | null;
  message: string;
}

const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;

export function getConfigDir(): string {
  const platform = process.platform;
  if (platform === "win32") {
    const appData = process.env.APPDATA || join(os.homedir(), "AppData", "Roaming");
    return join(appData, "figma-mcp-free");
  }
  if (platform === "darwin") {
    return join(os.homedir(), "Library", "Application Support", "figma-mcp-free");
  }
  const xdg = process.env.XDG_CONFIG_HOME || join(os.homedir(), ".config");
  return join(xdg, "figma-mcp-free");
}

export function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

function hardenPath(path: string, mode: number): void {
  if (process.platform === "win32") return;
  try {
    chmodSync(path, mode);
  } catch {
    // Some network/restricted filesystems do not implement POSIX modes.
  }
}

function ensureConfigDir(): string {
  const dir = getConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: DIRECTORY_MODE });
  hardenPath(dir, DIRECTORY_MODE);
  return dir;
}

function sanitizeConfig(value: unknown): AppConfig {
  if (!value || typeof value !== "object") return {};
  const token = (value as { token?: unknown }).token;
  return typeof token === "string" && token.trim() ? { token } : {};
}

export function readConfig(): AppConfig {
  const path = getConfigPath();
  if (!existsSync(path)) return {};
  try {
    hardenPath(path, FILE_MODE);
    return sanitizeConfig(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return {};
  }
}

export function writeConfig(partial: AppConfig): void {
  const path = getConfigPath();
  const dir = ensureConfigDir();
  const current = readConfig();
  const next = sanitizeConfig({ ...current, ...partial });
  const tempPath = join(dir, `.config.${process.pid}.${randomBytes(6).toString("hex")}.tmp`);
  let descriptor: number | undefined;

  try {
    descriptor = openSync(tempPath, "wx", FILE_MODE);
    writeFileSync(descriptor, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    hardenPath(tempPath, FILE_MODE);
    renameSync(tempPath, path);
    hardenPath(path, FILE_MODE);
  } catch (error) {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch {}
    }
    try { rmSync(tempPath, { force: true }); } catch {}
    throw error;
  }
}

export function getConfigSecurityStatus(): ConfigSecurityStatus {
  const path = getConfigPath();
  if (!existsSync(path)) {
    return { path, exists: false, secure: null, message: "No local config file exists." };
  }
  if (process.platform === "win32") {
    return {
      path,
      exists: true,
      secure: null,
      message: "Windows ACLs are managed by the operating system; POSIX mode checks do not apply."
    };
  }
  try {
    const mode = statSync(path).mode & 0o777;
    const secure = (mode & 0o077) === 0;
    return {
      path,
      exists: true,
      mode,
      secure,
      message: secure
        ? `Local config permissions are restricted (${mode.toString(8).padStart(3, "0")}).`
        : `Local config permissions are too broad (${mode.toString(8).padStart(3, "0")}); run chmod 600 on the file.`
    };
  } catch {
    return { path, exists: true, secure: null, message: "Unable to inspect local config permissions." };
  }
}

export function getToken(): string | undefined {
  return process.env.FIGMA_TOKEN?.trim() || readConfig().token?.trim();
}
