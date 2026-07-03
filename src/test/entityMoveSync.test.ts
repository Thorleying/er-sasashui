import { describe, expect, it } from "vitest";
import {
  applyNodePositionTargets,
  computeAttributeRotationTargets,
  computeMovedEntityRelationshipTargets,
} from "../graph/entityMoveSync";
import type { EREdgeModel, ERNodeModel } from "../types";

const sizeOf = (node: ERNodeModel) => {
  if (node.nodeType === "relationship") return { width: 80, height: 48 };
  if (node.nodeType === "attribute") return { width: 60, height: 40 };
  return { width: 100, height: 50 };
};

const distance = (a: { x?: number; y?: number }, b: { x?: number; y?: number }) =>
  Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));

const overlaps = (
  a: { x?: number; y?: number },
  as: { width: number; height: number },
  b: { x?: number; y?: number },
  bs: { width: number; height: number },
) =>
  Math.abs((a.x ?? 0) - (b.x ?? 0)) < (as.width + bs.width) / 2 + 8 &&
  Math.abs((a.y ?? 0) - (b.y ?? 0)) < (as.height + bs.height) / 2 + 8;

const cross2 = (ax: number, ay: number, bx: number, by: number): number => ax * by - ay * bx;

const segmentsIntersect = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
): boolean => {
  const d1 = cross2(d.x - c.x, d.y - c.y, a.x - c.x, a.y - c.y);
  const d2 = cross2(d.x - c.x, d.y - c.y, b.x - c.x, b.y - c.y);
  const d3 = cross2(b.x - a.x, b.y - a.y, c.x - a.x, c.y - a.y);
  const d4 = cross2(b.x - a.x, b.y - a.y, d.x - a.x, d.y - a.y);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};

const boundaryPoint = (
  node: ERNodeModel,
  target: { x: number; y: number },
): { x: number; y: number } => {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const dx = target.x - x;
  const dy = target.y - y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return { x, y };
  const ux = dx / len;
  const uy = dy / len;
  const size = sizeOf(node);
  const sx = Math.abs(ux) > 1e-9 ? size.width / 2 / Math.abs(ux) : Infinity;
  const sy = Math.abs(uy) > 1e-9 ? size.height / 2 / Math.abs(uy) : Infinity;
  const extent = Math.min(sx, sy);
  return { x: x + ux * extent, y: y + uy * extent };
};

const segmentHitsBox = (source: ERNodeModel, target: ERNodeModel, box: ERNodeModel): boolean => {
  const a = boundaryPoint(source, { x: target.x ?? 0, y: target.y ?? 0 });
  const b = boundaryPoint(target, { x: source.x ?? 0, y: source.y ?? 0 });
  const size = sizeOf(box);
  const centerX = box.x ?? 0;
  const centerY = box.y ?? 0;
  const minX = centerX - size.width / 2;
  const maxX = centerX + size.width / 2;
  const minY = centerY - size.height / 2;
  const maxY = centerY + size.height / 2;
  if (a.x > minX && a.x < maxX && a.y > minY && a.y < maxY) return true;
  if (b.x > minX && b.x < maxX && b.y > minY && b.y < maxY) return true;
  return (
    segmentsIntersect(a, b, { x: minX, y: minY }, { x: maxX, y: minY }) ||
    segmentsIntersect(a, b, { x: maxX, y: minY }, { x: maxX, y: maxY }) ||
    segmentsIntersect(a, b, { x: maxX, y: maxY }, { x: minX, y: maxY }) ||
    segmentsIntersect(a, b, { x: minX, y: maxY }, { x: minX, y: minY })
  );
};

