/**
 * Editor Module - G6 节点双击编辑功能与节点测量工具。
 * CodeMirror 编辑器组件位于 ./codeEditor，本文件只负责图节点交互。
 */
import type { ERNodeModel, GraphLike, GraphNodeLike } from "./types";

// ========================
// 节点双击编辑功能
// ========================

export interface NodeDimensions {
  width: number;
  height: number;
  fontSize: number;
}

const readLabelFontSize = (nodeModel: ERNodeModel, fallback: number): number => {
  const raw = nodeModel.labelCfg?.style?.fontSize;
  const parsed =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getShrinkOnlyScale = (fontSize: number, baseFontSize: number): number =>
  Math.min(1, fontSize / baseFontSize);

const getAttributeHeight = (fontSize: number, hasUnderline: boolean): number => {
  const scale = getShrinkOnlyScale(fontSize, 15);
  const minHeight = 40 * scale;
  const verticalRoom = (hasUnderline ? 24 : 16) * scale;
  return Math.max(minHeight, fontSize + verticalRoom);
};

/**
 * 根据节点模型计算输入框的尺寸
 */
export function getNodeDimensions(nodeModel: ERNodeModel): NodeDimensions {
  const text = nodeModel.label || "";
  const getTextWidth = (s: string, fontSize: number) => {
    let width = 0;
    for (const char of s) {
      if (/[一-龥]/.test(char)) {
        width += fontSize;
      } else {
        width += fontSize * 0.6;
      }
    }
    return width;
  };

  let width: number;
  let height: number;
  let fontSize: number;

  if (nodeModel.type === "entity") {
    fontSize = readLabelFontSize(nodeModel, 18);
    const scale = getShrinkOnlyScale(fontSize, 18);
    const textWidth = getTextWidth(text, fontSize);
    width = Math.max(80 * scale, textWidth + 20 * scale);
    height = Math.max(50 * scale, fontSize + 20 * scale);
  } else if (nodeModel.type === "relationship") {
    fontSize = readLabelFontSize(nodeModel, 16);
    const scale = getShrinkOnlyScale(fontSize, 16);
    const textWidth = getTextWidth(text, fontSize);
    const horizontalPadding = 24 * scale;
    const minWidth = 80 * scale;
    const minHeight = 40 * scale;
    const requiredWidth = textWidth + horizontalPadding * 2;
    const halfWidth = Math.max(minWidth / 2, requiredWidth / 2);
    width = halfWidth * 2;
    height = Math.max(minHeight, Math.min(halfWidth * 0.6, fontSize + 16 * scale) * 2);
  } else {
    // attribute
    fontSize = readLabelFontSize(nodeModel, 15);
    const scale = getShrinkOnlyScale(fontSize, 15);
    const textWidth = getTextWidth(text, fontSize);
    width = Math.max(60 * scale, textWidth + 32 * scale);
    height = getAttributeHeight(fontSize, nodeModel.keyType === "pk");
  }

  return { width, height, fontSize };
}

/**
 * 根据节点类型获取对应的颜色
 */
export function getNodeColor(nodeModel: ERNodeModel): string {
  if (nodeModel.type === "entity") {
    return "#0ea5e9"; // 蓝色
  } else if (nodeModel.type === "relationship") {
    return "#722ed1"; // 紫色
  } else if (nodeModel.type === "attribute") {
    return nodeModel.keyType === "pk" ? "#10b981" : "#94a3b8"; // 绿色或灰色
  }
  return "#ff8a65"; // 默认橙色
}

export interface NodeDoubleClickEditOptions {
  /**
   * 在节点标签即将被修改前调用，用于上层把当前状态压入撤销栈。
   * 仅在 label 实际变化时触发。
   */
  onBeforeChange?: () => void;
  /**
   * 在节点标签完成修改后调用，用于上层安排持久化保存。
   * 仅在 label 实际变化时触发。
   */
  onAfterChange?: () => void;
}

export interface NodeDoubleClickEditController {
  finishEditing: (save: boolean) => void;
  isEditing: () => boolean;
  refreshEditing: () => void;
}

// G6 4.x 中 graph.on(eventName, fn) 的事件参数没有公开类型，这里只用到 e.item
interface NodeEvent {
  item: GraphNodeLike & {
    getModel(): ERNodeModel;
  };
}

// G6 graph 上本模块用到的额外方法
interface EditableGraph extends GraphLike {
  getCanvasByPoint(x: number, y: number): { x: number; y: number };
  on(eventName: "node:dblclick", handler: (e: NodeEvent) => void): void;
  on(eventName: "canvas:click" | "viewportchange", handler: () => void): void;
  on(eventName: string, handler: (e: unknown) => void): void;
}

const syncNodeEditInputStyle = (
  graph: EditableGraph,
  node: NodeEvent["item"],
  input: HTMLInputElement,
): void => {
  const model = node.getModel();
  const bbox = typeof node.getBBox === "function" ? node.getBBox() : null;
  const canvasPoint = graph.getCanvasByPoint(
    bbox?.centerX ?? model.x ?? 0,
    bbox?.centerY ?? model.y ?? 0,
  );
  const currentZoom = graph.getZoom();

  const dimensions = getNodeDimensions(model);
  const scaledWidth = (bbox?.width ?? dimensions.width) * currentZoom;
  const scaledHeight = (bbox?.height ?? dimensions.height) * currentZoom;
  const scaledFontSize = dimensions.fontSize * currentZoom;

  const borderColor = getNodeColor(model);
  const rgbValues = (borderColor.substring(1).match(/.{1,2}/g) || []).map((x) => parseInt(x, 16));
  const shadowColorRGB = `rgba(${rgbValues.join(", ")}, 0.2)`;

  // 定位是相对于 G6 的容器 (container)
  input.style.left = canvasPoint.x - scaledWidth / 2 + "px";
  input.style.top = canvasPoint.y - scaledHeight / 2 + "px";
  input.style.width = scaledWidth + "px";
  input.style.height = scaledHeight + "px";
  input.style.border = `${2 * currentZoom}px solid ${borderColor}`;
  input.style.fontSize = scaledFontSize + "px";
  input.style.boxShadow = `0 0 0 ${3 * currentZoom}px ${shadowColorRGB}`;

  if (model.type === "entity") {
    input.style.borderRadius = 4 * currentZoom + "px";
  } else if (model.type === "relationship") {
    input.style.borderRadius = 8 * currentZoom + "px";
    // 菱形节点用矩形输入框，不旋转以便于编辑
  } else {
    // attribute
    input.style.borderRadius = "50%";
  }
};

/**
 * 为 G6 图形实例设置节点双击编辑功能
 */
export function setupNodeDoubleClickEdit(
  graph: EditableGraph,
  container: HTMLElement,
  options?: NodeDoubleClickEditOptions,
): NodeDoubleClickEditController {
  const onBeforeChange = options && options.onBeforeChange;
  const onAfterChange = options && options.onAfterChange;
  let editingNode: NodeEvent["item"] | null = null;
  let editInput: HTMLInputElement | null = null;

  const startEditing = (node: NodeEvent["item"], model: ERNodeModel) => {
    editingNode = node;

    const borderColor = getNodeColor(model);

    const input = document.createElement("input");
    input.type = "text";
    input.value = model.label || "";
    input.style.position = "absolute";
    input.style.padding = "0";
    input.style.outline = "none";
    input.style.textAlign = "center";
    input.style.backgroundColor = "rgba(255, 255, 255, 0.95)";
    input.style.zIndex = "1000";
    input.style.fontWeight = model.type === "entity" || model.keyType === "pk" ? "bold" : "normal";
    syncNodeEditInputStyle(graph, node, input);

    container.appendChild(input);
    input.focus();
    input.select();

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        finishEditing(true);
        e.preventDefault();
      } else if (e.key === "Escape") {
        finishEditing(false);
        e.preventDefault();
      }
    });

    input.addEventListener("blur", () => {
      setTimeout(() => finishEditing(true), 100);
    });

    editInput = input;
  };

  const refreshEditing = () => {
    if (!editingNode || !editInput) return;
    syncNodeEditInputStyle(graph, editingNode, editInput);
  };

  const finishEditing = (save: boolean) => {
    if (!editingNode || !editInput) return;

    if (save && editInput.value.trim()) {
      const newLabel = editInput.value.trim();
      const model = editingNode.getModel();

      if (newLabel !== model.label) {
        if (typeof onBeforeChange === "function") {
          try {
            onBeforeChange();
          } catch (_e) {
            /* 忽略上层异常 */
          }
        }
        graph.updateItem(editingNode, { label: newLabel });

        // 节点 label 变化会改变其包围盒尺寸，但 G6 不会主动让连线重新跑
        // getLinkPoint —— 必须显式刷新与该节点相连的边，否则要等用户拖
        // 一下节点连线才会贴上来。
        const nodeId = model.id;
        graph.getEdges().forEach((edge) => {
          const em = edge.getModel();
          if (em.source === nodeId || em.target === nodeId) {
            graph.updateItem(edge, {});
          }
        });
        if (graph.refresh) graph.refresh();
        if (typeof onAfterChange === "function") {
          try {
            onAfterChange();
          } catch (_e) {
            /* 忽略上层异常 */
          }
        }
      }
    }

    if (editInput && editInput.parentNode) {
      editInput.parentNode.removeChild(editInput);
    }
    editInput = null;
    editingNode = null;
  };

  graph.on("node:dblclick", (e) => {
    const node = e.item;
    const model = node.getModel();

    if (editingNode) {
      finishEditing(false);
    }

    startEditing(node, model);
  });

  graph.on("canvas:click", () => {
    if (editingNode) {
      finishEditing(true);
    }
  });

  graph.on("viewportchange", () => {
    refreshEditing();
  });

  return {
    finishEditing,
    isEditing: () => editingNode !== null,
    refreshEditing,
  };
}
