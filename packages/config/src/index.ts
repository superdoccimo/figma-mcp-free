import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import os from "node:os";

export interface AppConfig {
  token?: string;
}

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

export function readConfig(): AppConfig {
  const p = getConfigPath();
  if (!existsSync(p)) return {};
  try {
    const txt = readFileSync(p, "utf8");
    const parsed = JSON.parse(txt);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function writeConfig(partial: AppConfig): void {
  const p = getConfigPath();
  const dir = dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const current = readConfig();
  const next = { ...current, ...partial } as AppConfig;
  writeFileSync(p, JSON.stringify(next, null, 2));
}

export function getToken(): string | undefined {
  return process.env.FIGMA_TOKEN || readConfig().token;
}

