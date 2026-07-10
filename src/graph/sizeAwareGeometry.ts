import { measureNodeSize } from "../builder";
import type { EREdgeModel, ERNodeModel, GraphLike } from "../types";

export interface NodeSizeLike {
  width: number;
  height: number;
}

export type NodeSizeResolver = (node: ERNodeModel) => NodeSizeLike;

/**
 * A node's model-space centre together with its actual rendered bounds.
 *
 * `x` / `y` deliberately come from the model while min/max come from the
 * rendered bbox when one is available. Text baselines and custom shapes can
 * make a rendered bbox slightly asymmetric around the model position; keeping
 * both lets the resize transform use the real old diagram boundary without
 * changing what a node position means to G6.
 */
export interface NodeGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type GeometrySnapshot = Map<string, NodeGeometry>;

const EPSILON = 1e-6;
const BASE_FONT_SIZE: Record<string, number> = {
  entity: 18,
  relationship: 16,
  attribute: 15,
};

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const safeDimension = (value: unknown): number => {
  const parsed = finiteOr(value, 0);
  return parsed > 0 ? parsed : 0;
};

const centeredGeometry = (x: number, y: number, size: NodeSizeLike): NodeGeometry => {
  const width = safeDimension(size.width);
  const height = safeDimension(size.height);
  return {
    x,
    y,
    width,
    height,
    minX: x - width / 2,
    minY: y - height / 2,
    maxX: x + width / 2,
    maxY: y + height / 2,
  };
};

/** Capture model positions and sizes without requiring a browser/G6 instance. */
export function captureModelGeometry(
  nodes: ERNodeModel[],
  sizeOf: NodeSizeResolver = measureNodeSize,
): GeometrySnapshot {
  const snapshot: GeometrySnapshot = new Map();
  nodes.forEach((node) => {
    const x = finiteOr(node.x, 0);
    const y = finiteOr(node.y, 0);
    snapshot.set(node.id, centeredGeometry(x, y, sizeOf(node)));
  });
  return snapshot;
}

/** Capture the browser renderer's actual bbox for every graph node. */
export function captureGraphGeometry(graph: GraphLike): GeometrySnapshot {
  const snapshot: GeometrySnapshot = new Map();
  if (!graph || graph.destroyed) return snapshot;

  graph.getNodes().forEach((node) => {
    const model = node.getModel();
    const bbox = node.getBBox();
    const width = safeDimension(bbox.width);
    const height = safeDimension(bbox.height);
    const fallbackCenterX = finiteOr(bbox.centerX, 0);
    const fallbackCenterY = finiteOr(bbox.centerY, 0);
    const x = finiteOr(model.x, fallbackCenterX);
    const y = finiteOr(model.y, fallbackCenterY);
    const fallback = centeredGeometry(x, y, { width, height });

    snapshot.set(model.id, {
      x,
      y,
      width,
      height,
      minX: finiteOr(bbox.minX, fallback.minX),
      minY: finiteOr(bbox.minY, fallback.minY),
      maxX: finiteOr(bbox.maxX, fallback.maxX),
      maxY: finiteOr(bbox.maxY, fallback.maxY),
    });
  });
  return snapshot;
}

/**
 * Compute one stable resize ratio from nodes present in both snapshots.
 *
 * A single ratio is intentional: independent per-edge ratios are generally
 * inconsistent around cycles. One graph-wide affine transform preserves
 * every straight edge's direction, topology, and relative length without
 * invoking a layout/constraint solver.
 */
export function computeActualSizeScale(
  before: ReadonlyMap<string, NodeGeometry>,
  after: ReadonlyMap<string, NodeGeometry>,
): number {
  let oldDiagonalSum = 0;
  let newDiagonalSum = 0;
  let commonCount = 0;
  let allBoundsUnchanged = true;

  before.forEach((oldGeometry, id) => {
    const newGeometry = after.get(id);
    if (!newGeometry) return;
    const oldDiagonal = Math.hypot(oldGeometry.width, oldGeometry.height);
    const newDiagonal = Math.hypot(newGeometry.width, newGeometry.height);
    if (
      !Number.isFinite(oldDiagonal) ||
      !Number.isFinite(newDiagonal) ||
      oldDiagonal <= EPSILON ||
      newDiagonal <= EPSILON
    ) {
      return;
    }

    commonCount++;
    oldDiagonalSum += oldDiagonal;
    newDiagonalSum += newDiagonal;
    if (
      Math.abs(oldGeometry.width - newGeometry.width) > EPSILON ||
      Math.abs(oldGeometry.height - newGeometry.height) > EPSILON
    ) {
      allBoundsUnchanged = false;
    }
  });

  if (!commonCount || allBoundsUnchanged || oldDiagonalSum <= EPSILON) return 1;
  const scale = newDiagonalSum / oldDiagonalSum;
  if (!Number.isFinite(scale) || scale <= 0 || Math.abs(scale - 1) <= EPSILON) return 1;
  return scale;
}

const oldDiagramCenter = (
  before: ReadonlyMap<string, NodeGeometry>,
): { x: number; y: number } | null => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  before.forEach((geometry) => {
    if (
      !Number.isFinite(geometry.minX) ||
      !Number.isFinite(geometry.minY) ||
      !Number.isFinite(geometry.maxX) ||
      !Number.isFinite(geometry.maxY)
    ) {
      return;
    }
    minX = Math.min(minX, geometry.minX);
    minY = Math.min(minY, geometry.minY);
    maxX = Math.max(maxX, geometry.maxX);
    maxY = Math.max(maxY, geometry.maxY);
  });

  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
};

