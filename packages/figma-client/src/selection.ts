import type { FigmaColor, FigmaNode, FigmaPaint } from "./index.js";

export interface InspectSelectionOptions {
  fileId: string;
  nodeId: string;
  depth?: number;
  maxChildren?: number;
}

export interface InspectSelectionLimits {
  depth: number;
  maxChildren: number;
}

export interface SelectionInspection {
  schemaVersion: "1";
  source: { fileId: string; nodeId: string };
  limits: { depth: number; maxChildren: number };
  selection: InspectedNode;
  omitted: string[];
}

export interface InspectedNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  absoluteBoundingBox: { x: number; y: number; width: number; height: number } | null;
  width: number | null;
  height: number | null;
  layoutMode: string | null;
  primaryAxisAlignItems: string | null;
  counterAxisAlignItems: string | null;
  itemSpacing: number | null;
  padding: { top: number; right: number; bottom: number; left: number } | null;
  constraints: { horizontal: string | null; vertical: string | null } | null;
  fills: InspectedPaint[];
  strokes: InspectedPaint[];
  strokeWeight: number | null;
  strokeAlign: string | null;
  cornerRadius: number | [number, number, number, number] | null;
  effects: InspectedEffect[];
  shadows: InspectedEffect[];
  opacity: number;
  text: InspectedText | null;
  component: { id: string | null; properties: Record<string, unknown> } | null;
  children: InspectedNode[];
  childCount: number;
  hasImageReference: boolean;
  unsupported: string[];
}

interface InspectedPaint {
  type: string;
  visible: boolean;
  opacity: number;
  color: string | null;
  blendMode: string | null;
  scaleMode: string | null;
  hasImageReference: boolean;
}

interface InspectedEffect {
  type: string;
  visible: boolean;
  color: string | null;
  offset: { x: number; y: number } | null;
  radius: number | null;
  spread: number | null;
}

interface InspectedText {
  content: string;
  truncated: boolean;
  fontFamily: string | null;
  fontSize: number | null;
  fontWeight: number | null;
  lineHeight: number | null;
  letterSpacing: number | null;
  textAlignHorizontal: string | null;
}

const DEFAULT_DEPTH = 2;
const MAX_DEPTH = 5;
const DEFAULT_MAX_CHILDREN = 20;
const MAX_CHILDREN = 100;
const MAX_TEXT_LENGTH = 2000;
const MAX_COMPONENT_PROPERTIES = 50;

function clampInteger(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(0, Math.trunc(value)));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function colorToHex(color: FigmaColor | undefined): string | null {
  if (!color) return null;
  const byte = (value: number) => Math.max(0, Math.min(255, Math.round(value * 255))).toString(16).padStart(2, "0");
  const alpha = color.a === undefined || color.a >= 1 ? "" : byte(color.a);
  return `#${byte(color.r)}${byte(color.g)}${byte(color.b)}${alpha}`;
}

function inspectPaint(paint: FigmaPaint): InspectedPaint {
  return {
    type: paint.type,
    visible: paint.visible !== false,
    opacity: round(paint.opacity ?? 1),
    color: colorToHex(paint.color),
    blendMode: paint.blendMode ?? null,
    scaleMode: paint.scaleMode ?? null,
    hasImageReference: Boolean(paint.imageRef)
  };
}

function inspectEffect(effect: NonNullable<FigmaNode["effects"]>[number]): InspectedEffect {
  return {
    type: effect.type,
    visible: effect.visible !== false,
    color: colorToHex(effect.color),
    offset: effect.offset ? { x: round(effect.offset.x), y: round(effect.offset.y) } : null,
    radius: effect.radius === undefined ? null : round(effect.radius),
    spread: effect.spread === undefined ? null : round(effect.spread)
  };
}

