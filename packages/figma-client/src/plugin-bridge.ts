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
  sessionId: string;
  capturedAt: string;
  fileName?: string;
  pageName?: string;
  selections: PluginBridgeSelection[];
}

export interface PluginBridgeHealth {
  ok: true;
  schemaVersion: 1;
  sessionId: string;
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
  maxNodes?: number;
  maxDepth?: number;
  requestTimeoutMs?: number;
}

export interface PluginBridgeServerHandle {
  server: Server;
  host: string;
  port: number;
  url: string;
  token: string;
  sessionId: string;
  getSnapshot(): PluginBridgeSnapshot | undefined;
  close(): Promise<void>;
}

export interface PluginBridgeClientOptions {
  baseUrl?: string;
  token: string;
  timeoutMs?: number;
  fetchImpl?: typeof globalThis.fetch;
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
const DEFAULT_MAX_NODES = 10000;
const DEFAULT_MAX_DEPTH = 64;
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_TOKEN_LENGTH = 512;
const MIN_TOKEN_LENGTH = 32;

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

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

function nonNegativeInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
}

function validateDocumentTree(value: unknown, maxNodes: number, maxDepth: number): FigmaNode {
  if (!isRecord(value)) throw new PluginBridgeError("Selection document must be an object.", 400);

  const stack: Array<{ value: Record<string, unknown>; depth: number }> = [{ value, depth: 0 }];
  let nodeCount = 0;

  while (stack.length) {
    const current = stack.pop()!;
    nodeCount += 1;
    if (nodeCount > maxNodes) {
      throw new PluginBridgeError(`Snapshot contains more than ${maxNodes} document nodes.`, 400);
    }
    if (current.depth > maxDepth) {
      throw new PluginBridgeError(`Snapshot document depth exceeds ${maxDepth}.`, 400);
    }

    const id = cleanOptionalText(current.value.id, 200);
    const name = cleanOptionalText(current.value.name, 500);
    const type = cleanOptionalText(current.value.type, 100);
    if (!id || !name || !type) {
      throw new PluginBridgeError("Every REST-shaped document node requires string id, name, and type fields.", 400);
    }

    const children = current.value.children;
    if (children === undefined) continue;
    if (!Array.isArray(children)) {
      throw new PluginBridgeError("Document children must be an array when present.", 400);
    }
    for (const child of children) {
      if (!isRecord(child)) throw new PluginBridgeError("Every document child must be an object.", 400);
      stack.push({ value: child, depth: current.depth + 1 });
    }
  }

  return value as unknown as FigmaNode;
}

function validateSelection(value: unknown, maxNodes: number, maxDepth: number): PluginBridgeSelection {
  if (!isRecord(value)) throw new PluginBridgeError("Each selection must be an object.", 400);
  const id = cleanOptionalText(value.id, 200);
  const name = cleanOptionalText(value.name, 500);
  const type = cleanOptionalText(value.type, 100);
  if (!id || !name || !type) {
    throw new PluginBridgeError("Each selection requires string id, name, and type fields.", 400);
  }
  const document = validateDocumentTree(value.document, maxNodes, maxDepth);
  if (document.id !== id) {
    throw new PluginBridgeError("Selection id must match the exported document id.", 400);
  }
  return { id, name, type, document };
}

function validateSnapshotInput(
  value: unknown,
  maxSelections: number,
  maxNodes: number,
  maxDepth: number
): SnapshotInput {
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
    selections: value.selections.map((selection) => validateSelection(selection, maxNodes, maxDepth))
  };
}

function normalizePort(port: number | undefined): number {
  const candidate = port ?? DEFAULT_PORT;
  if (!Number.isInteger(candidate) || candidate < 0 || candidate > 65535) {
    throw new Error("Plugin bridge port must be an integer between 0 and 65535.");
  }
  return candidate;
}

export function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  const normalized = address.toLowerCase();
  return normalized === "127.0.0.1" || normalized === "::1" || normalized === "::ffff:127.0.0.1";
}

function requestHostIsLoopback(request: IncomingMessage): boolean {
  const host = request.headers.host;
  if (!host || host.length > 300) return false;
  try {
    return isLoopbackHostname(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}

function safeTokenEquals(received: string | undefined, expected: string): boolean {
  if (!received || received.length > MAX_TOKEN_LENGTH) return false;
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

function applyResponseHeaders(response: ServerResponse): void {
  // Figma's plugin Fetch API requires wildcard CORS. The high-entropy bearer token,
  // loopback bind, remote-address check, and Host validation are the authorization boundary.
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Figma-MCP-Bridge-Token");
  response.setHeader("Access-Control-Max-Age", "600");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  applyResponseHeaders(response);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(body));
  response.end(body);
}

function readJson(request: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  const declaredLength = Number(request.headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    return Promise.reject(new PayloadTooLargeError());
  }

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
    request.on("aborted", () => fail(new PluginBridgeError("Request body was aborted.", 400)));
  });
}

function formatBridgeUrl(host: string, port: number): string {
  const urlHost = host === "::1" ? "[::1]" : host === "localhost" ? "localhost" : "127.0.0.1";
  return `http://${urlHost}:${port}`;
}