describe("entity move synchronization", () => {
  it("rotates covered attributes away from moved relationship diamonds without changing radius", () => {
    const nodes: ERNodeModel[] = [
      { id: "entity-a", type: "entity", nodeType: "entity", label: "a", x: 160, y: 180 },
      { id: "entity-b", type: "entity", nodeType: "entity", label: "b", x: 300, y: 100 },
      {
        id: "rel-a-b",
        type: "relationship",
        nodeType: "relationship",
        label: "a_b",
        x: 200,
        y: 100,
      },
      {
        id: "attr-b",
        type: "attribute",
        nodeType: "attribute",
        label: "b",
        parentEntity: "entity-b",
        x: 230,
        y: 140,
      },
    ];
    const edges: EREdgeModel[] = [
      {
        id: "edge-a-rel",
        source: "entity-a",
        target: "rel-a-b",
        edgeType: "entity-relationship",
      },
      {
        id: "edge-rel-b",
        source: "rel-a-b",
        target: "entity-b",
        edgeType: "relationship-entity",
      },
      {
        id: "edge-b-attr",
        source: "entity-b",
        target: "attr-b",
        edgeType: "entity-attribute",
      },
    ];
    const beforeRadius = distance(nodes[1], nodes[3]);

    const relTargets = computeMovedEntityRelationshipTargets(nodes, edges, ["entity-a"], sizeOf);
    applyNodePositionTargets(nodes, relTargets.relationshipTargets);
    expect(overlaps(nodes[3], sizeOf(nodes[3]), nodes[2], sizeOf(nodes[2]))).toBe(true);

    const attrTargets = computeAttributeRotationTargets(
      nodes,
      edges,
      relTargets.affectedEntityIds,
      sizeOf,
    );
    applyNodePositionTargets(nodes, attrTargets);

    expect(attrTargets.has("attr-b")).toBe(true);
    expect(distance(nodes[1], nodes[3])).toBeCloseTo(beforeRadius, 6);
    expect(overlaps(nodes[3], sizeOf(nodes[3]), nodes[2], sizeOf(nodes[2]))).toBe(false);
  });

  it("rotates attributes away from covered relationship lines without changing radius", () => {
    const nodes: ERNodeModel[] = [
      { id: "entity-a", type: "entity", nodeType: "entity", label: "a", x: 0, y: 0 },
      {
        id: "rel-a-b",
        type: "relationship",
        nodeType: "relationship",
        label: "a_b",
        x: 200,
        y: 0,
      },
      {
        id: "attr-a-name",
        type: "attribute",
        nodeType: "attribute",
        label: "name",
        parentEntity: "entity-a",
        x: 105,
        y: 0,
      },
    ];
    const edges: EREdgeModel[] = [
      {
        id: "edge-a-rel",
        source: "entity-a",
        target: "rel-a-b",
        edgeType: "entity-relationship",
      },
      {
        id: "edge-a-attr",
        source: "entity-a",
        target: "attr-a-name",
        edgeType: "entity-attribute",
      },
    ];
    const beforeRadius = distance(nodes[0], nodes[2]);

    expect(overlaps(nodes[2], sizeOf(nodes[2]), nodes[1], sizeOf(nodes[1]))).toBe(false);
    expect(segmentHitsBox(nodes[0], nodes[1], nodes[2])).toBe(true);

    const attrTargets = computeAttributeRotationTargets(nodes, edges, ["entity-a"], sizeOf);
    applyNodePositionTargets(nodes, attrTargets);

    expect(attrTargets.has("attr-a-name")).toBe(true);
    expect(distance(nodes[0], nodes[2])).toBeCloseTo(beforeRadius, 6);
    expect(segmentHitsBox(nodes[0], nodes[1], nodes[2])).toBe(false);
  });

  it("translates single-entity relationship diamonds with the moved entity", () => {
    const nodes: ERNodeModel[] = [
      { id: "entity-a", type: "entity", nodeType: "entity", label: "a", x: 180, y: 160 },
      {
        id: "rel-one-edge",
        type: "relationship",
        nodeType: "relationship",
        label: "single",
        x: 140,
        y: 100,
      },
      {
        id: "rel-loop",
        type: "relationship",
        nodeType: "relationship",
        label: "loop",
        x: 100,
        y: 40,
        isSelfLoop: true,
      },
    ];
    const edges: EREdgeModel[] = [
      {
        id: "edge-a-single",
        source: "entity-a",
        target: "rel-one-edge",
        edgeType: "entity-relationship",
      },
      {
        id: "edge-a-loop",
        source: "entity-a",
        target: "rel-loop",
        edgeType: "entity-relationship",
      },
      {
        id: "edge-loop-a",
        source: "rel-loop",
        target: "entity-a",
        edgeType: "relationship-entity",
      },
    ];
    const startPositions = new Map<string, { x: number; y: number }>([
      ["entity-a", { x: 100, y: 100 }],
      ["rel-one-edge", { x: 140, y: 100 }],
      ["rel-loop", { x: 100, y: 40 }],
    ]);

    const relTargets = computeMovedEntityRelationshipTargets(
      nodes,
      edges,
      ["entity-a"],
      sizeOf,
      startPositions,
    );

    expect(relTargets.relationshipTargets.get("rel-one-edge")).toEqual({ x: 220, y: 160 });
    expect(relTargets.relationshipTargets.get("rel-loop")).toEqual({ x: 180, y: 100 });
    expect(relTargets.affectedEntityIds.has("entity-a")).toBe(true);
  });
});
