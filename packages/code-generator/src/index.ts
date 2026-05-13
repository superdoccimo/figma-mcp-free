export type Framework = "react" | "vue" | "svelte" | "html";
export interface GenerateOptions {
  colorVar?: (hex: string) => string | undefined;
  typography?: {
    fontSize?: (px: number) => string | undefined;
    lineHeight?: (px: number) => string | undefined;
    letterSpacing?: (px: number) => string | undefined;
    fontFamily?: (name: string) => string | undefined;
    fontWeight?: (w: number) => string | undefined;
  };
  dimension?: (px: number) => string | undefined;
  spacing?: (px: number) => string | undefined;
  shadowVar?: (args: { inset: boolean; dx: number; dy: number; blur: number; spread: number; color: string | undefined }) => string | undefined;
}

export interface NodeLike {
  id: string;
  name: string;
  type: string;
  children?: NodeLike[];
  absoluteBoundingBox?: { x?: number; y?: number; width: number; height: number };
  fills?: Array<{ type: string; visible?: boolean; color?: { r: number; g: number; b: number; a?: number } }>;
  characters?: string;
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  strokes?: Array<{ type: string; visible?: boolean; color?: { r: number; g: number; b: number; a?: number } }>;
  strokeWeight?: number;
  strokeAlign?: string;
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
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  effects?: Array<{
    type: "DROP_SHADOW" | "INNER_SHADOW" | string;
    visible?: boolean;
    color?: { r: number; g: number; b: number; a?: number };
    offset?: { x: number; y: number };
    radius?: number;
    spread?: number;
  }>;
}

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

function backgroundFromFills(fills?: NodeLike["fills"], resolve?: GenerateOptions["colorVar"]): string | undefined {
  if (!fills || !fills.length) return undefined;
  for (const f of fills) {
    if (!f || f.visible === false) continue;
    if (f.type === "SOLID" && f.color) {
      const hex = figmaColorToHex(f.color).toLowerCase();
      return resolve?.(hex) ?? hex;
    }
  }
  return undefined;
}

function textColorFromFills(fills?: NodeLike["fills"], resolve?: GenerateOptions["colorVar"]): string | undefined {
  if (!fills || !fills.length) return undefined;
  for (const f of fills) {
    if (!f || f.visible === false) continue;
    if (f.type === "SOLID" && f.color) {
      const hex = figmaColorToHex(f.color).toLowerCase();
      return resolve?.(hex) ?? hex;
    }
  }
  return undefined;
}

function borderFromStrokes(weight?: number, strokes?: NodeLike["strokes"], resolve?: GenerateOptions["colorVar"]): string | undefined {
  if (!weight || !strokes || !strokes.length) return undefined;
  for (const s of strokes) {
    if (!s || s.visible === false) continue;
    if (s.type === "SOLID" && s.color) {
      const hex = figmaColorToHex(s.color).toLowerCase();
      const color = resolve?.(hex) ?? hex;
      return `${Math.round(weight)}px solid ${color}`;
    }
  }
  return undefined;
}

function borderRadiusCss(node: NodeLike): { css: string | undefined; react: Record<string, number> } {
  if (node.rectangleCornerRadii && node.rectangleCornerRadii.length === 4) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii.map(v => Math.max(0, Math.round(v)));
    return { css: `${tl}px ${tr}px ${br}px ${bl}px`, react: { borderTopLeftRadius: tl, borderTopRightRadius: tr, borderBottomRightRadius: br, borderBottomLeftRadius: bl } };
  }
  if (typeof node.cornerRadius === "number") {
    const r = Math.max(0, Math.round(node.cornerRadius));
    return { css: `${r}px`, react: { borderRadius: r } as any } as any;
  }
  return { css: undefined, react: {} };
}

