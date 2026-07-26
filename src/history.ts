/**
 * History Module - 撤销 / 重做（Undo / Redo）
 *
 * 通过对图中所有节点的 { id, x, y, label } 拍快照实现回退。
 * 能撤销的操作：节点拖拽、双击编辑节点标签、快速布局、环绕排布、
 * 滚轮旋转。不能撤销的操作（会重置历史）：重新生成图、隐藏/显示属性。
 *
 * 公开接口（window.History）：
 *   - createManager()  → manager 实例
 *   - manager.record(graph)   在变更前调用，把当前状态压入 past 栈
 *   - manager.undo(graph)     回退到上一个快照
 *   - manager.redo(graph)     恢复被撤销的快照
 *   - manager.reset()         清空历史（图被重建或节点集合变化时调用）
 *   - manager.canUndo() / canRedo()
 */
import { animateNodesToTargets } from "./layout/animation";
import type { GraphLike, NodeSnapshot } from "./types";

const MAX_HISTORY = 100;

export interface HistoryApplyOptions {
  animate?: boolean;
  onFinish?: () => void;
}

/**
 * 除节点位置/标签外，一步操作还可能改变图级设置（字号、注释模式等）。
 * 通过 captureMeta / applyMeta 让这些设置随撤销/重做一起回退，否则
 * "改字号 → Ctrl+Z"会把坐标退回旧值而字号停在新值，布局错乱。
 */
export interface HistoryMetaHooks {
  captureMeta?: () => unknown;
  applyMeta?: (meta: unknown) => void;
}

interface HistoryEntry {
  nodes: NodeSnapshot[];
  meta?: unknown;
}

export interface HistoryManager {
  record(graph: GraphLike): void;
  undo(graph: GraphLike, options?: HistoryApplyOptions): boolean;
  redo(graph: GraphLike, options?: HistoryApplyOptions): boolean;
  reset(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

function snapshot(graph: GraphLike): NodeSnapshot[] | null {
  if (!graph || graph.destroyed) return null;
  return graph.getNodes().map((node) => {
    const m = node.getModel();
    return { id: m.id, x: m.x, y: m.y, label: m.label };
  });
}

function snapshotsEqual(a: NodeSnapshot[] | null, b: NodeSnapshot[] | null) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x.id !== y.id || x.x !== y.x || x.y !== y.y || x.label !== y.label) {
      return false;
    }
  }
  return true;
}

// 撤销/重做时位置以补间动画的形式过渡到目标，标签变更则立即生效
// （标签是文字内容，不适合做插值）。动画时长保持 280ms，足够看到方向但不拖沓。
const ANIM_DURATION_MS = 280;

function applySnapshot(
  graph: GraphLike,
  snap: NodeSnapshot[] | undefined,
  options?: HistoryApplyOptions,
) {
  if (!graph || graph.destroyed || !snap) return;
  const opts = options || {};
  const animate = opts.animate !== false;
  const onFinish = typeof opts.onFinish === "function" ? opts.onFinish : null;
  const animator = animate ? animateNodesToTargets : null;

  // 标签直接更新；位置先收集成 targets 留给动画函数
  const targets = new Map<string, { x?: number; y?: number }>();
  graph.setAutoPaint(false);
  snap.forEach((s) => {
    const item = graph.findById(s.id);
    if (!item) return;
    const cur = item.getModel();
    if (cur.label !== s.label) {
      graph.updateItem(item, { label: s.label });
    }
    if (cur.x !== s.x || cur.y !== s.y) {
      targets.set(s.id, { x: s.x, y: s.y });
    }
  });
  graph.paint();
  graph.setAutoPaint(true);

  if (targets.size === 0) {
    if (onFinish) onFinish();
    return;
  }

  if (animator) {
    animator(graph, targets, ANIM_DURATION_MS, onFinish);
  } else {
    // 兜底：没有 Layout 模块时直接跳到目标
    graph.setAutoPaint(false);
    targets.forEach((t, id) => {
      const item = graph.findById(id);
      if (item) graph.updateItem(item, { x: t.x, y: t.y });
    });
    graph.refreshPositions();
    graph.paint();
    graph.setAutoPaint(true);
    if (onFinish) onFinish();
  }
}

export function createManager(hooks: HistoryMetaHooks = {}): HistoryManager {
  const past: HistoryEntry[] = [];
  const future: HistoryEntry[] = [];

  const captureEntry = (graph: GraphLike): HistoryEntry | null => {
    const nodes = snapshot(graph);
    if (!nodes) return null;
    let meta: unknown;
    try {
      meta = hooks.captureMeta ? hooks.captureMeta() : undefined;
    } catch (_) {
      meta = undefined;
    }
    return { nodes, meta };
  };

  const metaEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (_) {
      return false;
    }
  };

  const applyEntry = (graph: GraphLike, entry: HistoryEntry, options?: HistoryApplyOptions) => {
    // 先恢复图级设置（字号/注释模式），再补间到快照位置——applyMeta 可能
    // 改变节点尺寸，先做能让位置动画的目标与最终视觉一致。
    if (hooks.applyMeta && entry.meta !== undefined) {
      try {
        hooks.applyMeta(entry.meta);
      } catch (_) {}
    }
    applySnapshot(graph, entry.nodes, options);
  };

  return {
    record(graph) {
      const entry = captureEntry(graph);
      if (!entry) return;
      // 与上一次快照完全相同则不重复入栈
      const last = past[past.length - 1];
      if (last && snapshotsEqual(last.nodes, entry.nodes) && metaEqual(last.meta, entry.meta)) {
        return;
      }
      past.push(entry);
      if (past.length > MAX_HISTORY) past.shift();
      future.length = 0;
    },

    undo(graph, options) {
      if (past.length === 0) return false;
      const cur = captureEntry(graph);
      const prev = past.pop();
      if (cur) future.push(cur);
      if (prev) applyEntry(graph, prev, options);
      return true;
    },

    redo(graph, options) {
      if (future.length === 0) return false;
      const cur = captureEntry(graph);
      const next = future.pop();
      if (cur) past.push(cur);
      if (next) applyEntry(graph, next, options);
      return true;
    },

    reset() {
      past.length = 0;
      future.length = 0;
    },

    canUndo() {
      return past.length > 0;
    },

    canRedo() {
      return future.length > 0;
    },
  };
}
