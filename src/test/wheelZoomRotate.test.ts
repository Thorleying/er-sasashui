import { describe, expect, it, vi } from "vitest";
import { applyGraphRotation } from "../hooks/useWheelZoomRotate";
import type { ERNodeModel, GraphNodeLike } from "../types";

class FakeNode implements GraphNodeLike {
  constructor(private model: ERNodeModel) {}

  getModel(): ERNodeModel {
    return this.model;
  }

  getBBox() {
    const x = this.model.x ?? 0;
    const y = this.model.y ?? 0;
    return {
      minX: x - 5,
      minY: y - 5,
      maxX: x + 5,
      maxY: y + 5,
      width: 10,
      height: 10,
      centerX: x,
      centerY: y,
    };
  }
}

describe("applyGraphRotation", () => {
  it("refreshes node positions and notifies viewport listeners after rotating", () => {
    const model: ERNodeModel = {
      id: "entity-users",
      type: "entity",
      nodeType: "entity",
      label: "users",
      x: 10,
      y: 0,
    };
    const graph = {
      getNodes: () => [new FakeNode(model)],
      refreshPositions: vi.fn(),
      emit: vi.fn(),
    };

    applyGraphRotation(graph as any, Math.PI / 2, 0, 0);

    expect(model.x).toBeCloseTo(0, 8);
    expect(model.y).toBeCloseTo(10, 8);
    expect(graph.refreshPositions).toHaveBeenCalledTimes(1);
    expect(graph.emit).toHaveBeenCalledWith("viewportchange");
  });
});
