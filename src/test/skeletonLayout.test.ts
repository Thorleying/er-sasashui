import { describe, expect, it } from "vitest";
import {
  applySkeletonLayout,
  buildEntitySkeleton,
  computeSkeletonEmbedding,
} from "../layout/skeletonLayout";
import { applyFontScaleToModels } from "../graph/updateGraphStyles";
import type { EREdgeModel, ERNodeModel } from "../types";

const entity = (id: string): ERNodeModel => ({
  id,
  type: "entity",
  nodeType: "entity",
  label: id.replace("entity-", ""),
});

const relationship = (id: string): ERNodeModel => ({
  id,
  type: "relationship",
  nodeType: "relationship",
  label: id.replace("rel-", ""),
});

const relation = (id: string, from: string, to: string) => ({
  node: relationship(id),
  edges: [
    {
      id: `edge-${from}-${id}`,
      source: from,
      target: id,
      edgeType: "entity-relationship",
    },
    {
      id: `edge-${id}-${to}`,
      source: id,
      target: to,
      edgeType: "relationship-entity",
    },
  ] satisfies EREdgeModel[],
});

const cross = (
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
) => {
  const orient = (
    o: { x: number; y: number },
    p: { x: number; y: number },
    q: { x: number; y: number },
  ) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = orient(b1, b2, a1);
  const d2 = orient(b1, b2, a2);
  const d3 = orient(a1, a2, b1);
  const d4 = orient(a1, a2, b2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};

const crossingCount = (
  positions: Map<string, { x: number; y: number }>,
  edges: Array<{ a: string; b: string }>,
) => {
  let count = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const e1 = edges[i];
      const e2 = edges[j];
      if (e1.a === e2.a || e1.a === e2.b || e1.b === e2.a || e1.b === e2.b) continue;
      if (
        cross(
          positions.get(e1.a)!,
          positions.get(e1.b)!,
          positions.get(e2.a)!,
          positions.get(e2.b)!,
        )
      ) {
        count++;
      }
    }
  }
  return count;
};

describe("entity skeleton layout", () => {
  it("uses an entity-only planar embedding as the seed for K4", () => {
    const rels = [
      relation("rel-a-b", "entity-a", "entity-b"),
      relation("rel-a-c", "entity-a", "entity-c"),
      relation("rel-a-d", "entity-a", "entity-d"),
      relation("rel-b-c", "entity-b", "entity-c"),
      relation("rel-b-d", "entity-b", "entity-d"),
      relation("rel-c-d", "entity-c", "entity-d"),
    ];
    const nodes = [
      entity("entity-a"),
      entity("entity-b"),
      entity("entity-c"),
      entity("entity-d"),
      ...rels.map((r) => r.node),
    ];
    const edges = rels.flatMap((r) => r.edges);

    const skeleton = buildEntitySkeleton(nodes, edges);
    const embedding = computeSkeletonEmbedding(skeleton);

    expect(embedding.deferredEdgeKeys).toHaveLength(0);
    expect(crossingCount(embedding.positions, embedding.planarEdges)).toBe(0);
  });

  it("keeps a maximal planar subgraph first and defers the remaining K3,3 edge", () => {
    const left = ["entity-a", "entity-b", "entity-c"];
    const right = ["entity-x", "entity-y", "entity-z"];
    const rels = left.flatMap((a) =>
      right.map((b) => relation(`rel-${a.slice(7)}-${b.slice(7)}`, a, b)),
    );
    const nodes = [...left, ...right].map(entity).concat(rels.map((r) => r.node));
    const edges = rels.flatMap((r) => r.edges);

    const skeleton = buildEntitySkeleton(nodes, edges);
    const embedding = computeSkeletonEmbedding(skeleton);

    expect(embedding.planarEdgeKeys).toHaveLength(8);
    expect(embedding.deferredEdgeKeys).toHaveLength(1);
    expect(embedding.deferredEdgeKeys[0]).toMatch(/^entity-/);
  });

  it("places relationship diamonds as edge decorations, with self-loops and parallel relationships separate", () => {
    const parallelA = relation("rel-a-b-1", "entity-a", "entity-b");
    const parallelB = relation("rel-a-b-2", "entity-a", "entity-b");
    const loopA = relation("rel-a-a-1", "entity-a", "entity-a");
    const loopB = relation("rel-a-a-2", "entity-a", "entity-a");
    const nodes = [
      entity("entity-a"),
      entity("entity-b"),
      parallelA.node,
      parallelB.node,
      loopA.node,
      loopB.node,
    ];
    const edges = [...parallelA.edges, ...parallelB.edges, ...loopA.edges, ...loopB.edges];

    applySkeletonLayout(nodes, edges, { stressIterations: 20 });

    const byId = new Map(nodes.map((node) => [node.id, node]));
    const a = byId.get("entity-a")!;
    const b = byId.get("entity-b")!;
    expect(Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0))).toBeGreaterThan(120);

    const rel1 = byId.get("rel-a-b-1")!;
    const rel2 = byId.get("rel-a-b-2")!;
    expect(
      Math.hypot((rel1.x ?? 0) - (rel2.x ?? 0), (rel1.y ?? 0) - (rel2.y ?? 0)),
    ).toBeGreaterThan(20);

    const loop1 = byId.get("rel-a-a-1")!;
    const loop2 = byId.get("rel-a-a-2")!;
    expect(Math.hypot((loop1.x ?? 0) - (a.x ?? 0), (loop1.y ?? 0) - (a.y ?? 0))).toBeGreaterThan(
      80,
    );
    expect(
      Math.hypot((loop1.x ?? 0) - (loop2.x ?? 0), (loop1.y ?? 0) - (loop2.y ?? 0)),
    ).toBeGreaterThan(20);
  });

  it("scales explicit-layout distances with the measured small-font geometry", () => {
    const makeLayout = (fontScale: number) => {
      const rel = relation("rel-a-b", "entity-a", "entity-b");
      const nodes = [entity("entity-a"), entity("entity-b"), rel.node];
      const edges = rel.edges;
      applyFontScaleToModels(nodes, edges, fontScale);
      applySkeletonLayout(nodes, edges, { stressIterations: 20 });
      const byId = new Map(nodes.map((node) => [node.id, node]));
      const a = byId.get("entity-a")!;
      const b = byId.get("entity-b")!;
      return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
    };

    const normalDistance = makeLayout(1);
    const smallDistance = makeLayout(0.4);

    expect(smallDistance / normalDistance).toBeCloseTo(0.4, 6);
  });
});
