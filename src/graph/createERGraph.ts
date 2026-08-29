import G6 from "@antv/g6";
import { measureNodeSize } from "../builder";
import type { ChenModelData, ERNodeModel, GraphLike } from "../types";
import { computeLayoutSizeScale } from "./sizeAwareGeometry";

export interface CreateERGraphOptions {
  container: HTMLElement;
  data: ChenModelData;
  /** force2 布局配置；不传则不跑布局（恢复快照路径） */
  layoutCfg?: Record<string, unknown>;
  /** false 时禁止拖节点，只读分享场景 */
  interactive?: boolean;
  /** 只读预览：拖动画布 + 滚轮缩放，不能改节点 */
  panZoom?: boolean;
  /** 覆盖默认交互；空数组表示纯展示、交给外层点击 */
  modes?: Array<string | Record<string, unknown>>;
}

/** 与 editor.css / user-layout.css 移动端断点一致 */
const MOBILE_EDITOR_MAX_WIDTH = 900;

/** 窄屏禁用 drag-canvas，避免 touchmove 拦截页面纵向滚动 */
function buildDefaultModes(
  interactive = true,
  panZoom = false,
): Array<string | Record<string, unknown>> {
  if (panZoom) {
    return [
      {
        type: "drag-canvas",
        allowDragOnItem: true,
        enableOptimize: false,
      },
      {
        type: "zoom-canvas",
        minZoom: 0.2,
        maxZoom: 4,
        enableOptimize: false,
      },
    ];
  }
  const isMobileEditor =
    typeof window !== "undefined" &&
    window.matchMedia(`(max-width: ${MOBILE_EDITOR_MAX_WIDTH}px)`).matches;

  if (!interactive) {
    if (isMobileEditor) return [];
    return [
      {
        type: "drag-canvas",
        allowDragOnItem: true,
        enableOptimize: false,
        shouldBegin(e: { item?: { getType: () => string } }) {
          return !e.item || e.item.getType() !== "node";
        },
      },
    ];
  }

  const modes: Array<string | Record<string, unknown>> = ["drag-node"];

  if (!isMobileEditor) {
    modes.push({
      type: "drag-canvas",
      allowDragOnItem: true,
      enableOptimize: false,
      shouldBegin(e: { item?: { getType: () => string } }) {
        return !e.item || e.item.getType() !== "node";
      },
    });
  }

  return modes;
}

/**
 * 用统一的视觉默认值构造一个新的 G6 ER Graph 实例。仅负责构造、不订阅事件、
 * 不渲染数据 —— 调用方拿到实例后自行 .data().render() 并 attach 交互。
 *
 * 拆出来是为了把 useGraph 里 ~100 行 G6 配置常量隔离开。
 */
export function createERGraph({
  container,
  layoutCfg,
  interactive = true,
  panZoom = false,
  modes,
}: CreateERGraphOptions): GraphLike {
  // G6.Graph 接收一份扁平的 cfg；shouldBegin 等回调里的 e 在 G6 4.x 没有公开类型。
  const graph = new (G6 as any).Graph({
    container,
    width: container.offsetWidth,
    height: container.offsetHeight,
    renderer: "canvas",
    background: "#ffffff",
    modes: {
      default: modes ?? buildDefaultModes(interactive, panZoom),
      // 滚轮缩放 / Ctrl+滚轮旋转由 useWheelZoomRotate 接管
    },
    layout: layoutCfg,
    defaultNode: {
      style: { lineWidth: 2, stroke: "#000", fill: "#fff" },
      labelCfg: { style: { fill: "#000", fontSize: 16 } },
    },
    defaultEdge: {
      style: { lineWidth: 1, stroke: "#000000" },
      labelCfg: {
        style: {
          fill: "#000000",
          fontSize: 14,
          background: { fill: "#fff", padding: [2, 4, 2, 4] },
        },
      },
    },
    edgeStateStyles: {
      hover: { stroke: "#1890ff", lineWidth: 2 },
    },
    defaultEdgeConfig: { type: "line" },
    nodeStateStyles: {
      hover: { fill: "#e6f7ff", stroke: "#1890ff" },
    },
  });

  return graph as GraphLike;
}

export interface ForceLayoutHooks {
  /** 每个 tick 调用一次（让 G6 把布局过程实时刷出来） */
  tick: () => void;
  /** 布局收敛后的回调（一次性） */
  onLayoutEnd: () => void;
}

/** 默认 force2 布局参数（仅当不是恢复快照路径时使用） */
export function buildDefaultLayoutCfg(
  containerWidth: number,
  hooks: ForceLayoutHooks,
  nodes: ERNodeModel[] = [],
): Record<string, unknown> {
  const sizeScale = computeLayoutSizeScale(nodes);
  return {
    type: "force2",
    preventOverlap: true,
    nodeSize: (node: ERNodeModel) => {
      const size = measureNodeSize(node);
      return Math.max(size.width, size.height);
    },
    nodeSpacing: 20 * sizeScale,
    linkDistance: 120 * sizeScale,
    coulombDisScale: 0.005,
    damping: 0.9,
    // Force2 repulsion is proportional to factor / distance^2. To keep the
    // same equilibrium after every linear dimension is scaled by s, its
    // repulsion coefficient must scale by s^3; attraction and centripetal
    // forces then both scale linearly with the resized geometry.
    factor: sizeScale ** 3,
    maxSpeed: 1000 * sizeScale,
    minMovement: 0.5 * sizeScale,
    interval: 0.02,
    maxIteration: 800,
    animate: true,
    center: [containerWidth / 2, 300],
    clustering: false,
    tick: hooks.tick,
    onLayoutEnd: hooks.onLayoutEnd,
  };
}
