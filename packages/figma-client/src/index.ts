export interface FigmaClientOptions {
  token: string;
  baseUrl?: string; // default https://api.figma.com/v1
  maxRetries?: number; // default 2 for 429/5xx responses
  retryDelayMs?: number; // default 1000, exponential backoff base
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
  return decoded.replace(/-/g, ":");
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

  return {
    fileId: fileIdOrUrl,
    nodeId: nodeId ? normalizeFigmaNodeId(nodeId) : undefined
  };
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string; // e.g., DOCUMENT, PAGE, FRAME, RECTANGLE, TEXT, GROUP, COMPONENT, INSTANCE
  children?: FigmaNode[];
  // optional fields we may use for basic codegen
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  fills?: Array<{ type: string; visible?: boolean; color?: { r: number; g: number; b: number; a?: number } }>;
  characters?: string; // for TEXT nodes
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number]; // TL, TR, BR, BL
  strokes?: Array<{ type: string; visible?: boolean; color?: { r: number; g: number; b: number; a?: number } }>;
  strokeWeight?: number;
  strokeAlign?: string;
  // Auto layout
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  // Text styles
  textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  fontSize?: number;
  lineHeightPx?: number;
  fontWeight?: number;
  fontFamily?: string;
  letterSpacing?: number;
  // Alignment/positioning
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  // Effects (shadow)
  effects?: Array<{
    type: "DROP_SHADOW" | "INNER_SHADOW" | string;
    visible?: boolean;
    color?: { r: number; g: number; b: number; a?: number };
    offset?: { x: number; y: number };
    radius?: number; // blur radius
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
  nodes: Record<string, { document?: FigmaNode; components?: unknown; styles?: unknown }>;
}

export class FigmaApiError extends Error {
  constructor(message: string, public status: number, public detail?: unknown) {
    super(message);
    this.name = "FigmaApiError";
  }
}

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return undefined;
}

export class FigmaClient {
  private baseUrl: string;

  constructor(private opts: FigmaClientOptions) {
    this.baseUrl = opts.baseUrl ?? "https://api.figma.com/v1";
  }

  private headers() {
    return {
      "X-Figma-Token": this.opts.token,
      "Accept": "application/json"
    } as Record<string, string>;
  }

  private ensureFetch(): typeof fetch {
    if (typeof fetch !== "function") {
      throw new Error("global fetch is not available in this runtime");
    }
    return fetch;
  }

  private shouldRetry(status: number): boolean {
    return status === 429 || (status >= 500 && status <= 599);
  }

  private retryDelay(attempt: number, retryAfter: string | null): number {
    const fromHeader = parseRetryAfterMs(retryAfter);
    if (fromHeader !== undefined) return Math.min(fromHeader, MAX_RETRY_DELAY_MS);

    const base = Math.max(0, this.opts.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
    return Math.min(base * 2 ** attempt, MAX_RETRY_DELAY_MS);
  }

  private async requestJson<T>(url: string, errorPrefix: string): Promise<T> {
    const maxRetries = Math.max(0, this.opts.maxRetries ?? DEFAULT_MAX_RETRIES);
    for (let attempt = 0; ; attempt++) {
      const res = await this.ensureFetch()(url, { headers: this.headers() });
      if (res.ok) {
        return res.json() as Promise<T>;
      }

      let detail: unknown;
      try { detail = await res.json(); } catch {}

      if (attempt < maxRetries && this.shouldRetry(res.status)) {
        await sleep(this.retryDelay(attempt, res.headers.get("retry-after")));
        continue;
      }

      const hint = res.status === 429 ? " (rate limited; retry later or reduce request volume)" : "";
      throw new FigmaApiError(`${errorPrefix}: ${res.status}${hint}`, res.status, detail);
    }
  }

  async getFile(fileId: string, depth?: number): Promise<FigmaFile> {
    const params = depth !== undefined ? `?depth=${encodeURIComponent(String(depth))}` : "";
    const url = `${this.baseUrl}/files/${encodeURIComponent(fileId)}${params}`;
    return this.requestJson<FigmaFile>(url, "Failed to fetch file");
  }

  async getComponents(fileId: string): Promise<FigmaComponentsResponse> {
    const url = `${this.baseUrl}/files/${encodeURIComponent(fileId)}/components`;
    return this.requestJson<FigmaComponentsResponse>(url, "Failed to fetch components");
  }

  async listFrames(fileId: string, depth?: number): Promise<FigmaNode[]> {
    const file = await this.getFile(fileId, depth);
    const frames: FigmaNode[] = [];
    const stack: FigmaNode[] = [file.document];
    while (stack.length) {
      const node = stack.pop()!;
      if (node.type === "FRAME") frames.push(node);
      if (node.children?.length) stack.push(...node.children);
    }
    return frames;
  }

  async getNode(fileId: string, nodeId: string): Promise<FigmaNode | undefined> {
    const normalizedNodeId = normalizeFigmaNodeId(nodeId);
    const url = `${this.baseUrl}/files/${encodeURIComponent(fileId)}/nodes?ids=${encodeURIComponent(normalizedNodeId)}`;
    const json = await this.requestJson<FigmaNodesResponse>(url, "Failed to fetch node");
    const entry = json.nodes?.[normalizedNodeId] ?? json.nodes?.[nodeId];
    return entry?.document as FigmaNode | undefined;
  }
}