function paddingReact(node: NodeLike, spacing?: (px: number) => string | undefined): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const { paddingTop, paddingRight, paddingBottom, paddingLeft } = node;
  if (paddingTop) { const v = Math.round(paddingTop); out.paddingTop = spacing?.(v) ?? v; }
  if (paddingRight) { const v = Math.round(paddingRight); out.paddingRight = spacing?.(v) ?? v; }
  if (paddingBottom) { const v = Math.round(paddingBottom); out.paddingBottom = spacing?.(v) ?? v; }
  if (paddingLeft) { const v = Math.round(paddingLeft); out.paddingLeft = spacing?.(v) ?? v; }
  return out;
}

function paddingCss(node: NodeLike, spacing?: (px: number) => string | undefined): string | undefined {
  const { paddingTop, paddingRight, paddingBottom, paddingLeft } = node;
  const vals = [paddingTop, paddingRight, paddingBottom, paddingLeft].map(v => {
    if (!v) return "0";
    const px = Math.round(v);
    return spacing?.(px) ?? `${px}px`;
  });
  if (vals.every(v => v === "0")) return undefined;
  return vals.join(" ");
}

function layoutReact(node: NodeLike): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (node.layoutMode && node.layoutMode !== "NONE") {
    out.display = "flex";
    out.flexDirection = node.layoutMode === "HORIZONTAL" ? "row" : "column";
    if (typeof node.itemSpacing === "number") out.gap = Math.round(node.itemSpacing);
    // alignment
    const isRow = node.layoutMode === "HORIZONTAL";
    const primary = node.primaryAxisAlignItems;
    const counter = node.counterAxisAlignItems;
    if (primary) {
      const justifyContent = primary === "MIN" ? (isRow ? "flex-start" : "flex-start")
        : primary === "CENTER" ? "center"
        : primary === "MAX" ? "flex-end"
        : primary === "SPACE_BETWEEN" ? "space-between" : undefined;
      if (justifyContent) out.justifyContent = justifyContent;
    }
    if (counter) {
      const alignItems = counter === "MIN" ? "flex-start"
        : counter === "CENTER" ? "center"
        : counter === "MAX" ? "flex-end"
        : counter === "BASELINE" ? "baseline" : undefined;
      if (alignItems) out.alignItems = alignItems;
    }
  }
  // absolute positioning
  if (node.layoutPositioning === "ABSOLUTE" && node.absoluteBoundingBox) {
    out.position = "absolute";
    if (typeof node.absoluteBoundingBox.x === "number") out.left = Math.round(node.absoluteBoundingBox.x);
    if (typeof node.absoluteBoundingBox.y === "number") out.top = Math.round(node.absoluteBoundingBox.y);
  }
  return out;
}

function layoutCss(node: NodeLike): string[] {
  const css: string[] = [];
  if (node.layoutMode && node.layoutMode !== "NONE") {
    css.push("display:flex");
    css.push(`flex-direction:${node.layoutMode === "HORIZONTAL" ? "row" : "column"}`);
    if (typeof node.itemSpacing === "number") css.push(`gap:${Math.round(node.itemSpacing)}px`);
    // alignment
    const primary = node.primaryAxisAlignItems;
    const counter = node.counterAxisAlignItems;
    if (primary) {
      const map: Record<string, string> = { MIN: "flex-start", CENTER: "center", MAX: "flex-end", SPACE_BETWEEN: "space-between" };
      css.push(`justify-content:${map[primary] || "flex-start"}`);
    }
    if (counter) {
      const map: Record<string, string> = { MIN: "flex-start", CENTER: "center", MAX: "flex-end", BASELINE: "baseline" };
      css.push(`align-items:${map[counter] || "stretch"}`);
    }
  }
  // absolute positioning
  if (node.layoutPositioning === "ABSOLUTE" && (node as any).absoluteBoundingBox) {
    const bb = (node as any).absoluteBoundingBox;
    css.push("position:absolute");
    if (typeof bb.x === "number") css.push(`left:${Math.round(bb.x)}px`);
    if (typeof bb.y === "number") css.push(`top:${Math.round(bb.y)}px`);
  }
  return css;
}

