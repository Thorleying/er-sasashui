import { describe, expect, it, vi } from "vitest";
import { buildDefaultLayoutCfg } from "../graph/createERGraph";
import { applyFontScaleToModels } from "../graph/updateGraphStyles";
import type { EREdgeModel, ERNodeModel } from "../types";

vi.mock("@antv/g6", () => ({ default: {} }));

const makeNodes = (): ERNodeModel[] => [
  { id: "entity-a", nodeType: "entity", label: "a" },
  { id: "rel-a-b", nodeType: "relationship", label: "r" },
  { id: "entity-b", nodeType: "entity", label: "b" },
];

const forceConfigAt = (fontScale: number): Record<string, unknown> => {
  const nodes = makeNodes();
  const edges: EREdgeModel[] = [
    { source: "entity-a", target: "rel-a-b" },
    { source: "rel-a-b", target: "entity-b" },
  ];
  applyFontScaleToModels(nodes, edges, fontScale);
  return buildDefaultLayoutCfg(1200, { tick: vi.fn(), onLayoutEnd: vi.fn() }, nodes);
};

describe("default force layout font scaling", () => {
  it("scales every dimensional and force coefficient for regenerated small-font graphs", () => {
    const normal = forceConfigAt(1);
    const small = forceConfigAt(0.4);

    expect(Number(small.linkDistance) / Number(normal.linkDistance)).toBeCloseTo(0.4, 10);
    expect(Number(small.nodeSpacing) / Number(normal.nodeSpacing)).toBeCloseTo(0.4, 10);
    expect(Number(small.maxSpeed) / Number(normal.maxSpeed)).toBeCloseTo(0.4, 10);
    expect(Number(small.minMovement) / Number(normal.minMovement)).toBeCloseTo(0.4, 10);
    expect(Number(small.factor) / Number(normal.factor)).toBeCloseTo(0.4 ** 3, 10);
  });

  it("does not spread a regenerated graph when a requested increase leaves actual shapes unchanged", () => {
    const normal = forceConfigAt(1);
    const unchanged = forceConfigAt(1.1);

    expect(unchanged.linkDistance).toBe(normal.linkDistance);
    expect(unchanged.nodeSpacing).toBe(normal.nodeSpacing);
    expect(unchanged.factor).toBe(normal.factor);
  });
});