function requireJsonContentType(request: IncomingMessage): void {
  const contentType = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new PluginBridgeError("Snapshot POST requires Content-Type: application/json.", 415);
  }
}

export async function startPluginBridgeServer(options: PluginBridgeServerOptions = {}): Promise<PluginBridgeServerHandle> {
  const host = options.host ?? DEFAULT_HOST;
  if (!isLoopbackHostname(host)) throw new Error("Plugin bridge must bind to a loopback host.");
  const requestedPort = normalizePort(options.port);
  const token = options.token?.trim() || randomBytes(32).toString("base64url");
  if (token.length < MIN_TOKEN_LENGTH) {
    throw new Error(`Plugin bridge token must contain at least ${MIN_TOKEN_LENGTH} characters.`);
  }
  if (token.length > MAX_TOKEN_LENGTH) throw new Error(`Plugin bridge token must not exceed ${MAX_TOKEN_LENGTH} characters.`);

  const sessionId = randomBytes(16).toString("hex");
  const maxBodyBytes = positiveInteger(options.maxBodyBytes, DEFAULT_MAX_BODY_BYTES);
  const maxSelections = positiveInteger(options.maxSelections, DEFAULT_MAX_SELECTIONS);
  const maxNodes = positiveInteger(options.maxNodes, DEFAULT_MAX_NODES);
  const maxDepth = nonNegativeInteger(options.maxDepth, DEFAULT_MAX_DEPTH);
  const requestTimeoutMs = positiveInteger(options.requestTimeoutMs, DEFAULT_TIMEOUT_MS);
  let snapshot: PluginBridgeSnapshot | undefined;

  const server = createServer(async (request, response) => {
    applyResponseHeaders(response);

    if (!isLoopbackAddress(request.socket.remoteAddress) || !requestHostIsLoopback(request)) {
      sendJson(response, 403, { error: "Plugin bridge accepts only direct loopback requests." });
      return;
    }

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
          sessionId,
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
        requireJsonContentType(request);
        const input = validateSnapshotInput(
          await readJson(request, maxBodyBytes),
          maxSelections,
          maxNodes,
          maxDepth
        );
        snapshot = {
          schemaVersion: 1,
          source: "figma-plugin",
          sessionId,
          capturedAt: new Date().toISOString(),
          fileName: input.fileName,
          pageName: input.pageName,
          selections: input.selections
        };
        sendJson(response, 201, {
          accepted: true,
          sessionId,
          capturedAt: snapshot.capturedAt,
          selectionCount: snapshot.selections.length
        });
        return;
      }
      if (request.method === "DELETE" && requestUrl.pathname === "/v1/snapshot") {
        snapshot = undefined;
        sendJson(response, 200, { cleared: true, sessionId });
        return;
      }
      sendJson(response, 404, { error: "Unknown plugin bridge endpoint." });
    } catch (error) {
      if (error instanceof PayloadTooLargeError) sendJson(response, 413, { error: error.message });
      else if (error instanceof PluginBridgeError) sendJson(response, error.status ?? 400, { error: error.message });
      else sendJson(response, 500, { error: "Plugin bridge request failed." });
    }
  });

  server.requestTimeout = requestTimeoutMs;
  server.headersTimeout = Math.min(requestTimeoutMs, 10000);
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 50;

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
    sessionId,
    getSnapshot: () => snapshot,
    close: () => new Promise<void>((resolve, reject) => {
      snapshot = undefined;
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}

export class PluginBridgeClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly token: string;

  constructor(options: PluginBridgeClientOptions) {
    const token = options.token?.trim();
    if (!token) throw new Error("FIGMA_PLUGIN_BRIDGE_TOKEN is required.");
    if (token.length < MIN_TOKEN_LENGTH || token.length > MAX_TOKEN_LENGTH) {
      throw new Error(`Plugin bridge token must contain ${MIN_TOKEN_LENGTH}-${MAX_TOKEN_LENGTH} characters.`);
    }

    const parsed = new URL(options.baseUrl ?? `http://${DEFAULT_HOST}:${DEFAULT_PORT}`);
    if (parsed.protocol !== "http:") throw new Error("Plugin bridge URL must use http on loopback.");
    if (!isLoopbackHostname(parsed.hostname)) throw new Error("Plugin bridge client refuses non-loopback hosts.");
    if (parsed.username || parsed.password) throw new Error("Plugin bridge URL must not contain credentials.");
    if ((parsed.pathname && parsed.pathname !== "/") || parsed.search || parsed.hash) {
      throw new Error("Plugin bridge URL must be a loopback origin without a path, query, or fragment.");
    }

    this.baseUrl = parsed.origin;
    this.timeoutMs = positiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS);
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.token = token;
    if (typeof this.fetchImpl !== "function") throw new Error("global fetch is not available in this runtime");
  }

  private async request<T>(path: string, method = "GET"): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        redirect: "error",
        headers: {
          Authorization: `Bearer ${this.token}`,
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

  clearSnapshot(): Promise<{ cleared: true; sessionId: string }> {
    return this.request<{ cleared: true; sessionId: string }>("/v1/snapshot", "DELETE");
  }
}