function boxShadowFromEffects(
  effects?: NodeLike["effects"],
  colorResolve?: GenerateOptions["colorVar"],
  shadowResolve?: GenerateOptions["shadowVar"]
): string | undefined {
  if (!effects || !effects.length) return undefined;
  const parts: string[] = [];
  for (const e of effects) {
    if (!e || e.visible === false) continue;
    if (e.type !== "DROP_SHADOW" && e.type !== "INNER_SHADOW") continue;
    const inset = e.type === "INNER_SHADOW" ? "inset " : "";
    const dx = Math.round(e.offset?.x ?? 0);
    const dy = Math.round(e.offset?.y ?? 0);
    const blur = Math.round(e.radius ?? 0);
    const spread = Math.round(e.spread ?? 0);
    const colorHex = e.color ? figmaColorToHex(e.color).toLowerCase() : undefined;
    const shadowVar = shadowResolve?.({ inset: !!inset.trim(), dx, dy, blur, spread, color: colorHex });
    if (shadowVar) {
      parts.push(shadowVar);
    } else {
      let color = colorHex ?? "#000000";
      color = colorResolve?.(color) ?? color;
      parts.push(`${inset}${dx}px ${dy}px ${blur}px ${spread}px ${color}`);
    }
  }
  return parts.length ? parts.join(", ") : undefined;
}

