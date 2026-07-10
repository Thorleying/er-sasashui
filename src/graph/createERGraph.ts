import G6 from "@antv/g6";
import { measureNodeSize } from "../builder";
import type { ChenModelData, ERNodeModel, GraphLike } from "../types";
import { computeLayoutSizeScale } from "./sizeAwareGeometry";

export interface CreateERGraphOptions {
  container: HTMLElement;
  data: ChenModelData;
  /** force2 布局配置；不传则不跑布局（恢复快照路径） */
  layoutCfg?: Record<string, unknown>;
}

/**
 * 用统一的视觉默认值构造一个新的 G6 ER Graph 实例。仅负责构造、不订阅事件、
 * 不渲染数据 —— 调用方拿到实例后自行 .data().render() 并 attach 交互。
 *
 * 拆出来是为了把 useGraph 里 ~100 行 G6 配置常量隔离开。
 */
export function createERGraph({ container, layoutCfg }: CreateERGraphOptions): GraphLike {
  // G6.Graph 接收一份扁平的 cfg；shouldBegin 等回调里的 e 在 G6 4.x 没有公开类型。
  const graph = new (G6 as any).Graph({
    container,
    width: container.offsetWidth,
    height: container.offsetHeight,
    renderer: "canvas",
    background: "#ffffff",
    modes: {
      default: [
        "drag-node", // 1. 先判断拖节点
        {
          type: "drag-canvas",
          allowDragOnItem: true, // 2. 允许在 item 上拖画布
          enableOptimize: false,
          shouldBegin(e: any) {
            // 真空白处或非 node 才开始拖画布；落在 node 上交给 drag-node。
            return !e.item || e.item.getType() !== "node";
          },
        },
        // 滚轮缩放 / Ctrl+滚轮旋转由 useWheelZoomRotate 接管
      ],
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
