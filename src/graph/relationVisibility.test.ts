import { describe, expect, it } from "vitest";
import { applyRelationVisibility } from "./relationVisibility";
import type { EREdgeModel, ERNodeModel, GraphEdgeLike, GraphLike, GraphNodeLike } from "../types";

function fakeGraph(nodes: ERNodeModel[], edges: EREdgeModel[]) {
  const hidden = new Set<string>();
  const nodeItems = nodes.map((model) => ({ getModel: () => model }) as GraphNodeLike);
  const edgeItems = edges.map((model) => ({ getModel: () => model }) as GraphEdgeLike);
  const graph: GraphLike = {
    getNodes: () => nodeItems,
    getEdges: () => edgeItems,
    findById: () => null,
    updateItem: () => undefined,
    setAutoPaint: () => undefined,
    paint: () => undefined,
    refreshPositions: () => undefined,
    get: () => undefined,
    getZoom: () => 1,
    hideItem: (item: GraphNodeLike | GraphEdgeLike) => {
      hidden.add(item.getModel().id);
    },
    showItem: (item: GraphNodeLike | GraphEdgeLike) => {
      hidden.delete(item.getModel().id);
    },
  };
  return { graph, hidden };
}

describe("applyRelationVisibility", () => {
  it("关闭时只藏关系菱形和关系边", () => {
    const { graph, hidden } = fakeGraph(
      [
        { id: "e1", nodeType: "entity" },
        { id: "r1", nodeType: "relationship" },
        { id: "a1", nodeType: "attribute" },
      ],
      [
        { id: "er1", source: "e1", target: "r1", edgeType: "entity-relationship" },
        { id: "ea1", source: "e1", target: "a1", edgeType: "entity-attribute" },
      ],
    );
    applyRelationVisibility(graph, false);
    expect([...hidden].sort()).toEqual(["er1", "r1"]);
  });

  it("打开时把关系再显示出来", () => {
    const { graph, hidden } = fakeGraph(
      [{ id: "r1", nodeType: "relationship" }],
      [{ id: "er1", source: "r1", target: "e1", edgeType: "relationship-entity" }],
    );
    applyRelationVisibility(graph, false);
    applyRelationVisibility(graph, true);
    expect(hidden.size).toBe(0);
  });
});