function inspectNode(node: FigmaNode, remainingDepth: number, maxChildren: number, omitted: Set<string>): InspectedNode {
  const fills = (node.fills ?? []).map(inspectPaint);
  const strokes = (node.strokes ?? []).map(inspectPaint);
  const effects = (node.effects ?? []).map(inspectEffect);
  const allChildren = node.children ?? [];
  const visibleChildren = remainingDepth > 0 ? allChildren.slice(0, maxChildren) : [];
  const unsupported: string[] = [];

  if (allChildren.length > visibleChildren.length) {
    const reason = remainingDepth === 0
      ? `${allChildren.length} child node(s) omitted by depth limit.`
      : `${allChildren.length - visibleChildren.length} child node(s) omitted by maxChildren limit.`;
    unsupported.push(reason);
    omitted.add(reason);
  }
  if (["VECTOR", "BOOLEAN_OPERATION", "STAR", "LINE", "ELLIPSE", "POLYGON"].includes(node.type)) {
    unsupported.push("Vector geometry is summarized; path data is omitted.");
  }
  if (fills.some((paint) => paint.hasImageReference)) {
    unsupported.push("Image fill reference detected; image bytes and download URLs are omitted.");
  }
  if ([...fills, ...strokes].some((paint) => paint.type.startsWith("GRADIENT_"))) {
    unsupported.push("Gradient geometry and stop details are omitted.");
  }

  const rawText = node.characters ?? "";
  const textTruncated = rawText.length > MAX_TEXT_LENGTH;
  if (textTruncated) unsupported.push(`Text content truncated to ${MAX_TEXT_LENGTH} characters.`);
  const style = node.style;
  const componentEntries = Object.entries(node.componentProperties ?? {}).slice(0, MAX_COMPONENT_PROPERTIES);
  if (Object.keys(node.componentProperties ?? {}).length > componentEntries.length) {
    unsupported.push(`Component properties truncated to ${MAX_COMPONENT_PROPERTIES} entries.`);
  }

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible !== false,
    absoluteBoundingBox: node.absoluteBoundingBox ? {
      x: round(node.absoluteBoundingBox.x),
      y: round(node.absoluteBoundingBox.y),
      width: round(node.absoluteBoundingBox.width),
      height: round(node.absoluteBoundingBox.height)
    } : null,
    width: node.absoluteBoundingBox ? round(node.absoluteBoundingBox.width) : null,
    height: node.absoluteBoundingBox ? round(node.absoluteBoundingBox.height) : null,
    layoutMode: node.layoutMode ?? null,
    primaryAxisAlignItems: node.primaryAxisAlignItems ?? null,
    counterAxisAlignItems: node.counterAxisAlignItems ?? null,
    itemSpacing: node.itemSpacing === undefined ? null : round(node.itemSpacing),
    padding: [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].some((value) => value !== undefined) ? {
      top: round(node.paddingTop ?? 0),
      right: round(node.paddingRight ?? 0),
      bottom: round(node.paddingBottom ?? 0),
      left: round(node.paddingLeft ?? 0)
    } : null,
    constraints: node.constraints ? {
      horizontal: node.constraints.horizontal ?? null,
      vertical: node.constraints.vertical ?? null
    } : null,
    fills,
    strokes,
    strokeWeight: node.strokeWeight === undefined ? null : round(node.strokeWeight),
    strokeAlign: node.strokeAlign ?? null,
    cornerRadius: node.rectangleCornerRadii ?? (node.cornerRadius === undefined ? null : round(node.cornerRadius)),
    effects,
    shadows: effects.filter((effect) => effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW"),
    opacity: round(node.opacity ?? 1),
    text: node.type === "TEXT" || node.characters !== undefined ? {
      content: rawText.slice(0, MAX_TEXT_LENGTH),
      truncated: textTruncated,
      fontFamily: style?.fontFamily ?? node.fontFamily ?? null,
      fontSize: style?.fontSize ?? node.fontSize ?? null,
      fontWeight: style?.fontWeight ?? node.fontWeight ?? null,
      lineHeight: style?.lineHeightPx ?? node.lineHeightPx ?? null,
      letterSpacing: style?.letterSpacing ?? node.letterSpacing ?? null,
      textAlignHorizontal: style?.textAlignHorizontal ?? node.textAlignHorizontal ?? null
    } : null,
    component: node.componentId || componentEntries.length ? {
      id: node.componentId ?? null,
      properties: Object.fromEntries(componentEntries.map(([key, value]) => [key, value.value ?? value]))
    } : null,
    children: visibleChildren.map((child) => inspectNode(child, remainingDepth - 1, maxChildren, omitted)),
    childCount: allChildren.length,
    hasImageReference: fills.some((paint) => paint.hasImageReference) || strokes.some((paint) => paint.hasImageReference),
    unsupported
  };
}

export function resolveInspectSelectionLimits(options: Pick<InspectSelectionOptions, "depth" | "maxChildren">): InspectSelectionLimits {
  return {
    depth: clampInteger(options.depth, DEFAULT_DEPTH, MAX_DEPTH),
    maxChildren: clampInteger(options.maxChildren, DEFAULT_MAX_CHILDREN, MAX_CHILDREN)
  };
}

export function inspectSelection(node: FigmaNode, options: InspectSelectionOptions): SelectionInspection {
  const { depth, maxChildren } = resolveInspectSelectionLimits(options);
  const omitted = new Set<string>();
  const selection = inspectNode(node, depth, maxChildren, omitted);
  return {
    schemaVersion: "1",
    source: { fileId: options.fileId, nodeId: options.nodeId },
    limits: { depth, maxChildren },
    selection,
    omitted: [...omitted]
  };
}
