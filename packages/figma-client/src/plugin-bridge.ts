import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { FigmaNode } from "./index.js";

export interface PluginBridgeSelection {
  id: string;
  name: string;
  type: string;
  document: FigmaNode;
}

export interface PluginBridgeSnapshot {
  schemaVersion: 1;
  source: "figma-plugin";
  capturedAt: string;
  fileName?: string;
  pageName?: string;
  selections: PluginBridgeSelection[];
}

export interface PluginBridgeHealth {
  ok: true;
  schemaVersion: 1;
  hasSnapshot: boolean;
  selectionCount: number;
  capturedAt?: string;
}

export interface PluginBridgeServerOptions {
  host?: "127.0.0.1" | "::1" | "localhost";
  port?: number;
  token?: string;
  maxBodyBytes?: number;
  maxSelections?: number;
}

export interface PluginBridgeServerHandle {
  server: Server;
  host: string;
  port: number;
  url: string;
  token: string;
  getSnapshot(): PluginBridgeSnapshot | undefined;
  close(): Promise<void>;
}

export interface PluginBridgeClientOptions {
  baseUrl?: string;
  token: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  allowNonLoopback?: boolean;
}

interface SnapshotInput {
  fileName?: string;
  pageName?: string;
  selections: PluginBridgeSelection[];
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3845;
const DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_SELECTIONS = 50;
const DEFAULT_TIMEOUT_MS = 10000;

class PayloadTooLargeError extends Error {
  constructor() {
    super("Snapshot payload exceeds the configured size limit.");
    this.name = "PayloadTooLargeError";
  }
}

export class PluginBridgeError extends Error {
  constructor(message: string, public readonly status?: number, public readonly detail?: unknown) {
    super(message);
    this.name = "PluginBridgeError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanOptionalText(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function validateSelection(value: unknown): PluginBridgeSelection {
  if (!isRecord(value)) throw new PluginBridgeError("Each selection must be an object.", 400);
  const id = cleanOptionalText(value.id, 200);
  const name = cleanOptionalText(value.name, 500);
  const type = cleanOptionalText(value.type, 100);
  const document = value.document;
  if (!id || !name || !type || !isRecord(document)) {
    throw new PluginBridgeError("Each selection requires id, name, type, and a REST-shaped document object.", 400);
  }
  const documentId = cleanOptionalText(document.id, 200);
  const documentName = cleanOptionalText(document.name, 500);
  const documentType = cleanOptionalText(document.type, 100);
  if (!documentId || !documentName || !documentType) {
    throw new PluginBridgeError("Selection documents require string id, name, and type fields.", 400);
  }
  return { id, name, type, document: document as unknown as FigmaNode };
}

function validateSnapshotInput(value: unknown, maxSelections: number): SnapshotInput {
  if (!isRecord(value) || !Array.isArray(value.selections)) {
    throw new PluginBridgeError("Snapshot payload requires a selections array.", 400);
  }
  if (value.selections.length < 1) throw new PluginBridgeError("Select at least one Figma node before capturing.", 400);
  if (value.selections.length > maxSelections) {
    throw new PluginBridgeError(`Snapshot contains more than ${maxSelections} selections.`, 400);
  }
  return {
    fileName: cleanOptionalText(value.fileName),
    pageName: cleanOptionalText(value.pageName),
    selections: value.selections.map(validateSelection)
  };
}

function normalizePort(port: number | undefined): number {
  const candidate = port ?? DEFAULT_PORT;
  if (!Number.isInteger(candidate) || candidate < 0 || candidate > 65535) {
    throw new Error("Plugin bridge port must be an integer between 0 and 65535.");
  }
  return candidate;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

export function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function safeTokenEquals(received: string | undefined, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function requestToken(request: IncomingMessage): string | undefined {
  const authorization = request.headers.authorization;
  if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  const alternate = request.headers["x-figma-mcp-bridge-token"];
  return Array.isArray(alternate) ? alternate[0] : alternate;
}

function cors(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Figma-MCP-Bridge-Token");
  response.setHeader("Access-Control-Max-Age", "600");
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  cors(response);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Length", Buffer.byteLength(body));
  response.end(body);
}

function readJson(request: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    request.on("data", (chunk: Buffer | string) => {
      if (settled) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > maxBodyBytes) {
        fail(new PayloadTooLargeError());
        request.resume();
        return;
      }
      chunks.push(buffer);
    });
    request.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new PluginBridgeError("Request body must be valid JSON.", 400));
      }
    });
    request.on("error", fail);
  });
}

function formatBridgeUrl(host: string, port: number): string {
  const urlHost = host === "::1" ? "[::1]" : host === "localhost" ? "localhost" : "127.0.0.1";
  return `http://${urlHost}:${port}`;
}

