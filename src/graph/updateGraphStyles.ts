import type { EREdgeModel, ERNodeModel, GraphLike } from "../types";

// G6 updateItem 的"上层 props"字段名/类型很灵活，这里就是装填样式属性的字典。
interface StylesUpdate {
  style?: Record<string, unknown>;
  labelCfg?: { style?: Record<string, unknown> };
  [key: string]: unknown;
}

/** 画布节点字跟页面一致，走系统字体，不绑第三方 webfont。 */
const CANVAS_FONT_FAMILY = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", sans-serif';

export const clampFontScale = (scale: number | undefined): number => {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(1.6, Math.max(0.4, scale as number));
};

export const nodeFontSize = (model: ERNodeModel, scale: number): number => {
  const base = model.nodeType === "entity" ? 18 : model.nodeType === "relationship" ? 16 : 15;
  return base * scale;
};

/**
 * 页面主题脚本通常会写入 data-theme；媒体查询分支只在该脚本无法访问
 * localStorage 等极少数场景下作为兜底。
 */
const isDarkCanvasTheme = (): boolean => {
  if (typeof document === "undefined") return false;
  const explicitTheme = document.documentElement.getAttribute("data-theme");
  if (explicitTheme === "dark") return true;
  if (explicitTheme === "light") return false;
  if (typeof window === "undefined") return false;
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "hour")?.value,
  );
  return !(hour >= 6 && hour < 18);
};

/**
 * Write font sizes to plain graph models before a renderer or layout sees them.
 * This keeps the initial Web force layout and the headless CLI on the same
 * measured geometry as the eventual custom-node render.
 */
export const applyFontScaleToModels = (
  nodes: ERNodeModel[],
  edges: EREdgeModel[],
  fontScale: number = 1,
): void => {
  const safeFontScale = clampFontScale(fontScale);
  nodes.forEach((model) => {
    model.labelCfg = {
      ...model.labelCfg,
      style: {
        ...(model.labelCfg?.style ?? {}),
        fontSize: nodeFontSize(model, safeFontScale),
      },
    };
  });
  edges.forEach((model) => {
    model.labelCfg = {
      ...model.labelCfg,
      style: {
        ...(model.labelCfg?.style ?? {}),
        fontSize: 12 * safeFontScale,
      },
    };
  });
};

/**
 * 黑白 / 彩色样式批量切换。直接写到 G6 graph 上，不返回值。
 * 拆出来是为了让 useGraph 不必再持有这一大坨视觉常量。
 */
export const updateGraphStyles = (
  graphInstance: GraphLike | null,
  colored: boolean,
  fontScale: number = 1,
): void => {
  if (!graphInstance || graphInstance.destroyed) return;

  const safeFontScale = clampFontScale(fontScale);
  const darkCanvas = isDarkCanvasTheme();
  // 彩色节点不随主题变化；深色画布上的连接线与黑白节点改用反白样式。
  // 导出器会把导出副本的连接线恢复为亮色模式样式，不会污染源图。
  const edgeStroke = darkCanvas ? "#ffffff" : "#000000";

  graphInstance.setAutoPaint(false);

  graphInstance.getNodes().forEach((node) => {
    const model = node.getModel();
    const styles: StylesUpdate = {};

    if (colored) {
      if (model.nodeType === "entity") {
        if (model.isPlaceholder) {
          styles.style = {
            fill: "#e0f2fe",
            stroke: "#0ea5e9",
            lineWidth: 2,
            lineDash: [4, 4],
            shadowColor: "rgba(14, 165, 233, 0.2)",
            shadowBlur: 10,
          };
          styles.labelCfg = {
            style: {
              fill: "#0f172a",
              fontWeight: "700",
              fontFamily: CANVAS_FONT_FAMILY,
              fontStyle: "italic",
            },
          };
        } else {
          styles.style = {
            fill: "#e0f2fe",
            stroke: "#0ea5e9",
            lineWidth: 2,
            shadowColor: "rgba(14, 165, 233, 0.2)",
            shadowBlur: 10,
          };
          styles.labelCfg = {
            style: {
              fill: "#0f172a",
              fontWeight: "700",
              fontFamily: CANVAS_FONT_FAMILY,
            },
          };
        }
      } else if (model.nodeType === "relationship") {
        styles.style = {
          fill: "#f5f3ff",
          stroke: "#8b5cf6",
          lineWidth: 2,
          shadowColor: "rgba(139, 92, 246, 0.2)",
          shadowBlur: 10,
        };
        styles.labelCfg = {
          style: { fill: "#0f172a", fontFamily: CANVAS_FONT_FAMILY },
        };
      } else if (model.nodeType === "attribute") {
        if (model.keyType === "pk") {
          styles.style = {
            fill: "#ecfdf5",
            stroke: "#10b981",
            lineWidth: 2,
            shadowColor: "rgba(16, 185, 129, 0.2)",
            shadowBlur: 5,
          };
          styles.labelCfg = {
            style: {
              fill: "#0f172a",
              fontWeight: "700",
              fontFamily: CANVAS_FONT_FAMILY,
            },
          };
        } else {
          styles.style = {
            fill: "#ffffff",
            stroke: "#94a3b8",
            lineWidth: 2,
          };
          styles.labelCfg = {
            style: {
              fill: "#475569",
              fontWeight: "normal",
              fontFamily: CANVAS_FONT_FAMILY,
            },
          };
        }
      }
    } else {
      styles.style = {
        fill: darkCanvas ? "#171716" : "#ffffff",
        stroke: darkCanvas ? "#ffffff" : "#1e293b",
        lineWidth: 2,
        shadowBlur: 0,
      };
      if (model.isPlaceholder) {
        styles.style.lineDash = [4, 4];
        styles.style.stroke = darkCanvas ? "#ffffff" : "#64748b";
        styles.labelCfg = {
          style: {
            fill: darkCanvas ? "#ffffff" : "#64748b",
            fontWeight: "bold",
            fontStyle: "italic",
            fontFamily: CANVAS_FONT_FAMILY,
          },
        };
      } else {
        styles.labelCfg = {
          style: {
            fill: darkCanvas ? "#ffffff" : "#1e293b",
            fontWeight: model.nodeType === "entity" || model.keyType === "pk" ? "bold" : "normal",
            fontFamily: CANVAS_FONT_FAMILY,
          },
        };
      }
    }

    styles.labelCfg = {
      style: {
        ...(styles.labelCfg?.style ?? {}),
        fontSize: nodeFontSize(model, safeFontScale),
      },
    };

    graphInstance.updateItem(node, styles);
  });

  graphInstance.getEdges().forEach((edge) => {
    graphInstance.updateItem(edge, {
      style: {
        stroke: edgeStroke,
        lineWidth: 1.5,
        endArrow: false,
      },
      labelCfg: {
        style: {
          fill: darkCanvas ? "#ffffff" : "#000000",
          fontSize: 12 * safeFontScale,
          background: {
            fill: darkCanvas ? "#171716" : "#ffffff",
            padding: [2, 4, 2, 4],
            radius: 2,
          },
        },
      },
    });
  });

  graphInstance.paint();
  graphInstance.setAutoPaint(true);
};
