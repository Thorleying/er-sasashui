import { afterEach, describe, expect, it, vi } from "vitest";
import { setupNodeDoubleClickEdit } from "../editor";
import type { EREdgeModel, ERNodeModel, GraphEdgeLike, GraphNodeLike } from "../types";

class FakeNode implements GraphNodeLike {
  constructor(private model: ERNodeModel) {}

  getModel(): ERNodeModel {
    return this.model;
  }

  getBBox() {
    const width = typeof this.model.width === "number" ? this.model.width : 100;
    const height = typeof this.model.height === "number" ? this.model.height : 50;
    const x = this.model.x ?? 0;
    const y = this.model.y ?? 0;
    return {
      minX: x - width / 2,
      minY: y - height / 2,
      maxX: x + width / 2,
      maxY: y + height / 2,
      width,
      height,
      centerX: x,
      centerY: y,
    };
  }
}

class FakeEdge implements GraphEdgeLike {
  constructor(private model: EREdgeModel) {}

  getModel(): EREdgeModel {
    return this.model;
  }
}

class FakeGraph {
  private handlers = new Map<string, Array<(e?: unknown) => void>>();
  private zoom = 1;
  private tx = 0;
  private ty = 0;

  constructor(
    private nodes: FakeNode[],
    private edges: FakeEdge[] = [],
  ) {}

  setViewport(zoom: number, tx = 0, ty = 0): void {
    this.zoom = zoom;
    this.tx = tx;
    this.ty = ty;
  }

  on(event: string, handler: (e?: unknown) => void): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  emit(event: string, e?: unknown): void {
    (this.handlers.get(event) ?? []).forEach((handler) => handler(e));
  }

  getCanvasByPoint(x: number, y: number): { x: number; y: number } {
    return { x: x * this.zoom + this.tx, y: y * this.zoom + this.ty };
  }

  getZoom(): number {
    return this.zoom;
  }

  getNodes(): FakeNode[] {
    return this.nodes;
  }

  getEdges(): FakeEdge[] {
    return this.edges;
  }

  findById(id: string): FakeNode | FakeEdge | null {
    return (
      this.nodes.find((node) => node.getModel().id === id) ??
      this.edges.find((edge) => edge.getModel().id === id) ??
      null
    );
  }

  updateItem(item: unknown, model: Record<string, unknown>): void {
    Object.assign((item as FakeNode).getModel(), model);
  }

  setAutoPaint(): void {}
  paint(): void {}
  refreshPositions(): void {}
  get(): unknown {
    return undefined;
  }
}

class FakeInput {
  type = "";
  value = "";
  style = {} as CSSStyleDeclaration;
  parentNode: { removeChild: (node: unknown) => void } | null = null;

  addEventListener(): void {}
  focus(): void {}
  select(): void {}
}

describe("setupNodeDoubleClickEdit", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the edit input aligned and scaled when the viewport zoom changes", () => {
    const node = new FakeNode({
      id: "entity-users",
      type: "entity",
      nodeType: "entity",
      label: "users",
      x: 100,
      y: 50,
      width: 100,
      height: 50,
      labelCfg: { style: { fontSize: 18 } },
    });
    const graph = new FakeGraph([node]);
    const input = new FakeInput();
    const appended: unknown[] = [];
    const container = {
      appendChild: vi.fn((child: unknown) => {
        appended.push(child);
        (child as FakeInput).parentNode = container;
        return child;
      }),
      removeChild: vi.fn(),
    } as unknown as HTMLElement & { removeChild: (node: unknown) => void };

    vi.stubGlobal("document", {
      createElement: vi.fn(() => input),
    });

    setupNodeDoubleClickEdit(graph as any, container);

    graph.emit("node:dblclick", { item: node });
    expect(appended[0]).toBe(input);
    expect(input.style.left).toBe("50px");
    expect(input.style.top).toBe("25px");
    expect(input.style.width).toBe("100px");
    expect(input.style.height).toBe("50px");

    graph.setViewport(2, 10, -5);
    graph.emit("viewportchange");

    expect(input.style.left).toBe("110px");
    expect(input.style.top).toBe("45px");
    expect(input.style.width).toBe("200px");
    expect(input.style.height).toBe("100px");
    expect(input.style.fontSize).toBe("36px");
    expect(input.style.border).toBe("4px solid #0ea5e9");
    expect(input.style.boxShadow).toBe("0 0 0 6px rgba(14, 165, 233, 0.2)");
  });
});