export async function startPluginBridgeServer(options: PluginBridgeServerOptions = {}): Promise<PluginBridgeServerHandle> {
  const host = options.host ?? DEFAULT_HOST;
  if (!isLoopbackHostname(host)) throw new Error("Plugin bridge must bind to a loopback host.");
  const requestedPort = normalizePort(options.port);
  const token = options.token?.trim() || randomBytes(32).toString("base64url");
  if (token.length < 16) throw new Error("Plugin bridge token must contain at least 16 characters.");
  const maxBodyBytes = positiveInteger(options.maxBodyBytes, DEFAULT_MAX_BODY_BYTES);
  const maxSelections = positiveInteger(options.maxSelections, DEFAULT_MAX_SELECTIONS);
  let snapshot: PluginBridgeSnapshot | undefined;

  const server = createServer(async (request, response) => {
    cors(response);
    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }
    if (!safeTokenEquals(requestToken(request), token)) {
      sendJson(response, 401, { error: "Unauthorized plugin bridge request." });
      return;
    }

    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    try {
      if (request.method === "GET" && requestUrl.pathname === "/health") {
        const health: PluginBridgeHealth = {
          ok: true,
          schemaVersion: 1,
          hasSnapshot: Boolean(snapshot),
          selectionCount: snapshot?.selections.length ?? 0,
          capturedAt: snapshot?.capturedAt
        };
        sendJson(response, 200, health);
        return;
      }
      if (request.method === "GET" && requestUrl.pathname === "/v1/snapshot") {
        if (!snapshot) {
          sendJson(response, 404, { error: "No Figma selection snapshot has been captured." });
          return;
        }
        sendJson(response, 200, snapshot);
        return;
      }
      if (request.method === "POST" && requestUrl.pathname === "/v1/snapshot") {
        const input = validateSnapshotInput(await readJson(request, maxBodyBytes), maxSelections);
        snapshot = {
          schemaVersion: 1,
          source: "figma-plugin",
          capturedAt: new Date().toISOString(),
          fileName: input.fileName,
          pageName: input.pageName,
          selections: input.selections
        };
        sendJson(response, 201, {
          accepted: true,
          capturedAt: snapshot.capturedAt,
          selectionCount: snapshot.selections.length
        });
        return;
      }
      if (request.method === "DELETE" && requestUrl.pathname === "/v1/snapshot") {
        snapshot = undefined;
        sendJson(response, 200, { cleared: true });
        return;
      }
      sendJson(response, 404, { error: "Unknown plugin bridge endpoint." });
    } catch (error) {
      if (error instanceof PayloadTooLargeError) sendJson(response, 413, { error: error.message });
      else if (error instanceof PluginBridgeError) sendJson(response, error.status ?? 400, { error: error.message });
      else sendJson(response, 500, { error: "Plugin bridge request failed." });
    }
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(requestedPort, host);
  });

  const address = server.address() as AddressInfo;
  const port = address.port;
  const url = formatBridgeUrl(host, port);
  return {
    server,
    host,
    port,
    url,
    token,
    getSnapshot: () => snapshot,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}

export class PluginBridgeClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: PluginBridgeClientOptions) {
    const token = options.token?.trim();
    if (!token) throw new Error("FIGMA_PLUGIN_BRIDGE_TOKEN is required.");
    const parsed = new URL(options.baseUrl ?? `http://${DEFAULT_HOST}:${DEFAULT_PORT}`);
    if (parsed.protocol !== "http:") throw new Error("Plugin bridge URL must use http on loopback.");
    if (!options.allowNonLoopback && !isLoopbackHostname(parsed.hostname)) {
      throw new Error("Plugin bridge client refuses non-loopback hosts by default.");
    }
    this.baseUrl = parsed.toString().replace(/\/$/, "");
    this.timeoutMs = positiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS);
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (typeof this.fetchImpl !== "function") throw new Error("global fetch is not available in this runtime");
  }

  private async request<T>(path: string, method = "GET"): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.options.token.trim()}`,
          Accept: "application/json"
        },
        signal: controller.signal
      });
      let detail: unknown;
      try { detail = await response.json(); } catch { detail = undefined; }
      if (!response.ok) {
        const message = isRecord(detail) && typeof detail.error === "string"
          ? detail.error
          : `Plugin bridge request failed: ${response.status}`;
        throw new PluginBridgeError(message, response.status, detail);
      }
      return detail as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new PluginBridgeError(`Plugin bridge request timed out after ${this.timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  health(): Promise<PluginBridgeHealth> {
    return this.request<PluginBridgeHealth>("/health");
  }

  getSnapshot(): Promise<PluginBridgeSnapshot> {
    return this.request<PluginBridgeSnapshot>("/v1/snapshot");
  }

  clearSnapshot(): Promise<{ cleared: true }> {
    return this.request<{ cleared: true }>("/v1/snapshot", "DELETE");
  }
}
