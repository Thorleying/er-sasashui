import { describe, expect, it, vi } from "vitest";
import { applyGraphRotation, attachWheelZoomRotate } from "../hooks/useWheelZoomRotate";
import type { ERNodeModel, GraphLike, GraphNodeLike } from "../types";

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

describe("wheel zoom and rotation", () => {
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

  it("does not apply an old canvas zoom animation to a regenerated graph", () => {
    const callbacks: FrameRequestCallback[] = [];
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    }) as typeof requestAnimationFrame;

    let wheelHandler: ((event: WheelEvent) => void) | null = null;
    const container = {
      addEventListener: (type: string, handler: (event: WheelEvent) => void) => {
        if (type === "wheel") wheelHandler = handler;
      },
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;
    const makeGraph = () => {
      let zoom = 1;
      const graph = {
        destroyed: false,
        getNodes: () => [],
        get: (key: string) =>
          key === "canvas" ? { getPointByClient: () => ({ x: 10, y: 20 }) } : undefined,
        getZoom: () => zoom,
        zoomTo: vi.fn((next: number) => {
          zoom = next;
        }),
      } as unknown as GraphLike;
      return graph;
    };
    const oldGraph = makeGraph();
    const newGraph = makeGraph();
    const graphRef = { current: oldGraph };
    const cleanup = attachWheelZoomRotate({
      container,
      graphRef,
      historyRef: { current: { record: vi.fn() } as any },
    });

    try {
      expect(wheelHandler).not.toBeNull();
      wheelHandler!({
        ctrlKey: false,
        deltaY: -1,
        clientX: 10,
        clientY: 20,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as WheelEvent);
      graphRef.current = newGraph;
      callbacks[0](0);

      expect(newGraph.zoomTo).not.toHaveBeenCalled();
    } finally {
      cleanup();
      if (originalRaf) globalThis.requestAnimationFrame = originalRaf;
      else
        delete (globalThis as { requestAnimationFrame?: typeof requestAnimationFrame })
          .requestAnimationFrame;
    }
  });
});
