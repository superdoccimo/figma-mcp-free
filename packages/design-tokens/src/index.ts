export interface TokenValue<T = string> { value: T; type?: string }
export interface DesignTokens {
  $schema?: string;
  color?: Record<string, TokenValue>;
  size?: Record<string, TokenValue<number | string>>;
  spacing?: Record<string, TokenValue<number | string>>;
  typography?: Record<string, { value: {
    fontFamily?: string | string[];
    fontSize?: number | string;
    lineHeight?: number | string;
    letterSpacing?: number | string;
    fontWeight?: number | string;
    textCase?: string;
    textDecoration?: string;
  } }>;
  shadow?: Record<string, { value: string | {
    inset?: boolean | string;
    x?: number | string; y?: number | string;
    offset?: { x?: number | string; y?: number | string };
    blur?: number | string; radius?: number | string;
    spread?: number | string;
    color?: string;
    type?: string; // DROP_SHADOW / INNER_SHADOW / etc.
  } | Array<any> }>;
}

type AnyNode = {
  id: string;
  name: string;
  type: string;
  children?: AnyNode[];
  // optional Figma fields we may inspect defensively
  fills?: Array<{ type: string; visible?: boolean; color?: { r: number; g: number; b: number; a?: number } }>;
};

function toHex(n: number): string {
  const s = Math.max(0, Math.min(255, Math.round(n))).toString(16);
  return s.length === 1 ? "0" + s : s;
}

function figmaColorToHex(c: { r: number; g: number; b: number; a?: number }): string {
  const r = toHex(c.r * 255);
  const g = toHex(c.g * 255);
  const b = toHex(c.b * 255);
  const a = c.a === undefined || c.a >= 1 ? "" : toHex(c.a * 255);
  return a ? `#${r}${g}${b}${a}` : `#${r}${g}${b}`;
}

