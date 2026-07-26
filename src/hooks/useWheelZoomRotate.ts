import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { GraphLike } from "../types";
import type { HistoryManager } from "../history";

interface Options {
  containerRef: MutableRefObject<HTMLElement | null>;
  graphRef: MutableRefObject<GraphLike | null>;
  historyRef: MutableRefObject<HistoryManager>;
  onAfterChange?: () => void;
}

interface RotPivot {
  cx: number;
  cy: number;
}

export function applyGraphRotation(
  graph: Pick<GraphLike, "getNodes" | "refreshPositions"> & {
    emit?: (eventName: string, event?: unknown) => void;
  },
  angle: number,
  cx: number,
  cy: number,
) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  graph.getNodes().forEach((node) => {
    const m = node.getModel();
    const mx = m.x ?? 0;
    const my = m.y ?? 0;
    const dx = mx - cx;
    const dy = my - cy;
    m.x = cx + dx * cos - dy * sin;
    m.y = cy + dx * sin + dy * cos;
  });
  graph.refreshPositions();
  graph.emit?.("viewportchange");
}

// 自定义滚轮平滑缩放 / Ctrl+滚轮平滑旋转
// - 仅改变节点位置，不旋转节点本身的形状/文字朝向
// - 每格累积固定增量，用 rAF 做缓动动画，避免跳变
interface AttachOptions {
  container: HTMLElement;
  graphRef: MutableRefObject<GraphLike | null>;
  historyRef: MutableRefObject<HistoryManager>;
  onAfterChange?: () => void;
}

