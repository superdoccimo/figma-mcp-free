export interface FigmaClientOptions {
  token: string;
  baseUrl?: string; // default https://api.figma.com/v1
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

  async getFile(fileId: string): Promise<FigmaFile> {
    const url = `${this.baseUrl}/files/${encodeURIComponent(fileId)}`;
    const res = await this.ensureFetch()(url, { headers: this.headers() });
    if (!res.ok) {
      let detail: unknown;
      try { detail = await res.json(); } catch {}
      throw new FigmaApiError(`Failed to fetch file: ${res.status}`, res.status, detail);
    }
    return res.json() as Promise<FigmaFile>;
  }

  async getComponents(fileId: string): Promise<FigmaComponentsResponse> {
    const url = `${this.baseUrl}/files/${encodeURIComponent(fileId)}/components`;
    const res = await this.ensureFetch()(url, { headers: this.headers() });
    if (!res.ok) {
      let detail: unknown;
      try { detail = await res.json(); } catch {}
      throw new FigmaApiError(`Failed to fetch components: ${res.status}`, res.status, detail);
    }
    return res.json() as Promise<FigmaComponentsResponse>;
  }

  async listFrames(fileId: string): Promise<FigmaNode[]> {
    const file = await this.getFile(fileId);
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
    const url = `${this.baseUrl}/files/${encodeURIComponent(fileId)}/nodes?ids=${encodeURIComponent(nodeId)}`;
    const res = await this.ensureFetch()(url, { headers: this.headers() });
    if (!res.ok) {
      let detail: unknown;
      try { detail = await res.json(); } catch {}
      throw new FigmaApiError(`Failed to fetch node: ${res.status}`, res.status, detail);
    }
    const json = await res.json() as FigmaNodesResponse;
    const entry = json.nodes?.[nodeId];
    return entry?.document as FigmaNode | undefined;
  }
}
