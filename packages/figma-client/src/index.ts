export interface FigmaClientOptions {
  token: string;
  baseUrl?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  requestTimeoutMs?: number;
  maxRetryDelayMs?: number;
  maxAutomaticRetryAfterMs?: number;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
  nodeBatchSize?: number;
  maxNodeIdsPerRequest?: number;
  requestBudget?: number;
  fetchImpl?: typeof globalThis.fetch;
  fetch?: typeof globalThis.fetch;
}

export type FigmaCachePolicy = "default" | "reload" | "no-store";

export interface FigmaRequestOptions {
  cache?: FigmaCachePolicy;
  cacheTtlMs?: number;
}

export interface FigmaClientStats {
  cacheHits: number;
  cacheMisses: number;
  networkRequests: number;
  retries: number;
  inFlightJoins: number;
  cacheEntries: number;
  readonly deduplicatedRequests: number;
}

export interface FigmaRequestBudgetState {
  limit: number | null;
  used: number;
  remaining: number | null;
}

export interface FigmaBackendCapabilities {
  backend: "rest";
  read: true;
  write: false;
  headless: true;
  requiresPersonalAccessToken: true;
}

export interface FigmaReadBackend {
  getCapabilities(): FigmaBackendCapabilities;
  getFile(fileId: string, depth?: number, options?: FigmaRequestOptions): Promise<FigmaFile>;
  getComponents(fileId: string, options?: FigmaRequestOptions): Promise<FigmaComponentsResponse>;
  listFrames(fileId: string, depth?: number, options?: FigmaRequestOptions): Promise<FigmaNode[]>;
  getNodes(
    fileId: string,
    nodeIds: readonly string[],
    depth?: number,
    options?: FigmaRequestOptions
  ): Promise<Record<string, FigmaNode | undefined>>;
  getNode(
    fileId: string,
    nodeId: string,
    depth?: number,
    options?: FigmaRequestOptions
  ): Promise<FigmaNode | undefined>;
}

export interface FigmaReference {
  fileId: string;
  nodeId?: string;
  urlType?: "file" | "design";
}

export function normalizeFigmaNodeId(nodeId: string): string {
  let decoded = nodeId.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep the original string if it is not valid percent-encoding.
  }

  const numericShareId = /^(\d+)-(\d+)$/.exec(decoded);
  return numericShareId ? `${numericShareId[1]}:${numericShareId[2]}` : decoded;
}

export function parseFigmaUrl(value: string): FigmaReference | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname !== "figma.com" && !hostname.endsWith(".figma.com")) {
    return undefined;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const kindIndex = parts.findIndex((part) => part === "file" || part === "design" || part === "slides");
  const kind = parts[kindIndex];
  if (kind === "slides") {
    throw new Error("/slides links are not supported by the Figma REST API. Use a /file or /design link to the selected frame.");
  }
  if (kind !== "file" && kind !== "design") {
    throw new Error("Figma URL must contain /file/<FILE_ID> or /design/<FILE_ID>.");
  }

  const fileId = parts[kindIndex + 1];
  if (!fileId) {
    throw new Error("Figma URL is missing the file ID after /file or /design.");
  }

  const rawNodeId = url.searchParams.get("node-id") ?? url.searchParams.get("node_id") ?? undefined;
  return {
    fileId,
    nodeId: rawNodeId ? normalizeFigmaNodeId(rawNodeId) : undefined,
    urlType: kind
  };
}