function renderHtml(node: NodeLike, opts?: GenerateOptions): string {
  const styleParts: string[] = [];
  const size = node.absoluteBoundingBox;
  if (size?.width) {
    const v = Math.round(size.width);
    styleParts.push(`width:${opts?.dimension?.(v) ?? `${v}px`}`);
  }
  if (size?.height) {
    const v = Math.round(size.height);
    styleParts.push(`height:${opts?.dimension?.(v) ?? `${v}px`}`);
  }
  const bg = backgroundFromFills(node.fills, opts?.colorVar);
  if (bg) styleParts.push(`background:${bg}`);
  const border = borderFromStrokes(node.strokeWeight, node.strokes, opts?.colorVar);
  if (border) styleParts.push(`border:${border}`);
  const br = borderRadiusCss(node).css;
  if (br) styleParts.push(`border-radius:${br}`);
  const pad = paddingCss(node, opts?.spacing);
  if (pad) styleParts.push(`padding:${pad}`);
  styleParts.push(...layoutCss(node));
  const shadow = boxShadowFromEffects(node.effects, opts?.colorVar, opts?.shadowVar);
  if (shadow) styleParts.push(`box-shadow:${shadow}`);
  const styleAttr = styleParts.length ? ` style=\"${styleParts.join(";")}\"` : "";

  if (node.type === "TEXT") {
    const text = (node.characters ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // basic text styles
    const textStyles: string[] = [];
    if (node.fontSize) {
      const v = Math.round(node.fontSize);
      textStyles.push(`font-size:${opts?.typography?.fontSize?.(v) ?? `${v}px`}`);
    }
    if (node.lineHeightPx) {
      const v = Math.round(node.lineHeightPx);
      textStyles.push(`line-height:${opts?.typography?.lineHeight?.(v) ?? `${v}px`}`);
    }
    if (node.fontWeight) textStyles.push(`font-weight:${Math.round(node.fontWeight)}`);
    if (node.textAlignHorizontal) textStyles.push(`text-align:${node.textAlignHorizontal.toLowerCase()}`);
    if (node.fontFamily) {
      const ff = node.fontFamily;
      textStyles.push(`font-family:${opts?.typography?.fontFamily?.(ff) ?? ff}`);
    }
    const tcolor = textColorFromFills(node.fills, opts?.colorVar);
    if (tcolor) textStyles.push(`color:${tcolor}`);
    if (typeof node.letterSpacing === "number") {
      const v = Math.round(node.letterSpacing);
      textStyles.push(`letter-spacing:${opts?.typography?.letterSpacing?.(v) ?? `${v}px`}`);
    }
    // merge container and text styles into single span when possible
    const allStyles = [...styleParts, ...textStyles];
    const allAttr = allStyles.length ? ` style=\"${allStyles.join(";")}\"` : "";
    return `<span${allAttr}>${text}</span>`;
  }

  const children = (node.children ?? []).map(child => renderHtml(child, opts)).join("");
  return `<div${styleAttr}>${children}</div>`;
}

function renderReact(node: NodeLike, opts?: GenerateOptions): string {
  const jsx = (function render(n: NodeLike): string {
    const style: Record<string, string | number> = {};
    const size = n.absoluteBoundingBox;
    if (size?.width) {
      const v = Math.round(size.width);
      style.width = opts?.dimension?.(v) ?? v;
    }
    if (size?.height) {
      const v = Math.round(size.height);
      style.height = opts?.dimension?.(v) ?? v;
    }
    const bg = backgroundFromFills(n.fills, opts?.colorVar);
    if (bg) style.background = bg;
    const border = borderFromStrokes(n.strokeWeight, n.strokes, opts?.colorVar);
    if (border) style.border = border;
    const br = borderRadiusCss(n).react;
    Object.assign(style, br);
    Object.assign(style, paddingReact(n, opts?.spacing));
    Object.assign(style, layoutReact(n));
    const shadow = boxShadowFromEffects(n.effects, opts?.colorVar, opts?.shadowVar);
    if (shadow) style.boxShadow = shadow;

    if (n.type === "TEXT") {
      const text = (n.characters ?? "").replace(/`/g, "\\`");
      const textStyle: Record<string, string | number> = {};
      if (n.fontSize) {
        const v = Math.round(n.fontSize);
        textStyle.fontSize = opts?.typography?.fontSize?.(v) ?? v;
      }
      if (n.lineHeightPx) {
        const v = Math.round(n.lineHeightPx);
        textStyle.lineHeight = opts?.typography?.lineHeight?.(v) ?? `${v}px`;
      }
      if (n.fontWeight) textStyle.fontWeight = Math.round(n.fontWeight);
      if (n.textAlignHorizontal) textStyle.textAlign = n.textAlignHorizontal.toLowerCase();
      if (n.fontFamily) textStyle.fontFamily = opts?.typography?.fontFamily?.(n.fontFamily) ?? n.fontFamily;
      const tcolor = textColorFromFills(n.fills, opts?.colorVar);
      if (tcolor) textStyle.color = tcolor;
      if (typeof n.letterSpacing === "number") {
        const v = Math.round(n.letterSpacing);
        const mapped = opts?.typography?.letterSpacing?.(v);
        textStyle.letterSpacing = mapped ?? `${v}px`;
      }
      // Merge styles for a single span, omit style attribute if empty
      const merged = { ...style, ...textStyle };
      const mergedStr = Object.keys(merged).length ? ` style={${JSON.stringify(merged)}}` : "";
      return `<span${mergedStr}>${text}</span>`;
    }

    const children = (n.children ?? []).map(render).join("\n      ");
    const styleStr = Object.keys(style).length ? ` style={${JSON.stringify(style)}}` : "";
    if (!children && !styleStr) return `<div />`;
    return `<div${styleStr}>
      ${children}
    </div>`;
  })(node);

  return `export default function Component(){
  return (
    ${jsx}
  );
}`;
}

export function generateCode(node: unknown, framework: Framework, opts?: GenerateOptions): string {
  const n = (node ?? {}) as NodeLike;
  switch (framework) {
    case "react":
      return renderReact(n, opts);
    case "vue":
      return `<template>\n${renderHtml(n, opts)}\n</template>\n<script setup>\n</script>`;
    case "svelte":
      return `<script>\n</script>\n${renderHtml(n, opts)}`;
    case "html":
      return `<!doctype html>\n${renderHtml(n, opts)}`;
  }
}