function normalizeName(s: string): string {
  return s
    .trim()
    .replace(/[^a-zA-Z0-9\-_\s/]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function collectColorTokens(root: AnyNode): Record<string, TokenValue> {
  const out: Record<string, TokenValue> = {};
  const stack: Array<{ node: AnyNode; path: string[] }> = [{ node: root, path: [normalizeName(root.name) || root.id] }];

  while (stack.length) {
    const { node, path } = stack.pop()!;
    const keyBase = path.filter(Boolean).join("/");
    // Extract solid fills if present
    const fills = Array.isArray((node as any).fills) ? (node as any).fills as AnyNode["fills"] : undefined;
    if (fills && fills.length) {
      let idx = 0;
      for (const f of fills) {
        if (!f || f.visible === false) continue;
        if (f.type === "SOLID" && f.color) {
          const name = idx === 0 ? `${keyBase}` : `${keyBase}-${idx}`;
          out[name] = { value: figmaColorToHex(f.color), type: "color" };
          idx++;
        }
      }
    }
    if (node.children?.length) {
      for (const child of node.children) {
        const childName = normalizeName(child.name) || child.id;
        stack.push({ node: child, path: [...path, childName] });
      }
    }
  }

  return out;
}

export function toDesignTokens(figmaFile: unknown): DesignTokens {
  const file = figmaFile as { document?: AnyNode };
  const tokens: DesignTokens = {
    $schema: "https://design-tokens.github.io/community-group/format/module.v1.json",
  };
  if (file && file.document) {
    const colors = collectColorTokens(file.document);
    if (Object.keys(colors).length) tokens.color = colors;
    const { spacing, size } = collectSpacingAndSizeTokens(file.document);
    if (Object.keys(spacing).length) tokens.spacing = spacing;
    if (Object.keys(size).length) tokens.size = size;
    const typography = collectTypographyTokens(file.document);
    if (Object.keys(typography).length) tokens.typography = typography;
    const shadow = collectShadowTokens(file.document);
    if (Object.keys(shadow).length) tokens.shadow = shadow as any;
  }
  return tokens;
}

function collectSpacingAndSizeTokens(root: AnyNode): { spacing: Record<string, TokenValue<number>>; size: Record<string, TokenValue<number>> } {
  const spacing: Record<string, TokenValue<number>> = {};
  const size: Record<string, TokenValue<number>> = {};
  const stack: Array<{ node: AnyNode; path: string[] }> = [{ node: root, path: [normalizeName(root.name) || root.id] }];
  while (stack.length) {
    const { node, path } = stack.pop()!;
    const keyBase = path.filter(Boolean).join("/");
    // padding → spacing tokens
    const paddings: Array<[string, number | undefined]> = [
      ["top", (node as any).paddingTop],
      ["right", (node as any).paddingRight],
      ["bottom", (node as any).paddingBottom],
      ["left", (node as any).paddingLeft],
    ];
    for (const [dir, v] of paddings) {
      if (typeof v === "number" && isFinite(v) && v > 0) {
        spacing[`${keyBase}-padding-${dir}`] = { value: Math.round(v), type: "spacing" };
      }
    }
    // width/height → size tokens
    const bb = (node as any).absoluteBoundingBox as { width?: number; height?: number } | undefined;
    if (bb?.width && isFinite(bb.width)) size[`${keyBase}-width`] = { value: Math.round(bb.width), type: "dimension" };
    if (bb?.height && isFinite(bb.height)) size[`${keyBase}-height`] = { value: Math.round(bb.height), type: "dimension" };

    if (node.children?.length) {
      for (const child of node.children) {
        const childName = normalizeName(child.name) || child.id;
        stack.push({ node: child, path: [...path, childName] });
      }
    }
  }
  return { spacing, size };
}

function collectTypographyTokens(root: AnyNode): DesignTokens["typography"] {
  const out: NonNullable<DesignTokens["typography"]> = {};
  const stack: Array<{ node: AnyNode; path: string[] }> = [{ node: root, path: [normalizeName(root.name) || root.id] }];
  while (stack.length) {
    const { node, path } = stack.pop()!;
    const keyBase = path.filter(Boolean).join("/");
    if (node.type === "TEXT") {
      const fontSize = (node as any).fontSize as number | undefined;
      const lineHeightPx = (node as any).lineHeightPx as number | undefined;
      const fontWeight = (node as any).fontWeight as number | undefined;
      const fontFamily = (node as any).fontFamily as string | undefined;
      const letterSpacing = (node as any).letterSpacing as number | undefined;
      const value: any = {};
      if (typeof fontFamily === "string") value.fontFamily = fontFamily;
      if (typeof fontSize === "number") value.fontSize = Math.round(fontSize);
      if (typeof lineHeightPx === "number") value.lineHeight = Math.round(lineHeightPx);
      if (typeof letterSpacing === "number") value.letterSpacing = Math.round(letterSpacing);
      if (typeof fontWeight === "number") value.fontWeight = Math.round(fontWeight);
      if (Object.keys(value).length) {
        out[`${keyBase}`] = { value } as any;
      }
    }
    if (node.children?.length) {
      for (const child of node.children) {
        const childName = normalizeName(child.name) || child.id;
        stack.push({ node: child, path: [...path, childName] });
      }
    }
  }
  return out;
}

function collectShadowTokens(root: AnyNode): Record<string, { value: string }> {
  const out: Record<string, { value: string }> = {};
  const stack: Array<{ node: AnyNode; path: string[] }> = [{ node: root, path: [normalizeName(root.name) || root.id] }];
  while (stack.length) {
    const { node, path } = stack.pop()!;
    const keyBase = path.filter(Boolean).join("/");
    const effects = (node as any).effects as Array<any> | undefined;
    if (effects && effects.length) {
      const parts: string[] = [];
      for (const e of effects) {
        if (!e || e.visible === false) continue;
        if (e.type !== "DROP_SHADOW" && e.type !== "INNER_SHADOW") continue;
        const inset = e.type === "INNER_SHADOW" ? "inset " : "";
        const dx = Math.round(e.offset?.x ?? 0);
        const dy = Math.round(e.offset?.y ?? 0);
        const blur = Math.round(e.radius ?? 0);
        const spread = Math.round(e.spread ?? 0);
        let color = "#000000";
        if (e.color) color = figmaColorToHex(e.color).toLowerCase();
        parts.push(`${inset}${dx}px ${dy}px ${blur}px ${spread}px ${color}`);
      }
      if (parts.length) out[`${keyBase}`] = { value: parts.join(", ") };
    }
    if (node.children?.length) {
      for (const child of node.children) {
        const childName = normalizeName(child.name) || child.id;
        stack.push({ node: child, path: [...path, childName] });
      }
    }
  }
  return out;
}

function sanitizeVarKey(s: string): string {
  return s.replace(/[^a-z0-9\-\/]+/gi, "-").replace(/[\/]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

export function buildCssVarIndex(tokens: DesignTokens, opts?: { prefix?: string }) {
  const prefix = opts?.prefix ?? "--";
  const colorMap: Record<string, string> = {};
  const colors = tokens.color ?? {};
  for (const [key, tv] of Object.entries(colors)) {
    const val = tv?.value;
    if (!val || typeof val !== "string") continue;
    const hex = val.trim().toLowerCase();
    const varName = `var(${prefix}color-${sanitizeVarKey(key)})`;
    colorMap[hex] = varName;
  }
  return { colorMap };
}

function toPxNumber(v: unknown): number | undefined {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const m = v.trim().match(/^([0-9]+(?:\.[0-9]+)?)px$/i);
    if (m) return parseFloat(m[1]);
    const n = Number(v);
    if (isFinite(n)) return n;
  }
  return undefined;
}

export function buildTypographyVarIndex(tokens: DesignTokens, opts?: { prefix?: string }) {
  const prefix = opts?.prefix ?? "--";
  const fontSizeMap: Record<number, string> = {};
  const lineHeightMap: Record<number, string> = {};
  const letterSpacingMap: Record<number, string> = {};
  const fontFamilyMap: Record<string, string> = {};
  const fontWeightMap: Record<number, string> = {};

  const typos = tokens.typography ?? {};
  for (const [key, obj] of Object.entries(typos)) {
    const v = obj?.value ?? {} as any;
    const base = `${prefix}typography-${sanitizeVarKey(key)}`;
    const fs = toPxNumber(v.fontSize);
    if (typeof fs === "number") fontSizeMap[Math.round(fs)] = `var(${base}-font-size)`;
    const lh = toPxNumber(v.lineHeight);
    if (typeof lh === "number") lineHeightMap[Math.round(lh)] = `var(${base}-line-height)`;
    const ls = toPxNumber(v.letterSpacing);
    if (typeof ls === "number") letterSpacingMap[Math.round(ls)] = `var(${base}-letter-spacing)`;
    const ff = Array.isArray(v.fontFamily) ? v.fontFamily.join(",") : v.fontFamily;
    if (typeof ff === "string" && ff.trim()) fontFamilyMap[ff.trim()] = `var(${base}-font-family)`;
    const fw = toPxNumber(v.fontWeight);
    if (typeof fw === "number") fontWeightMap[Math.round(fw)] = `var(${base}-font-weight)`;
  }

  return { fontSizeMap, lineHeightMap, letterSpacingMap, fontFamilyMap, fontWeightMap };
}

export function buildSizeSpacingVarIndex(tokens: DesignTokens, opts?: { prefix?: string }) {
  const prefix = opts?.prefix ?? "--";
  const sizePxMap: Record<number, string> = {};
  const spacingPxMap: Record<number, string> = {};

  const sizes = tokens.size ?? {};
  for (const [key, tv] of Object.entries(sizes)) {
    const v = toPxNumber(tv?.value);
    if (typeof v === "number") sizePxMap[Math.round(v)] = `var(${prefix}size-${sanitizeVarKey(key)})`;
  }

  const spacings = tokens.spacing ?? {};
  for (const [key, tv] of Object.entries(spacings)) {
    const v = toPxNumber(tv?.value);
    if (typeof v === "number") spacingPxMap[Math.round(v)] = `var(${prefix}spacing-${sanitizeVarKey(key)})`;
  }

  return { sizePxMap, spacingPxMap };
}

export function normalizeHex(hex: string): string {
  const s = hex.trim().toLowerCase();
  if (/^#([0-9a-f]{3,4})$/.test(s)) {
    // expand #rgb or #rgba to #rrggbb or #rrggbbaa
    const h = s.slice(1);
    const parts = h.split("").map(ch => ch + ch).join("");
    return "#" + parts;
  }
  return s;
}

export function shadowKey(inset: boolean, dx: number, dy: number, blur: number, spread: number, colorHexLower?: string) {
  const c = colorHexLower ? normalizeHex(colorHexLower) : "";
  return `${inset ? 1 : 0}:${Math.round(dx)}:${Math.round(dy)}:${Math.round(blur)}:${Math.round(spread)}:${c}`;
}

function parseMaybePx(n: unknown): number | undefined {
  return toPxNumber(n);
}

export function buildShadowVarIndex(tokens: DesignTokens, opts?: { prefix?: string }) {
  const prefix = opts?.prefix ?? "--";
  const map: Record<string, string> = {};
  const shadows = tokens.shadow ?? {};
  for (const [key, entry] of Object.entries(shadows)) {
    const val = (entry as any)?.value;
    const varName = `var(${prefix}shadow-${sanitizeVarKey(key)})`;
    const push = (inset: boolean, dx?: any, dy?: any, blur?: any, spread?: any, color?: any) => {
      const k = shadowKey(!!inset, Math.round(parseMaybePx(dx) ?? 0), Math.round(parseMaybePx(dy) ?? 0), Math.round(parseMaybePx(blur) ?? 0), Math.round(parseMaybePx(spread) ?? 0), typeof color === "string" ? color : undefined);
      map[k] = varName;
    };
    if (typeof val === "string") {
      // naive parser for "inset? dx dy blur [spread] color" (comma-separated supports multiple)
      const parts = val.split(/\s*,\s*/);
      for (const p of parts) {
        const tokens = p.trim().split(/\s+/);
        let inset = false;
        let dx: any, dy: any, blur: any, spread: any, color: any;
        let i = 0;
        if (tokens[i] === "inset") { inset = true; i++; }
        dx = tokens[i++]; dy = tokens[i++]; blur = tokens[i++];
        if (tokens[i] && /^-?\d/.test(tokens[i])) { spread = tokens[i++]; }
        color = tokens[i];
        push(inset, dx, dy, blur, spread, color);
      }
      continue;
    }
    if (Array.isArray(val)) {
      for (const v of val) {
        const inset = !!(v?.inset || (typeof v?.type === "string" && v.type.toUpperCase().includes("INNER")));
        const dx = v?.x ?? v?.offset?.x ?? 0;
        const dy = v?.y ?? v?.offset?.y ?? 0;
        const blur = v?.blur ?? v?.radius ?? 0;
        const spread = v?.spread ?? 0;
        const color = v?.color;
        push(inset, dx, dy, blur, spread, color);
      }
      continue;
    }
    if (typeof val === "object" && val) {
      const v = val as any;
      const inset = !!(v?.inset || (typeof v?.type === "string" && v.type.toUpperCase().includes("INNER")));
      const dx = v?.x ?? v?.offset?.x ?? 0;
      const dy = v?.y ?? v?.offset?.y ?? 0;
      const blur = v?.blur ?? v?.radius ?? 0;
      const spread = v?.spread ?? 0;
      const color = v?.color;
      push(inset, dx, dy, blur, spread, color);
      continue;
    }
  }
  return { map };
}