export function resolveFigmaReference(fileIdOrUrl: string, nodeId?: string): FigmaReference {
  const parsed = parseFigmaUrl(fileIdOrUrl);
  if (parsed) {
    return {
      ...parsed,
      nodeId: nodeId ? normalizeFigmaNodeId(nodeId) : parsed.nodeId
    };
  }

  const fileId = fileIdOrUrl.trim();
  if (!fileId) throw new Error("Figma file ID must not be empty.");
  return {
    fileId,
    nodeId: nodeId ? normalizeFigmaNodeId(nodeId) : undefined
  };
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface FigmaPaint {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  blendMode?: string;
  imageRef?: string;
  scaleMode?: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  visible?: boolean;
  opacity?: number;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  fills?: FigmaPaint[];
  characters?: string;
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  strokeAlign?: string;
  constraints?: { horizontal?: string; vertical?: string };
  componentId?: string;
  componentProperties?: Record<string, { type?: string; value?: unknown; preferredValues?: unknown[] }>;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  fontSize?: number;
  lineHeightPx?: number;
  fontWeight?: number;
  fontFamily?: string;
  letterSpacing?: number;
  style?: {
    fontFamily?: string;
    fontPostScriptName?: string;
    fontWeight?: number;
    fontSize?: number;
    textAlignHorizontal?: string;
    textAlignVertical?: string;
    letterSpacing?: number;
    lineHeightPx?: number;
    lineHeightPercent?: number;
    lineHeightUnit?: string;
  };
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  effects?: Array<{
    type: "DROP_SHADOW" | "INNER_SHADOW" | string;
    visible?: boolean;
    color?: FigmaColor;
    offset?: { x: number; y: number };
    radius?: number;
    spread?: number;
  }>;
}

export interface FigmaFile {
  name: string;
  document: FigmaNode;
}

export interface FigmaComponentsResponse {
  meta: {
    components: Array<{
      key: string;
      file_key: string;
      node_id: string;
      name: string;
      description?: string;
    }>;
  };
}

export interface FigmaNodesResponse {
  nodes: Record<string, { document?: FigmaNode; components?: unknown; styles?: unknown } | null>;
}

export interface FigmaRateLimitInfo {
  retryAfterMs?: number;
  planTier?: string;
  rateLimitType?: string;
  upgradeUrl?: string;
  requestId?: string;
}

export interface FigmaRateLimitErrorInfo extends FigmaRateLimitInfo {
  retryable: boolean;
}

export class FigmaApiError extends Error {
  readonly retryAfterMs?: number;
  readonly planTier?: string;
  readonly rateLimitType?: string;
  readonly upgradeUrl?: string;
  readonly requestId?: string;

  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: unknown,
    rateLimit: FigmaRateLimitInfo = {}
  ) {
    super(message);
    this.name = "FigmaApiError";
    this.retryAfterMs = rateLimit.retryAfterMs;
    this.planTier = rateLimit.planTier;
    this.rateLimitType = rateLimit.rateLimitType;
    this.upgradeUrl = rateLimit.upgradeUrl;
    this.requestId = rateLimit.requestId;
  }
}

export class FigmaRateLimitError extends FigmaApiError {
  readonly info: Readonly<FigmaRateLimitErrorInfo>;

  constructor(message: string, detail: unknown, info: FigmaRateLimitErrorInfo) {
    super(message, 429, detail, info);
    this.name = "FigmaRateLimitError";
    this.info = Object.freeze({ ...info });
  }
}

export class FigmaRequestTimeoutError extends Error {
  constructor(
    public readonly timeoutMs: number,
    public readonly requestUrl?: string
  ) {
    super(`Figma API request timed out after ${timeoutMs}ms.`);
    this.name = "FigmaRequestTimeoutError";
  }
}

export class FigmaRequestBudgetError extends Error {
  constructor(
    public readonly limit: number,
    public readonly used: number
  ) {
    super(`Figma API request budget exhausted (${used}/${limit} network attempts used).`);
    this.name = "FigmaRequestBudgetError";
  }
}

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 20000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_CACHE_ENTRIES = 128;
const DEFAULT_NODE_BATCH_SIZE = 100;
const DEFAULT_MAX_RETRY_DELAY_MS = 30000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return undefined;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

function nonNegativeInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
}

