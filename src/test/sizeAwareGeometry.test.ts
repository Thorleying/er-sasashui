import { describe, expect, it } from "vitest";
import { measureNodeSize } from "../builder";
import {
  applyLayoutSizeScaleToEdges,
  applySizeChangeToGraph,
  applySizeChangeToModels,
  captureGraphGeometry,
  captureModelGeometry,
  computeActualSizeScale,
  computeLayoutSizeScale,
  type NodeSizeResolver,
} from "../graph/sizeAwareGeometry";
import type { EREdgeModel, ERNodeModel, GraphLike } from "../types";

const sizesFrom =
  (sizes: Record<string, { width: number; height: number }>): NodeSizeResolver =>
  (node) =>
    sizes[node.id];

describe("size-aware geometry", () => {
  it("computes resize scale from the sum of common-node bbox diagonals", () => {
    const nodes: ERNodeModel[] = [
      { id: "a", nodeType: "entity", x: 0, y: 0 },
      { id: "b", nodeType: "attribute", x: 200, y: 0 },
    ];
    const before = captureModelGeometry(
      nodes,
      sizesFrom({ a: { width: 80, height: 60 }, b: { width: 30, height: 40 } }),
    );
    const after = captureModelGeometry(
      nodes,
      sizesFrom({ a: { width: 40, height: 30 }, b: { width: 15, height: 20 } }),
    );

    expect(computeActualSizeScale(before, after)).toBeCloseTo(0.5, 10);
  });

  it("uniformly scales every centre and numeric curve offset around the old actual bounds", () => {
    const nodes: ERNodeModel[] = [
      { id: "a", nodeType: "entity", x: 0, y: 20 },
      { id: "b", nodeType: "relationship", x: 200, y: 120 },
    ];
    const edges: EREdgeModel[] = [
      { source: "a", target: "b", curveOffset: 22 },
      { source: "b", target: "a" },
    ];
    const before = captureModelGeometry(
      nodes,
      sizesFrom({ a: { width: 80, height: 60 }, b: { width: 60, height: 40 } }),
    );
    const after = captureModelGeometry(
      nodes,
      sizesFrom({ a: { width: 40, height: 30 }, b: { width: 30, height: 20 } }),
    );

    const scale = applySizeChangeToModels(nodes, edges, before, after);

    // Old actual bounds are x=[-40,230], y=[-10,140], so pivot=(95,65).
    expect(scale).toBeCloseTo(0.5, 10);
    expect(nodes[0].x).toBeCloseTo(47.5, 10);
    expect(nodes[0].y).toBeCloseTo(42.5, 10);
    expect(nodes[1].x).toBeCloseTo(147.5, 10);
    expect(nodes[1].y).toBeCloseTo(92.5, 10);
    expect(Math.hypot(nodes[1].x! - nodes[0].x!, nodes[1].y! - nodes[0].y!)).toBeCloseTo(
      Math.hypot(200, 100) * 0.5,
      10,
    );
    expect(edges[0].curveOffset).toBeCloseTo(11, 10);
    expect(edges[1].curveOffset).toBeUndefined();
  });

  it("is a strict no-op when actual bboxes did not change", () => {
    const nodes: ERNodeModel[] = [
      { id: "a", nodeType: "entity", x: 10, y: 20 },
      { id: "b", nodeType: "relationship", x: 70, y: 90 },
    ];
    const edges: EREdgeModel[] = [{ source: "a", target: "b", curveOffset: 22 }];
    const before = captureModelGeometry(
      nodes,
      sizesFrom({ a: { width: 80, height: 50 }, b: { width: 80, height: 48 } }),
    );
    const after = captureModelGeometry(
      nodes,
      sizesFrom({ a: { width: 80, height: 50 }, b: { width: 80, height: 48 } }),
    );
    const originalNodes = JSON.stringify(nodes);
    const originalEdges = JSON.stringify(edges);

    expect(applySizeChangeToModels(nodes, edges, before, after)).toBe(1);
    expect(JSON.stringify(nodes)).toBe(originalNodes);
    expect(JSON.stringify(edges)).toBe(originalEdges);
  });

  it("captures live graph bboxes and updates a live graph with the same transform", () => {
    const models: ERNodeModel[] = [
      { id: "a", nodeType: "entity", x: 0, y: 0 },
      { id: "b", nodeType: "attribute", x: 100, y: 0 },
    ];
    const edgeModel: EREdgeModel = { source: "a", target: "b", curveOffset: 20 };
    let dimensions = {
      a: { width: 80, height: 60 },
      b: { width: 60, height: 40 },
    };
    const nodeItems = models.map((model) => ({
      getModel: () => model,
      getBBox: () => {
        const size = dimensions[model.id as keyof typeof dimensions];
        return {
          minX: model.x! - size.width / 2,
          minY: model.y! - size.height / 2,
          maxX: model.x! + size.width / 2,
          maxY: model.y! + size.height / 2,
          centerX: model.x!,
          centerY: model.y!,
          ...size,
        };
      },
    }));
    const edgeItem = { getModel: () => edgeModel };
    const graph = {
      destroyed: false,
      getNodes: () => nodeItems,
      getEdges: () => [edgeItem],
      updateItem: (item: { getModel: () => Record<string, unknown> }, update: object) =>
        Object.assign(item.getModel(), update),
      setAutoPaint: () => {},
      paint: () => {},
    } as unknown as GraphLike;
    const before = captureGraphGeometry(graph);
    dimensions = {
      a: { width: 40, height: 30 },
      b: { width: 30, height: 20 },
    };

    expect(applySizeChangeToGraph(graph, before)).toBeCloseTo(0.5, 10);
    expect(models[1].x! - models[0].x!).toBeCloseTo(50, 10);
    expect(edgeModel.curveOffset).toBeCloseTo(10, 10);
  });

  it("derives layout spacing from measured shape size rather than requested font scale", () => {
    const minimumSizedNodes: ERNodeModel[] = [
      {
        id: "entity",
        nodeType: "entity",
        label: "a",
        labelCfg: { style: { fontSize: 18 * 1.6 } },
      },
      {
        id: "relationship",
        nodeType: "relationship",
        label: "r",
        labelCfg: { style: { fontSize: 16 * 1.6 } },
      },
      {
        id: "attribute",
        nodeType: "attribute",
        keyType: "normal",
        label: "x",
        labelCfg: { style: { fontSize: 15 * 1.6 } },
      },
    ];

    // All three short-label key shapes remain at their base minimum dimensions.
    minimumSizedNodes.forEach((node) => {
      const current = measureNodeSize(node);
      const base = measureNodeSize({
        ...node,
        labelCfg: {
          style: {
            fontSize: node.nodeType === "entity" ? 18 : node.nodeType === "relationship" ? 16 : 15,
          },
        },
      });
      expect(current).toEqual(base);
    });
    expect(computeLayoutSizeScale(minimumSizedNodes)).toBe(1);

    const halfSized = minimumSizedNodes.map((node) => ({
      ...node,
      labelCfg: {
        ...node.labelCfg,
        style: {
          ...(node.labelCfg?.style ?? {}),
          fontSize:
            (node.nodeType === "entity" ? 18 : node.nodeType === "relationship" ? 16 : 15) * 0.5,
        },
      },
    }));
    expect(computeLayoutSizeScale(halfSized)).toBeCloseTo(0.5, 10);
  });

  it("falls back to scale one for empty snapshots and empty layouts", () => {
    expect(computeActualSizeScale(new Map(), new Map())).toBe(1);
    expect(computeLayoutSizeScale([])).toBe(1);
  });

  it("scales freshly generated curved lines by the measured layout scale", () => {
    const edges: EREdgeModel[] = [
      { source: "a", target: "b", curveOffset: 22 },
      { source: "b", target: "c" },
    ];

    applyLayoutSizeScaleToEdges(edges, 0.4);

    expect(edges[0].curveOffset).toBeCloseTo(8.8, 10);
    expect(edges[1].curveOffset).toBeUndefined();
  });
});
