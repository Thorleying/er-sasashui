import type { GraphLike } from "../types";
import { measureNodeSize } from "../builder";
import { computeLayoutSizeScale } from "./sizeAwareGeometry";
import { buildGrid, forEachNeighbor } from "../layout/spatialGrid";

interface ForceableGraph extends GraphLike {
  on(event: string, handler: (e: any) => void): void;
}

export interface ForceLoopController {
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  destroy(): void;
}

interface NodeMetrics {
  width: number;
  height: number;
  componentRadius: number;
}

// 结构性缓存刷新周期（帧）。邻接表 / 节点尺寸 / sizeScale 在开关打开时
// 缓存一次；每帧只做轻量校验（节点数 / 边数变化立即重建），每隔该周期
// 做一次兜底全量刷新，覆盖"标签被双击改名导致 bbox 变化"这类场景。
const STRUCTURE_REFRESH_FRAMES = 30;
// 组件斥力掩码刷新周期（帧）：O(n²)，无需每帧重算。
const COMPONENT_MASK_REFRESH_FRAMES = 24;

// 持续力导向控制器
// 不依赖 G6 自带 layout tick（首次收敛后就不再跑），而是自写一个轻量
// 物理步骤。开关一旦打开，RAF 循环立刻起跑（不必先拖一下）；拖动期间
// 被拖节点由 drag-node 钉在鼠标上，其余节点在循环里被斥力 + 连边引力
// 推拉；关闭时立即停止。
export function attachForceLoop(graph: ForceableGraph): ForceLoopController {
  let enabled = false;
  let raf: number | null = null;
  let pinnedId: string | null = null;
  // 冷启动 ramp-up：当前布局相对我们这套力参数通常不在平衡点，
  // 直接放力会先把节点推远再拉回（欠阻尼弹簧）。让力 / 速度上限
  // 在前 WARMUP_TOTAL 帧从 0 平滑升到 1，节点就能贴着等势线滑过去。
  const WARMUP_TOTAL = 36;
  let warmupRemaining = 0;
  const velocities = new Map<string, { vx: number; vy: number }>();

  const metrics = (node: ReturnType<ForceableGraph["getNodes"]>[number]): NodeMetrics => {
    const model = node.getModel() as any;
    const fallback = measureNodeSize(model);
    let width = fallback.width;
    let height = fallback.height;
    const bbox = node.getBBox?.();
    if (bbox) {
      if (Number.isFinite(bbox.width) && bbox.width > 0) width = bbox.width;
      if (Number.isFinite(bbox.height) && bbox.height > 0) height = bbox.height;
    }
    return {
      width,
      height,
      componentRadius: Math.hypot(width, height) / 2,
    };
  };

  const directionalRadius = (metric: NodeMetrics, ux: number, uy: number): number => {
    const ax = Math.abs(ux);
    const ay = Math.abs(uy);
    const halfWidth = metric.width / 2;
    const halfHeight = metric.height / 2;
    const measured = Math.min(
      ax > 1e-6 ? halfWidth / ax : Infinity,
      ay > 1e-6 ? halfHeight / ay : Infinity,
    );
    const safeMeasured = Number.isFinite(measured) ? measured : Math.max(halfWidth, halfHeight);
    return safeMeasured;
  };

  const componentIds = (
    ids: string[],
    adj: Map<string, Set<string>>,
  ): { byId: Map<string, number>; groups: string[][] } => {
    const byId = new Map<string, number>();
    const groups: string[][] = [];

    ids.forEach((id) => {
      if (byId.has(id)) return;
      const groupIndex = groups.length;
      const group: string[] = [];
      const stack = [id];
      byId.set(id, groupIndex);

      while (stack.length) {
        const current = stack.pop()!;
        group.push(current);
        const neighbors = adj.get(current);
        if (!neighbors) continue;
        neighbors.forEach((neighbor) => {
          if (byId.has(neighbor)) return;
          byId.set(neighbor, groupIndex);
          stack.push(neighbor);
        });
      }

      groups.push(group);
    });

    return { byId, groups };
  };

  const buildComponentRepelMask = (
    ids: string[],
    adj: Map<string, Set<string>>,
    pos: Record<string, { x: number; y: number }>,
    nodeMetrics: Record<string, NodeMetrics>,
    sizeScale: number,
  ): Map<string, Set<string>> => {
    const { byId, groups } = componentIds(ids, adj);
    const centers = groups.map((group) => {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      group.forEach((id) => {
        const p = pos[id];
        const r = nodeMetrics[id]?.componentRadius ?? 50;
        minX = Math.min(minX, p.x - r);
        maxX = Math.max(maxX, p.x + r);
        minY = Math.min(minY, p.y - r);
        maxY = Math.max(maxY, p.y + r);
      });
      const center = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
      };
      let radius = 0;
      group.forEach((id) => {
        const p = pos[id];
        radius = Math.max(
          radius,
          Math.hypot(p.x - center.x, p.y - center.y) + (nodeMetrics[id]?.componentRadius ?? 50),
        );
      });
      return { ...center, radius };
    });
    const skipped = new Map<string, Set<string>>();
    const COMPONENT_REPEL_MARGIN = 140 * sizeScale;

    for (let i = 0; i < ids.length; i++) {
      const a = ids[i];
      const ca = byId.get(a);
      if (ca === undefined) continue;
      for (let j = i + 1; j < ids.length; j++) {
        const b = ids[j];
        const cb = byId.get(b);
        if (cb === undefined || ca === cb) continue;
        const ac = centers[ca];
        const bc = centers[cb];
        const distance = Math.hypot(ac.x - bc.x, ac.y - bc.y);
        if (distance <= ac.radius + bc.radius + COMPONENT_REPEL_MARGIN) continue;
        if (!skipped.has(a)) skipped.set(a, new Set());
        if (!skipped.has(b)) skipped.set(b, new Set());
        skipped.get(a)!.add(b);
        skipped.get(b)!.add(a);
      }
    }

    return skipped;
  };

  const buildAdj = (): Map<string, Set<string>> => {
    const adj = new Map<string, Set<string>>();
    graph.getEdges().forEach((e) => {
      const m = e.getModel() as any;
      if (!adj.has(m.source)) adj.set(m.source, new Set());
      if (!adj.has(m.target)) adj.set(m.target, new Set());
      adj.get(m.source)!.add(m.target);
      adj.get(m.target)!.add(m.source);
    });
    return adj;
  };

  // ---- 帧间缓存：结构 / 尺寸 / 组件掩码 ----
  interface StructureCache {
    adj: Map<string, Set<string>>;
    nodeMetrics: Record<string, NodeMetrics>;
    sizeScale: number;
    maxHalfExtent: number;
    nodeCount: number;
    edgeCount: number;
  }
  let structure: StructureCache | null = null;
  let framesSinceStructure = 0;
  let repelMask: Map<string, Set<string>> | null = null;
  let framesSinceMask = 0;

  const invalidateCaches = () => {
    structure = null;
    repelMask = null;
    framesSinceStructure = 0;
    framesSinceMask = 0;
  };

  const rebuildStructure = (nodes: ReturnType<ForceableGraph["getNodes"]>): StructureCache => {
    const nodeMetrics: Record<string, NodeMetrics> = {};
    let maxHalfExtent = 0;
    nodes.forEach((n) => {
      const m = n.getModel() as any;
      const metric = metrics(n);
      nodeMetrics[m.id] = metric;
      maxHalfExtent = Math.max(maxHalfExtent, metric.width / 2, metric.height / 2);
    });
    const sizeScale = computeLayoutSizeScale(
      nodes.map((node) => node.getModel()),
      (node) => nodeMetrics[node.id],
    );
    return {
      adj: buildAdj(),
      nodeMetrics,
      sizeScale,
      maxHalfExtent,
      nodeCount: nodes.length,
      edgeCount: graph.getEdges().length,
    };
  };

  const step = () => {
    if (!graph || graph.destroyed || !enabled) {
      raf = null;
      return;
    }

    const nodes = graph.getNodes();
    const edgeCount = graph.getEdges().length;
    if (
      !structure ||
      structure.nodeCount !== nodes.length ||
      structure.edgeCount !== edgeCount ||
      framesSinceStructure >= STRUCTURE_REFRESH_FRAMES
    ) {
      structure = rebuildStructure(nodes);
      framesSinceStructure = 0;
      repelMask = null;
    } else {
      framesSinceStructure++;
    }
    const { adj, nodeMetrics, sizeScale, maxHalfExtent } = structure;

    const pos: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      const m = n.getModel() as any;
      pos[m.id] = { x: m.x || 0, y: m.y || 0 };
    });
    const ids = Object.keys(pos);

    if (!repelMask || framesSinceMask >= COMPONENT_MASK_REFRESH_FRAMES) {
      repelMask = buildComponentRepelMask(ids, adj, pos, nodeMetrics, sizeScale);
      framesSinceMask = 0;
    } else {
      framesSinceMask++;
    }
    const skippedCrossComponentRepulsion = repelMask;

    const IDEAL = 130 * sizeScale;
    const K_ATTRACT = 0.04;
    const K_REPEL = 9000 * sizeScale * sizeScale * sizeScale;
    const DAMPING = 0.78;
    const MAX_V = 16 * sizeScale;

    // 斥力近邻化：超出 cutoff 的远处节点 K_REPEL/d² 已可忽略，用网格把
    // 每个节点的斥力邻居限制在 3×3 相邻格子内。cutoff 覆盖最大可能的
    // minD（两个最宽节点相贴）+ 缓冲，保证近距离排斥/防重叠行为不变。
    const repelCutoff = Math.max(2 * maxHalfExtent + 68 * sizeScale, 160 * sizeScale);
    const gridItems = ids.map((id) => ({ id, pos: pos[id] }));
    const repelGrid = buildGrid(gridItems, repelCutoff);

    // easeOutCubic：第一帧位移≈0，第 WARMUP_TOTAL 帧及之后位移=正常
    const t = warmupRemaining > 0 ? 1 - warmupRemaining / WARMUP_TOTAL : 1;
    const ramp = 1 - Math.pow(1 - t, 3);
    if (warmupRemaining > 0) warmupRemaining--;

    const canBatchPaint =
      typeof (graph as any).setAutoPaint === "function" &&
      typeof (graph as any).paint === "function";
    if (canBatchPaint) graph.setAutoPaint(false);
    let painted = false;
    try {
      nodes.forEach((n) => {
        const m = n.getModel() as any;
        const id = m.id as string;
        if (id === pinnedId) return;
        const p = pos[id];
        const metric = nodeMetrics[id];
        if (!metric) return;
        let fx = 0;
        let fy = 0;

        // 斥力：网格近邻节点
        forEachNeighbor(repelGrid, repelCutoff, { pos: p }, (other) => {
          const oid = other.id;
          if (oid === id) return;
          if (skippedCrossComponentRepulsion!.get(id)?.has(oid)) return;
          const op = other.pos;
          const dx = p.x - op.x;
          const dy = p.y - op.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < sizeScale * sizeScale) d2 = sizeScale * sizeScale;
          const d = Math.sqrt(d2);
          const ux = dx / d;
          const uy = dy / d;
          const otherMetric = nodeMetrics[oid];
          if (!otherMetric) return;
          const minD =
            directionalRadius(metric, ux, uy) +
            directionalRadius(otherMetric, -ux, -uy) +
            8 * sizeScale;
          const mag = K_REPEL / d2 + (d < minD ? (minD - d) * 0.8 : 0);
          fx += ux * mag;
          fy += uy * mag;
        });

        // 引力：连边邻居
        const nb = adj.get(id);
        if (nb) {
          nb.forEach((nid) => {
            const op = pos[nid];
            if (!op) return;
            const dx = op.x - p.x;
            const dy = op.y - p.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const delta = (d - IDEAL) * K_ATTRACT;
            fx += (dx / d) * delta;
            fy += (dy / d) * delta;
          });
        }

        const v = velocities.get(id) || { vx: 0, vy: 0 };
        // 冷启动阶段把净力按 ramp 缩小：速度积累得慢，等阻尼把过冲压住后
        // 再放开到完整力度。稳态时 ramp=1，行为不变。
        v.vx = (v.vx + fx * ramp) * DAMPING;
        v.vy = (v.vy + fy * ramp) * DAMPING;
        const cap = MAX_V * (0.25 + 0.75 * ramp);
        const sp = Math.sqrt(v.vx * v.vx + v.vy * v.vy);
        if (sp > cap) {
          v.vx = (v.vx / sp) * cap;
          v.vy = (v.vy / sp) * cap;
        }
        velocities.set(id, v);

        if (Math.abs(v.vx) > 0.05 || Math.abs(v.vy) > 0.05) {
          graph.updateItem(n, { x: p.x + v.vx, y: p.y + v.vy }, false);
          painted = true;
        }
      });
    } finally {
      if (canBatchPaint) {
        // 节点与边在同一帧内一起重绘（此前边比节点晚一帧）。
        if (painted) graph.paint();
        graph.setAutoPaint(true);
      }
    }

    raf = requestAnimationFrame(step);
  };

  graph.on("node:dragstart", (e: any) => {
    if (!enabled || !e.item) return;
    pinnedId = e.item.getID ? e.item.getID() : (e.item.getModel() as any).id;
    velocities.clear();
    // 拖动应当走完整力度。若开关刚打开还在 warmup 中，立即收尾，
    // 这样用户从开启 → 立即拖动 的过程中也不会感到"卡顿/迟滞"。
    warmupRemaining = 0;
  });

  graph.on("node:dragend", () => {
    pinnedId = null;
  });

  const stop = () => {
    pinnedId = null;
    warmupRemaining = 0;
    if (raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    velocities.clear();
    invalidateCaches();
  };

  return {
    setEnabled(en: boolean) {
      if (en === enabled) return;
      enabled = en;
      if (en) {
        velocities.clear();
        invalidateCaches();
        warmupRemaining = WARMUP_TOTAL;
        if (raf == null) raf = requestAnimationFrame(step);
      } else {
        stop();
      }
    },
    isEnabled() {
      return enabled;
    },
    destroy() {
      enabled = false;
      stop();
    },
  };
}
