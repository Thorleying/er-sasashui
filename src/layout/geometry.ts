/**
 * Shared 2D geometry helpers for layout / avoidance modules.
 *
 * These used to exist as near-identical copies in autoAvoid.ts,
 * entityMoveSync.ts, arrangeLayout.ts, skeletonLayout.ts, attributeRings.ts
 * and attributeLayout.ts. Behaviour matches the originals exactly:
 *
 * - `segmentsIntersectStrict` is the strict proper-intersection test used by
 *   the avoidance code (shared endpoints report "no intersection" because the
 *   cross products become 0 and the strict inequalities fail).
 * - `segmentsCross` additionally treats *approximately equal* endpoints
 *   (within 1e-6) as shared and therefore not crossing; this is the variant
 *   used for edge-crossing counting in the layout algorithms.
 */

export interface GeomPoint {
  x: number;
  y: number;
}

export interface GeomSize {
  width: number;
  height: number;
}

export const TAU = Math.PI * 2;

/** Default rendered sizes per node type, used when no live measurement exists. */
export const DEFAULT_NODE_SIZES: Record<string, GeomSize> = {
  entity: { width: 120, height: 52 },
  relationship: { width: 82, height: 52 },
  attribute: { width: 90, height: 44 },
};

export const FALLBACK_NODE_SIZE: GeomSize = { width: 80, height: 40 };

export const fallbackNodeSize = (node: { nodeType?: string; type?: string }): GeomSize =>
  DEFAULT_NODE_SIZES[String(node.nodeType ?? node.type ?? "")] ?? FALLBACK_NODE_SIZE;

export const safeNodeSize = (
  node: { nodeType?: string; type?: string },
  measured?: GeomSize | null,
): GeomSize => {
  const fallback = fallbackNodeSize(node);
  const size = measured ?? fallback;
  return {
    width: Number.isFinite(size.width) && size.width > 0 ? size.width : fallback.width,
    height: Number.isFinite(size.height) && size.height > 0 ? size.height : fallback.height,
  };
};

export const cross2 = (ax: number, ay: number, bx: number, by: number): number => ax * by - ay * bx;

/** Strict proper-intersection test (open segments; collinear touches excluded). */
export const segmentsIntersectStrict = (
  a: GeomPoint,
  b: GeomPoint,
  c: GeomPoint,
  d: GeomPoint,
): boolean => {
  const d1 = cross2(d.x - c.x, d.y - c.y, a.x - c.x, a.y - c.y);
  const d2 = cross2(d.x - c.x, d.y - c.y, b.x - c.x, b.y - c.y);
  const d3 = cross2(b.x - a.x, b.y - a.y, c.x - a.x, c.y - a.y);
  const d4 = cross2(b.x - a.x, b.y - a.y, d.x - a.x, d.y - a.y);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};

/**
 * Proper-intersection test for crossing counting: segments that share an
 * (approximately equal) endpoint count as not crossing.
 */
export const segmentsCross = (
  a1: GeomPoint,
  a2: GeomPoint,
  b1: GeomPoint,
  b2: GeomPoint,
): boolean => {
  const eq = (p: GeomPoint, q: GeomPoint) =>
    Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6;
  if (eq(a1, b1) || eq(a1, b2) || eq(a2, b1) || eq(a2, b2)) return false;
  return segmentsIntersectStrict(a1, a2, b1, b2);
};

/** Does segment a-b pierce an axis-aligned box (optionally inset)? */
export const segmentHitsBox = (
  a: GeomPoint,
  b: GeomPoint,
  center: GeomPoint,
  size: GeomSize,
  inset = 0,
): boolean => {
  const minX = center.x - size.width / 2 + inset;
  const maxX = center.x + size.width / 2 - inset;
  const minY = center.y - size.height / 2 + inset;
  const maxY = center.y + size.height / 2 - inset;
  if (minX >= maxX || minY >= maxY) return false;
  if (a.x > minX && a.x < maxX && a.y > minY && a.y < maxY) return true;
  if (b.x > minX && b.x < maxX && b.y > minY && b.y < maxY) return true;
  return (
    segmentsIntersectStrict(a, b, { x: minX, y: minY }, { x: maxX, y: minY }) ||
    segmentsIntersectStrict(a, b, { x: maxX, y: minY }, { x: maxX, y: maxY }) ||
    segmentsIntersectStrict(a, b, { x: maxX, y: maxY }, { x: minX, y: maxY }) ||
    segmentsIntersectStrict(a, b, { x: minX, y: maxY }, { x: minX, y: minY })
  );
};

/** Axis-aligned box overlap with an optional extra gap. */
export const boxesOverlap = (
  a: GeomPoint,
  as: GeomSize,
  b: GeomPoint,
  bs: GeomSize,
  gap = 0,
): boolean =>
  Math.abs(a.x - b.x) < (as.width + bs.width) / 2 + gap &&
  Math.abs(a.y - b.y) < (as.height + bs.height) / 2 + gap;

/** Boundary distance of an axis-aligned rectangle along unit direction (ux, uy). */
export const rectBoundary = (rx: number, ry: number, ux: number, uy: number): number => {
  const ax = Math.abs(ux);
  const ay = Math.abs(uy);
  if (ax < 1e-9) return ry;
  if (ay < 1e-9) return rx;
  return Math.min(rx / ax, ry / ay);
};

/** Boundary distance of an axis-aligned ellipse along unit direction (ux, uy). */
export const ellipseBoundary = (rx: number, ry: number, ux: number, uy: number): number => {
  if (rx <= 0 || ry <= 0) return 0;
  const denom = Math.sqrt(ry * ry * ux * ux + rx * rx * uy * uy);
  return denom > 1e-9 ? (rx * ry) / denom : 0;
};

/** Boundary distance of the diamond |x|/rx + |y|/ry = 1 along unit direction (ux, uy). */
export const diamondBoundary = (rx: number, ry: number, ux: number, uy: number): number => {
  if (rx <= 0 || ry <= 0) return 0;
  const denom = Math.abs(ux) / rx + Math.abs(uy) / ry;
  return denom > 1e-9 ? 1 / denom : 0;
};

/** Normalize an angle into [0, 2π). */
export const normalizeAngle = (a: number): number => {
  let angle = a % TAU;
  if (angle < 0) angle += TAU;
  return angle;
};

/** Smallest absolute angular distance between two angles, in [0, π]. */
export const angleDistance = (a: number, b: number): number => {
  let d = Math.abs(a - b) % TAU;
  if (d > Math.PI) d = TAU - d;
  return d;
};