const scaledPoint = (
  geometry: NodeGeometry,
  center: { x: number; y: number },
  scale: number,
): { x: number; y: number } => ({
  x: center.x + (geometry.x - center.x) * scale,
  y: center.y + (geometry.y - center.y) * scale,
});

/**
 * Apply a size change to plain node/edge models. Returns the applied ratio.
 * A ratio of one is a strict no-op: no coordinate or curveOffset is rewritten.
 */
export function applySizeChangeToModels(
  nodes: ERNodeModel[],
  edges: EREdgeModel[],
  before: ReadonlyMap<string, NodeGeometry>,
  after: ReadonlyMap<string, NodeGeometry>,
): number {
  const scale = computeActualSizeScale(before, after);
  if (scale === 1) return 1;
  const center = oldDiagramCenter(before);
  if (!center) return 1;

  nodes.forEach((node) => {
    const oldGeometry = before.get(node.id);
    if (!oldGeometry) return;
    const next = scaledPoint(oldGeometry, center, scale);
    node.x = next.x;
    node.y = next.y;
  });
  edges.forEach((edge) => {
    if (typeof edge.curveOffset === "number" && Number.isFinite(edge.curveOffset)) {
      edge.curveOffset *= scale;
    }
  });
  return scale;
}

/**
 * Apply a post-style-update size change to a live graph. `before` must be
 * captured immediately before changing the node styles/font size.
 */
export function applySizeChangeToGraph(
  graph: GraphLike,
  before: ReadonlyMap<string, NodeGeometry>,
): number {
  if (!graph || graph.destroyed) return 1;
  const after = captureGraphGeometry(graph);
  const scale = computeActualSizeScale(before, after);
  if (scale === 1) return 1;
  const center = oldDiagramCenter(before);
  if (!center) return 1;

  graph.setAutoPaint(false);
  try {
    graph.getNodes().forEach((node) => {
      const oldGeometry = before.get(node.getModel().id);
      if (!oldGeometry) return;
      graph.updateItem(node, scaledPoint(oldGeometry, center, scale), false);
    });
    graph.getEdges().forEach((edge) => {
      const curveOffset = edge.getModel().curveOffset;
      if (typeof curveOffset === "number" && Number.isFinite(curveOffset)) {
        graph.updateItem(edge, { curveOffset: curveOffset * scale }, false);
      }
    });
    graph.paint();
  } finally {
    graph.setAutoPaint(true);
  }
  return scale;
}

const modelAtBaseFontSize = (node: ERNodeModel): ERNodeModel => {
  // Keep this type fallback identical to measureNodeSize: a missing nodeType
  // is treated as an entity, while an unknown explicit type uses the generic
  // (attribute-sized) 15px base.
  const type = node.nodeType || "entity";
  const fontSize = BASE_FONT_SIZE[type] ?? BASE_FONT_SIZE.attribute;
  return {
    ...node,
    labelCfg: {
      ...node.labelCfg,
      style: {
        ...(node.labelCfg?.style ?? {}),
        fontSize,
      },
    },
  };
};

/**
 * Return the current diagram's linear geometry scale relative to the same
 * labels rendered at their type-specific base font sizes.
 *
 * This is intended for additive layout gaps. It is based on measured shape
 * diagonals, not the requested font multiplier, so a minimum-size shape that
 * did not actually grow contributes exactly its baseline size (ratio 1).
 */
export function computeLayoutSizeScale(
  nodes: ERNodeModel[],
  sizeOf: NodeSizeResolver = measureNodeSize,
): number {
  let currentDiagonalSum = 0;
  let baselineDiagonalSum = 0;
  let measuredCount = 0;
  let allBoundsUnchanged = true;

  nodes.forEach((node) => {
    const current = sizeOf(node);
    const baseline = measureNodeSize(modelAtBaseFontSize(node));
    const currentWidth = safeDimension(current.width);
    const currentHeight = safeDimension(current.height);
    const baselineWidth = safeDimension(baseline.width);
    const baselineHeight = safeDimension(baseline.height);
    const currentDiagonal = Math.hypot(currentWidth, currentHeight);
    const baselineDiagonal = Math.hypot(baselineWidth, baselineHeight);
    if (currentDiagonal <= EPSILON || baselineDiagonal <= EPSILON) return;

    measuredCount++;
    currentDiagonalSum += currentDiagonal;
    baselineDiagonalSum += baselineDiagonal;
    if (
      Math.abs(currentWidth - baselineWidth) > EPSILON ||
      Math.abs(currentHeight - baselineHeight) > EPSILON
    ) {
      allBoundsUnchanged = false;
    }
  });

  if (!measuredCount || allBoundsUnchanged || baselineDiagonalSum <= EPSILON) return 1;
  const scale = currentDiagonalSum / baselineDiagonalSum;
  if (!Number.isFinite(scale) || scale <= 0 || Math.abs(scale - 1) <= EPSILON) return 1;
  return scale;
}

/** Scale curved-line geometry on a freshly generated model exactly once. */
export function applyLayoutSizeScaleToEdges(edges: EREdgeModel[], sizeScale: number): void {
  if (!Number.isFinite(sizeScale) || sizeScale <= 0 || Math.abs(sizeScale - 1) <= EPSILON) return;
  edges.forEach((edge) => {
    if (typeof edge.curveOffset === "number" && Number.isFinite(edge.curveOffset)) {
      edge.curveOffset *= sizeScale;
    }
  });
}
