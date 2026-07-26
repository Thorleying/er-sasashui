import { describe, expect, it } from "vitest";
import { computeAutoAvoidTargets } from "../graph/autoAvoid";
import { computeMovedEntityRelationshipTargets } from "../graph/entityMoveSync";
import { applySkeletonLayout } from "../layout/skeletonLayout";
import type { EREdgeModel, ERNodeModel } from "../types";

// 宽松的性能上限：这些路径在优化前对 500 节点级别的图会退化到数十秒；
// 断言只需证明"不再退化"，因此阈值放得很松以避免 CI 抖动误报。
const LOOSE_BUDGET_MS = 3000;

const sizeOf = (node: ERNodeModel) => {
  if (node.nodeType === "entity") return { width: 120, height: 56 };
  if (node.nodeType === "relationship") return { width: 84, height: 52 };
  return { width: 90, height: 44 };
};

// 确定性伪随机（避免测试抖动）
const rng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
};

interface Synthetic {
  nodes: ERNodeModel[];
  edges: EREdgeModel[];
}

/** 生成 tableCount 张表：每表 1 实体 + attrsPerTable 属性 + 链式二元关系。 */
function makeSyntheticDiagram(tableCount: number, attrsPerTable: number, seed = 7): Synthetic {
  const random = rng(seed);
  const nodes: ERNodeModel[] = [];
  const edges: EREdgeModel[] = [];

  for (let t = 0; t < tableCount; t++) {
    const entityId = `entity-t${t}`;
    const ex = (t % 8) * 420 + random() * 60;
    const ey = Math.floor(t / 8) * 380 + random() * 60;
    nodes.push({
      id: entityId,
      type: "entity",
      nodeType: "entity",
      label: `table_${t}`,
      x: ex,
      y: ey,
    });
    for (let a = 0; a < attrsPerTable; a++) {
      const attrId = `attr-t${t}-a${a}`;
      const angle = (a / attrsPerTable) * Math.PI * 2;
      nodes.push({
        id: attrId,
        type: "attribute",
        nodeType: "attribute",
        label: `col_${a}`,
        parentEntity: entityId,
        x: ex + Math.cos(angle) * (90 + random() * 40),
        y: ey + Math.sin(angle) * (70 + random() * 40),
      });
      edges.push({
        id: `edge-${entityId}-${attrId}`,
        source: entityId,
        target: attrId,
        edgeType: "entity-attribute",
      });
    }
  }

  for (let t = 1; t < tableCount; t++) {
    const relId = `rel-t${t - 1}-t${t}`;
    const a = nodes.find((n) => n.id === `entity-t${t - 1}`)!;
    const b = nodes.find((n) => n.id === `entity-t${t}`)!;
    nodes.push({
      id: relId,
      type: "relationship",
      nodeType: "relationship",
      label: `fk_${t}`,
      x: ((a.x ?? 0) + (b.x ?? 0)) / 2,
      y: ((a.y ?? 0) + (b.y ?? 0)) / 2,
    });
    edges.push({
      id: `edge-${relId}-a`,
      source: `entity-t${t - 1}`,
      target: relId,
      edgeType: "entity-relationship",
    });
    edges.push({
      id: `edge-${relId}-b`,
      source: relId,
      target: `entity-t${t}`,
      edgeType: "relationship-entity",
    });
  }

  return { nodes, edges };
}

describe("layout performance guards", () => {
  it("computeAutoAvoidTargets stays fast on a ~500 node diagram (degraded path)", () => {
    const { nodes, edges } = makeSyntheticDiagram(50, 8); // 50 + 400 + 49 ≈ 499 nodes
    expect(nodes.length).toBeGreaterThanOrEqual(450);

    const start = performance.now();
    const targets = computeAutoAvoidTargets(nodes, sizeOf, { edges });
    const elapsed = performance.now() - start;

    expect(targets).toBeInstanceOf(Map);
    expect(elapsed).toBeLessThan(LOOSE_BUDGET_MS);
  });

  it("computeAutoAvoidTargets with line avoidance stays fast on a ~150 node diagram", () => {
    const { nodes, edges } = makeSyntheticDiagram(15, 8); // 15 + 120 + 14 ≈ 149 nodes

    const start = performance.now();
    const targets = computeAutoAvoidTargets(nodes, sizeOf, { edges });
    const elapsed = performance.now() - start;

    expect(targets).toBeInstanceOf(Map);
    expect(elapsed).toBeLessThan(LOOSE_BUDGET_MS);
  });

  it("applySkeletonLayout (incl. planarity + 2-opt paths) stays fast on 50 tables", () => {
    const { nodes, edges } = makeSyntheticDiagram(50, 8);

    const start = performance.now();
    applySkeletonLayout(nodes, edges, { stressIterations: 60 });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(LOOSE_BUDGET_MS);
  });

  it("applySkeletonLayout with the active 2-opt window (≤40 entities) stays fast", () => {
    const { nodes, edges } = makeSyntheticDiagram(30, 4);

    const start = performance.now();
    applySkeletonLayout(nodes, edges, { stressIterations: 60 });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(LOOSE_BUDGET_MS);
  });

  it("drag-path relationship sync handles 200 synthetic drag events quickly", () => {
    const { nodes, edges } = makeSyntheticDiagram(50, 8);
    const entity = nodes.find((n) => n.id === "entity-t10")!;

    const start = performance.now();
    for (let i = 0; i < 200; i++) {
      entity.x = (entity.x ?? 0) + (i % 2 === 0 ? 1 : -1);
      computeMovedEntityRelationshipTargets(nodes, edges, ["entity-t10"], sizeOf);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(LOOSE_BUDGET_MS);
  });
});
