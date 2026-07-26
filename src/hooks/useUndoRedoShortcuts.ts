import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { GraphLike } from "../types";
import type { HistoryManager } from "../history";
import { patchRelationshipLinkPoints } from "../builder";

interface Options {
  graphRef: MutableRefObject<GraphLike | null>;
  historyRef: MutableRefObject<HistoryManager>;
  onAfterChange?: () => void;
  /**
   * 撤销/重做真正执行前调用。用于停掉持续力导向等仍在写坐标的循环，
   * 避免补间动画与力循环互相覆盖导致节点抖动。
   */
  onBeforeChange?: () => void;
}

const isEditableTarget = (el: EventTarget | null): boolean => {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (el.closest && el.closest(".cm-editor")) return true;
  return false;
};

// 全局快捷键：Ctrl/Cmd+Z 撤销，Ctrl/Cmd+Y 或 Ctrl/Cmd+Shift+Z 重做。
// 在 CodeMirror、原生 input/textarea、双击编辑框内不拦截（让原生撤销生效）。
export function useUndoRedoShortcuts({
  graphRef,
  historyRef,
  onAfterChange,
  onBeforeChange,
}: Options) {
  // 回调存 ref：调用方通常传内联函数，直接进依赖数组会导致每次
  // re-render 都重绑 keydown 监听。
  const onAfterChangeRef = useRef(onAfterChange);
  onAfterChangeRef.current = onAfterChange;
  const onBeforeChangeRef = useRef(onBeforeChange);
  onBeforeChangeRef.current = onBeforeChange;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      if (isEditableTarget(e.target)) return;

      const graph = graphRef.current;
      if (!graph || graph.destroyed) return;

      const isRedo = key === "y" || (key === "z" && e.shiftKey);

      // 栈空时不拦截默认行为（也不进入 before/after 流程）
      const manager = historyRef.current;
      if (isRedo ? !manager.canRedo() : !manager.canUndo()) return;

      e.preventDefault();
      onBeforeChangeRef.current?.();
      const onFinish = () => {
        // 动画结束后修正菱形连线端点（位置已就绪）
        try {
          patchRelationshipLinkPoints(graph);
        } catch (_) {}
        onAfterChangeRef.current?.();
      };
      const action = isRedo ? "redo" : "undo";
      manager[action](graph, { onFinish });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [graphRef, historyRef]);
}