export function attachWheelZoomRotate({
  container,
  graphRef,
  historyRef,
  onAfterChange,
}: AttachOptions): () => void {
  const ROT_STEP = Math.PI / 18; // 每格滚动累积 10°
  const ZOOM_STEP = 1.12; // 每格滚动缩放系数
  const ZOOM_MIN = 0.1;
  const ZOOM_MAX = 10;
  const SMOOTHING = 0.22; // 每帧吸收的比例（越大越快）
  const MIN_ANGLE = 0.0005; // 旋转收敛阈值（~0.03°）
  const MIN_ZOOM_DELTA = 0.0015; // 缩放收敛阈值（绝对值）

  let pendingAngle = 0;
  let rotPivot: RotPivot | null = null;
  let rotationGraph: GraphLike | null = null;

  let targetZoom: number | null = null;
  let zoomPivot: { x: number; y: number } | null = null;
  let zoomGraph: GraphLike | null = null;

  let rafId: number | null = null;

  // 旋转可能由若干 wheel 事件组成；把"一连串旋转"折成一次撤销步。
  // burst 在最后一次 wheel 后 ROT_BURST_GAP_MS 内视为同一次操作。
  let rotBurstActive = false;
  let rotBurstTimer: ReturnType<typeof setTimeout> | null = null;
  let rotBurstGraph: GraphLike | null = null;
  const ROT_BURST_GAP_MS = 600;

  const clearRotation = () => {
    pendingAngle = 0;
    rotPivot = null;
    rotationGraph = null;
  };

  const clearZoom = () => {
    targetZoom = null;
    zoomPivot = null;
    zoomGraph = null;
  };

  const clearRotationBurst = () => {
    if (rotBurstTimer !== null) clearTimeout(rotBurstTimer);
    rotBurstTimer = null;
    rotBurstActive = false;
    rotBurstGraph = null;
  };

  const computeRotPivot = (graph: GraphLike): RotPivot | null => {
    const nodes = graph.getNodes();
    if (nodes.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nodes.forEach((node) => {
      const b = node.getBBox();
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    });
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  };

  const tick = () => {
    rafId = null;
    const graph = graphRef.current;
    if (!graph || graph.destroyed) {
      clearRotation();
      clearZoom();
      clearRotationBurst();
      return;
    }

    // A regeneration replaces graphRef.current while wheel easing can still
    // have queued frames. Never let the old graph's pending transform land on
    // the newly generated graph.
    if (rotationGraph && rotationGraph !== graph) {
      clearRotation();
      clearRotationBurst();
    }
    if (zoomGraph && zoomGraph !== graph) clearZoom();

    let more = false;

    // 旋转缓动
    if (rotPivot) {
      if (Math.abs(pendingAngle) >= MIN_ANGLE) {
        const step = pendingAngle * SMOOTHING;
        applyGraphRotation(graph, step, rotPivot.cx, rotPivot.cy);
        pendingAngle -= step;
        more = true;
      } else {
        clearRotation();
      }
    }

    // 缩放缓动（围绕固定 pivot，保证该点视觉位置不漂移）
    if (targetZoom !== null && zoomPivot && graph.zoomTo) {
      const cur = graph.getZoom();
      const diff = targetZoom - cur;
      if (Math.abs(diff) < MIN_ZOOM_DELTA) {
        graph.zoomTo(targetZoom, zoomPivot);
        clearZoom();
      } else {
        graph.zoomTo(cur + diff * SMOOTHING, zoomPivot);
        more = true;
      }
    }

    if (more) rafId = requestAnimationFrame(tick);
  };

  const ensureRaf = () => {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  };

  // 触控板双指捏合会派发 ctrlKey === true 的 wheel 事件（浏览器约定），
  // 仅凭 e.ctrlKey 无法区分"按住 Ctrl 滚动"与"捏合缩放"。这里追踪物理
  // Ctrl 键状态：只有真正按下 Ctrl 时才进入旋转分支，捏合走缩放。
  let physicalCtrlDown = false;
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Control") physicalCtrlDown = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Control") physicalCtrlDown = false;
  };
  const onWindowBlur = () => {
    physicalCtrlDown = false;
  };

  const onWheel = (e: WheelEvent) => {
    const graph = graphRef.current;
    if (!graph || graph.destroyed) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.ctrlKey && physicalCtrlDown) {
      if (graph.getNodes().length === 0) return;
      if (rotationGraph && rotationGraph !== graph) {
        clearRotation();
        clearRotationBurst();
      }
      rotationGraph = graph;
      if (!rotPivot) rotPivot = computeRotPivot(graph);
      if (!rotPivot) return;
      // 在一次旋转 burst 的最开始拍一次快照（用于撤销整段旋转）
      if (!rotBurstActive) {
        historyRef.current.record(graph);
        rotBurstActive = true;
        rotBurstGraph = graph;
      }
      if (rotBurstTimer !== null) clearTimeout(rotBurstTimer);
      rotBurstTimer = setTimeout(() => {
        const completedGraph = rotBurstGraph;
        rotBurstActive = false;
        rotBurstTimer = null;
        rotBurstGraph = null;
        if (graphRef.current === completedGraph && typeof onAfterChange === "function") {
          onAfterChange();
        }
      }, ROT_BURST_GAP_MS);
      pendingAngle += (e.deltaY > 0 ? 1 : -1) * ROT_STEP;
    } else {
      // 注：graph.zoomTo 的 center 需要画布坐标（canvas-local 像素），
      // 必须用 graph.get("canvas").getPointByClient，
      // 而不是 graph.getPointByClient（后者返回的是图坐标）。
      const canvas = graph.get("canvas");
      const p = canvas.getPointByClient(e.clientX, e.clientY);
      if (zoomGraph && zoomGraph !== graph) clearZoom();
      zoomGraph = graph;
      zoomPivot = { x: p.x, y: p.y };
      const base = targetZoom !== null ? targetZoom : graph.getZoom();
      const factor = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      targetZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, base * factor));
    }

    ensureRaf();
  };

  const win = typeof window !== "undefined" ? window : null;
  container.addEventListener("wheel", onWheel, {
    capture: true,
    passive: false,
  });
  win?.addEventListener("keydown", onKeyDown);
  win?.addEventListener("keyup", onKeyUp);
  win?.addEventListener("blur", onWindowBlur);
  return () => {
    container.removeEventListener("wheel", onWheel, { capture: true });
    win?.removeEventListener("keydown", onKeyDown);
    win?.removeEventListener("keyup", onKeyUp);
    win?.removeEventListener("blur", onWindowBlur);
    if (rafId !== null) cancelAnimationFrame(rafId);
    clearRotation();
    clearZoom();
    clearRotationBurst();
  };
}

export function useWheelZoomRotate({ containerRef, graphRef, historyRef, onAfterChange }: Options) {
  // onAfterChange 存进 ref：调用方往往传内联箭头函数，若把它放进 effect
  // 依赖，App 每次 re-render 都会拆掉监听并 cancel 进行中的缩放/旋转缓动
  // （表现为打字/弹 toast 时动画戛然而止）。effect 只依赖稳定的 ref。
  const onAfterChangeRef = useRef(onAfterChange);
  onAfterChangeRef.current = onAfterChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    return attachWheelZoomRotate({
      container,
      graphRef,
      historyRef,
      onAfterChange: () => onAfterChangeRef.current?.(),
    });
  }, [containerRef, graphRef, historyRef]);
}