function optionalNonNegativeInteger(value: number | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer.`);
  return value;
}

function normalizeDepth(depth?: number): number | undefined {
  if (depth === undefined) return undefined;
  if (!Number.isInteger(depth) || depth < 0) throw new Error("depth must be a non-negative integer.");
  return depth;
}

function rateLimitInfo(headers: Headers): FigmaRateLimitInfo {
  return {
    retryAfterMs: parseRetryAfterMs(headers.get("retry-after")),
    planTier: headers.get("x-figma-plan-tier") ?? undefined,
    rateLimitType: headers.get("x-figma-rate-limit-type") ?? undefined,
    upgradeUrl: headers.get("x-figma-upgrade-link") ?? undefined,
    requestId: headers.get("x-figma-request-id") ?? headers.get("x-request-id") ?? undefined
  };
}

function isClearlyLongLivedRateLimit(info: FigmaRateLimitInfo, maxWaitMs: number): boolean {
  if (info.retryAfterMs !== undefined && info.retryAfterMs > maxWaitMs) return true;
  const type = info.rateLimitType?.toLowerCase() ?? "";
  return ["monthly", "daily", "quota", "plan", "subscription", "seat"].some((marker) => type.includes(marker));
}

export class FigmaClient implements FigmaReadBackend {
  private readonly baseUrl: string;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly requestBudget?: number;
  private readonly counters = {
    cacheHits: 0,
    cacheMisses: 0,
    networkRequests: 0,
    retries: 0,
    inFlightJoins: 0
  };

  constructor(private readonly opts: FigmaClientOptions) {
    if (!opts.token?.trim()) throw new Error("Figma token must not be empty.");
    this.baseUrl = (opts.baseUrl ?? "https://api.figma.com/v1").replace(/\/+$/, "");
    this.requestBudget = optionalNonNegativeInteger(opts.requestBudget, "requestBudget");
  }

  getCapabilities(): FigmaBackendCapabilities {
    return {
      backend: "rest",
      read: true,
      write: false,
      headless: true,
      requiresPersonalAccessToken: true
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getStats(): FigmaClientStats {
    this.pruneExpiredCache();
    const stats = {
      ...this.counters,
      cacheEntries: this.cache.size
    };
    Object.defineProperty(stats, "deduplicatedRequests", {
      value: this.counters.inFlightJoins,
      enumerable: false,
      configurable: false,
      writable: false
    });
    return stats as FigmaClientStats;
  }

  getRequestBudgetState(): FigmaRequestBudgetState {
    const used = this.counters.networkRequests;
    if (this.requestBudget === undefined) {
      return { limit: null, used, remaining: null };
    }
    return {
      limit: this.requestBudget,
      used,
      remaining: Math.max(0, this.requestBudget - used)
    };
  }

  private headers(): Record<string, string> {
    return {
      "X-Figma-Token": this.opts.token,
      "Accept": "application/json"
    };
  }

  private ensureFetch(): typeof globalThis.fetch {
    const implementation = this.opts.fetchImpl ?? this.opts.fetch ?? globalThis.fetch;
    if (typeof implementation !== "function") throw new Error("global fetch is not available in this runtime");
    return implementation;
  }

  private maxRetryDelayMs(): number {
    return nonNegativeInteger(this.opts.maxRetryDelayMs, DEFAULT_MAX_RETRY_DELAY_MS);
  }

  private maxAutomaticRetryAfterMs(): number {
    const configured = nonNegativeInteger(
      this.opts.maxAutomaticRetryAfterMs,
      this.maxRetryDelayMs()
    );
    return Math.min(configured, this.maxRetryDelayMs());
  }

  private shouldRetry(status: number): boolean {
    return status === 429 || (status >= 500 && status <= 599);
  }

  private fallbackRetryDelay(attempt: number): number {
    const base = nonNegativeInteger(this.opts.retryDelayMs, DEFAULT_RETRY_DELAY_MS);
    return Math.min(base * 2 ** attempt, this.maxRetryDelayMs());
  }

  private retryDelay(attempt: number, info: FigmaRateLimitInfo): number {
    return Math.min(info.retryAfterMs ?? this.fallbackRetryDelay(attempt), this.maxRetryDelayMs());
  }

  private rateLimitIsRetryable(info: FigmaRateLimitInfo): boolean {
    return !isClearlyLongLivedRateLimit(info, this.maxAutomaticRetryAfterMs());
  }

  private canAutomaticallyRetry(attempt: number, status: number, info: FigmaRateLimitInfo): boolean {
    const maxRetries = nonNegativeInteger(this.opts.maxRetries, DEFAULT_MAX_RETRIES);
    if (attempt >= maxRetries || !this.shouldRetry(status)) return false;
    if (status !== 429) return true;
    return this.rateLimitIsRetryable(info);
  }

  private consumeRequestBudget(): void {
    const used = this.counters.networkRequests;
    if (this.requestBudget !== undefined && used >= this.requestBudget) {
      throw new FigmaRequestBudgetError(this.requestBudget, used);
    }
    this.counters.networkRequests += 1;
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const timeoutMs = positiveInteger(this.opts.requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    this.consumeRequestBudget();

    try {
      const request = this.ensureFetch()(url, { headers: this.headers(), signal: controller.signal });
      const timeout = new Promise<Response>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new FigmaRequestTimeoutError(timeoutMs, url));
        }, timeoutMs);
      });
      return await Promise.race([request, timeout]);
    } catch (error) {
      if (error instanceof FigmaRequestTimeoutError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new FigmaRequestTimeoutError(timeoutMs, url);
      }
      throw error;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private pruneExpiredCache(now = Date.now()): void {
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
  }

  private cacheGet<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value as T;
  }

  private cacheSet(key: string, value: unknown, ttlMs: number): void {
    if (ttlMs <= 0) return;
    this.pruneExpiredCache();
    const maxEntries = positiveInteger(this.opts.maxCacheEntries, DEFAULT_MAX_CACHE_ENTRIES);
    while (this.cache.size >= maxEntries) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (!oldest) break;
      this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  private async executeRequest<T>(url: string, errorPrefix: string): Promise<T> {
    const maxRetries = nonNegativeInteger(this.opts.maxRetries, DEFAULT_MAX_RETRIES);
    for (let attempt = 0; ; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchWithTimeout(url);
      } catch (error) {
        if (error instanceof FigmaRequestBudgetError) throw error;
        if (attempt < maxRetries) {
          this.counters.retries += 1;
          await sleep(this.fallbackRetryDelay(attempt));
          continue;
        }
        throw error;
      }

      if (response.ok) {
        try {
          return await response.json() as T;
        } catch (error) {
          throw new FigmaApiError(`${errorPrefix}: invalid JSON response`, response.status, error);
        }
      }

      let detail: unknown;
      try {
        detail = await response.json();
      } catch {
        try {
          detail = await response.text();
        } catch {
          detail = undefined;
        }
      }

      const limit = rateLimitInfo(response.headers);
      if (this.canAutomaticallyRetry(attempt, response.status, limit)) {
        this.counters.retries += 1;
        await sleep(this.retryDelay(attempt, limit));
        continue;
      }

      const retryHint = response.status === 429
        ? limit.retryAfterMs !== undefined
          ? `; retry after ${Math.ceil(limit.retryAfterMs / 1000)}s`
          : "; rate limited"
        : "";
      const planHint = limit.planTier ? `; plan=${limit.planTier}` : "";
      const typeHint = limit.rateLimitType ? `; limit=${limit.rateLimitType}` : "";
      const message = `${errorPrefix}: ${response.status}${retryHint}${planHint}${typeHint}`;

      if (response.status === 429) {
        throw new FigmaRateLimitError(message, detail, {
          ...limit,
          retryable: this.rateLimitIsRetryable(limit)
        });
      }
      throw new FigmaApiError(message, response.status, detail, limit);
    }
  }

  private async requestJson<T>(url: string, errorPrefix: string, options: FigmaRequestOptions = {}): Promise<T> {
    const policy = options.cache ?? "default";
    const ttlMs = nonNegativeInteger(options.cacheTtlMs, nonNegativeInteger(this.opts.cacheTtlMs, DEFAULT_CACHE_TTL_MS));

    if (policy === "default") {
      if (ttlMs > 0) {
        const cached = this.cacheGet<T>(url);
        if (cached !== undefined) {
          this.counters.cacheHits += 1;
          return cached;
        }
        this.counters.cacheMisses += 1;
      }

      const existing = this.inFlight.get(url);
      if (existing) {
        this.counters.inFlightJoins += 1;
        return existing as Promise<T>;
      }
    }

    const request = this.executeRequest<T>(url, errorPrefix);
    if (policy === "default") this.inFlight.set(url, request);
    try {
      const value = await request;
      if (policy !== "no-store") this.cacheSet(url, value, ttlMs);
      return value;
    } finally {
      if (this.inFlight.get(url) === request) this.inFlight.delete(url);
    }
  }

  async getFile(fileId: string, depth?: number, options?: FigmaRequestOptions): Promise<FigmaFile> {
    const normalizedDepth = normalizeDepth(depth);
    const params = normalizedDepth !== undefined ? `?depth=${encodeURIComponent(String(normalizedDepth))}` : "";
    const url = `${this.baseUrl}/files/${encodeURIComponent(fileId)}${params}`;
    return this.requestJson<FigmaFile>(url, "Failed to fetch file", options);
  }

  async getComponents(fileId: string, options?: FigmaRequestOptions): Promise<FigmaComponentsResponse> {
    const url = `${this.baseUrl}/files/${encodeURIComponent(fileId)}/components`;
    return this.requestJson<FigmaComponentsResponse>(url, "Failed to fetch components", options);
  }

  async listFrames(fileId: string, depth?: number, options?: FigmaRequestOptions): Promise<FigmaNode[]> {
    const file = await this.getFile(fileId, depth, options);
    const frames: FigmaNode[] = [];
    const stack: FigmaNode[] = [file.document];
    while (stack.length) {
      const node = stack.pop()!;
      if (node.type === "FRAME") frames.push(node);
      if (node.children?.length) stack.push(...node.children);
    }
    return frames;
  }

  async getNodes(
    fileId: string,
    nodeIds: readonly string[],
    depth?: number,
    options?: FigmaRequestOptions
  ): Promise<Record<string, FigmaNode | undefined>> {
    const normalizedDepth = normalizeDepth(depth);
    const normalized = [...new Set(nodeIds.map(normalizeFigmaNodeId).filter(Boolean))];
    if (!normalized.length) throw new Error("At least one node ID is required.");

    const batchSize = positiveInteger(
      this.opts.maxNodeIdsPerRequest ?? this.opts.nodeBatchSize,
      DEFAULT_NODE_BATCH_SIZE
    );
    const result: Record<string, FigmaNode | undefined> = {};
    for (let offset = 0; offset < normalized.length; offset += batchSize) {
      const batch = normalized.slice(offset, offset + batchSize);
      const params = new URLSearchParams({ ids: batch.join(",") });
      if (normalizedDepth !== undefined) params.set("depth", String(normalizedDepth));
      const url = `${this.baseUrl}/files/${encodeURIComponent(fileId)}/nodes?${params.toString()}`;
      const json = await this.requestJson<FigmaNodesResponse>(url, "Failed to fetch nodes", options);
      for (const id of batch) result[id] = json.nodes?.[id]?.document;
    }
    return result;
  }

  async getNode(fileId: string, nodeId: string, depth?: number, options?: FigmaRequestOptions): Promise<FigmaNode | undefined> {
    const normalizedNodeId = normalizeFigmaNodeId(nodeId);
    const nodes = await this.getNodes(fileId, [normalizedNodeId], depth, options);
    return nodes[normalizedNodeId];
  }
}

export * from "./selection.js";
