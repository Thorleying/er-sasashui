/**
 * SVG Exporter Module
 * 导出 SVG 功能模块
 */
import type { MutableRefObject } from "react";
import type { GraphLike } from "./types";

// ─── 公共类型 ────────────────────────────────────────────

export type ExportDoneCallback = (err: unknown, triggerDownload?: (() => void) | null) => void;

/**
 * 导出失败时通过 onError 上报的错误码。
 * 具体的用户可见文案由调用方（App / EmbeddedApp）按当前语言映射，
 * exporter 自身不携带任何语言相关字符串。
 */
export type ExportErrorCode =
  "export-no-graph" | "export-svg-failed" | "export-png-failed" | "export-drawio-failed";

// G6 4.x 的导出/克隆链路里我们用到了几个未在 GraphLike 上声明的方法，
// 在本模块内补齐一个最小可用的别名（不再 extends GraphLike，否则
// G6 内部更宽的 INode.getModel 不能赋值到我们窄化过的 GraphNodeLike）。
// 需要 GraphLike 的位置（如 patchRelationshipLinkPoints）就近 cast。
interface ExportableGraph {
  save(): unknown;
  read(data: unknown): void;
  get(key: string): any;
  getGroup(): {
    getCanvasBBox(): {
      minX: number;
      minY: number;
      width: number;
      height: number;
    };
  };
  destroy(): void;
  once?(eventName: string, callback: () => void): void;
}

// G6 4.x 的 GraphOptions 类型私有且字段繁多，本模块只构造一个临时 SVG graph
// 用于导出，不必复刻；接受任意配置形状即可。
type GraphConstructor = new (config: any) => ExportableGraph;
interface G6Like {
  Graph: GraphConstructor;
}

type PatchRelationshipFn = (graph: GraphLike) => void;

interface BaseExportOptions {
  graphRef: MutableRefObject<GraphLike | null>;
  containerRef: MutableRefObject<HTMLElement | null>;
  patchRelationshipLinkPoints: PatchRelationshipFn;
  G6: G6Like;
  /** 底色矩形颜色（默认 #ffffff）。历史快照传入暖米白和卡片融合。 */
  backgroundFill?: string;
}

export interface BuildExportSVGResult {
  svgString: string;
  width: number;
  height: number;
}

export type BuildExportSVGCallback = (err: unknown, result?: BuildExportSVGResult | null) => void;

export type BuildExportSVGOptions = BaseExportOptions;

interface UserFacingExportOptions extends BaseExportOptions {
  hasGraph: boolean;
  onError?: (code: ExportErrorCode) => void;
  onDone?: ExportDoneCallback;
  /** 覆盖导出文件名（不含扩展名）；默认 er-diagram-<时间戳>。 */
  filenameBase?: string;
}

export type ExportSVGOptions = UserFacingExportOptions;
export interface ExportPNGOptions extends UserFacingExportOptions {
  /** 默认按 DPR 自适应（>=2，<=3），手动指定可以覆盖。 */
  scale?: number;
}
export interface ExportDrawioOptions {
  graphRef: MutableRefObject<GraphLike | null>;
  hasGraph: boolean;
  onError?: (code: ExportErrorCode) => void;
  onDone?: ExportDoneCallback;
  patchRelationshipLinkPoints?: PatchRelationshipFn;
  filenameBase?: string;
}

// ─── 实现 ────────────────────────────────────────────────

/**
 * 生成默认导出文件名（带日期时间后缀，避免连续导出全靠系统 "(1)(2)" 区分）。
 */
export function defaultExportFilenameBase(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `er-diagram-${stamp}`;
}

/** 下载 SVG 文件（统一走 downloadBlob，延迟 revoke 避免部分浏览器拿到空文件） */
export function downloadSVG(svgString: string, filename: string): void {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  downloadBlob(blob, filename);
}

/**
 * 基于当前图形构建一份独立、完整的导出用 SVG 字符串。
 * 生成过程与 exportSVG 完全一致（临时 SVG graph + 菱形补丁 + viewBox + 底色）。
 *
 * 用户下载用的 SVG/PNG 应保持白底；历史快照传入暖米白让 SVG 缩略图
 * 能和米色卡片无缝融合。
 *
 * 回调 cb(err, { svgString, width, height })
 */
export function buildExportSVG(options: BuildExportSVGOptions, cb: BuildExportSVGCallback): void {
  const { graphRef, containerRef, patchRelationshipLinkPoints, G6 } = options;
  const backgroundFill = options.backgroundFill || "#ffffff";
  // 失败/成功共用的清理逻辑：任何路径都不能泄漏临时容器或临时图实例。
  let tempContainer: HTMLDivElement | null = null;
  let tempGraph: ExportableGraph | null = null;
  const cleanup = () => {
    if (tempGraph) {
      try {
        tempGraph.destroy();
      } catch (_) {
        /* 已销毁则忽略 */
      }
      tempGraph = null;
    }
    if (tempContainer && tempContainer.parentNode) {
      tempContainer.parentNode.removeChild(tempContainer);
    }
    tempContainer = null;
  };
  try {
    const sourceGraph = graphRef.current as unknown as ExportableGraph | null;
    const sourceContainer = containerRef.current;
    if (!sourceGraph || !sourceContainer) {
      cb(new Error("graph or container not ready"));
      return;
    }
    const data = sourceGraph.save();

    tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "-9999px";
    document.body.appendChild(tempContainer);

    tempGraph = new G6.Graph({
      container: tempContainer,
      width: sourceContainer.offsetWidth,
      height: sourceContainer.offsetHeight || 600,
      renderer: "svg",
      modes: { default: [] },
      layout: null,
      defaultNode: {
        style: { lineWidth: 2, stroke: "#000", fill: "#fff" },
        labelCfg: { style: { fill: "#000", fontSize: 16 } },
      },
      defaultEdge: {
        style: { lineWidth: 1, stroke: "#000" },
        labelCfg: {
          style: {
            fill: "#000",
            fontSize: 14,
            background: { fill: "#fff", padding: [2, 4, 2, 4] },
          },
        },
      },
      edgeStateStyles: { hover: { stroke: "#1890ff", lineWidth: 2 } },
      defaultEdgeConfig: {
        type: "cubic-horizontal",
        router: {
          name: "orthogonal",
          args: { offset: 25, maxTurns: 5, useMaxTurns: false, gridSize: 1 },
        },
        connector: {
          name: "curve",
          args: { curveType: "cubic-horizontal", curveOffset: 50 },
        },
      },
    });

    const graphInstance = tempGraph;

    // 渲染完成检测：监听 afterrender + rAF 轮询 bbox，硬超时 3s 兜底。
    // 比原先固定等 1000ms 更快（小图一帧内完成），也更稳（大图不会导出到
    // 渲染一半的内容）。
    const RENDER_TIMEOUT_MS = 3000;
    const deadline = Date.now() + RENDER_TIMEOUT_MS;
    let finished = false;
    let hardTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (hardTimer !== null) clearTimeout(hardTimer);
      try {
        const svgElement = graphInstance.get("canvas").get("el") as SVGSVGElement;
        const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

        const bbox = graphInstance.getGroup().getCanvasBBox();
        const padding = 40;
        const viewBoxX = bbox.minX - padding;
        const viewBoxY = bbox.minY - padding;
        const viewBoxWidth = bbox.width + padding * 2;
        const viewBoxHeight = bbox.height + padding * 2;

        clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clonedSvg.setAttribute("width", String(viewBoxWidth));
        clonedSvg.setAttribute("height", String(viewBoxHeight));
        clonedSvg.setAttribute(
          "viewBox",
          `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`,
        );

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", String(viewBoxX));
        rect.setAttribute("y", String(viewBoxY));
        rect.setAttribute("width", String(viewBoxWidth));
        rect.setAttribute("height", String(viewBoxHeight));
        rect.setAttribute("fill", backgroundFill);
        clonedSvg.insertBefore(rect, clonedSvg.firstChild);

        const svgString = new XMLSerializer().serializeToString(clonedSvg);

        cleanup();
        cb(null, {
          svgString,
          width: viewBoxWidth,
          height: viewBoxHeight,
        });
      } catch (innerError) {
        cleanup();
        cb(innerError);
      }
    };
    const expectedNodes = Array.isArray((data as { nodes?: unknown[] })?.nodes)
      ? (data as { nodes: unknown[] }).nodes.length
      : 0;
    const poll = () => {
      if (finished) return;
      const bbox = graphInstance.getGroup().getCanvasBBox();
      const rendered = bbox.width > 0 && bbox.height > 0;
      if (rendered || expectedNodes === 0 || Date.now() >= deadline) {
        finish();
        return;
      }
      requestAnimationFrame(poll);
    };

    if (typeof graphInstance.once === "function") {
      graphInstance.once("afterrender", () => requestAnimationFrame(poll));
    }
    hardTimer = setTimeout(finish, RENDER_TIMEOUT_MS);

    graphInstance.read(data);
    patchRelationshipLinkPoints(graphInstance as unknown as GraphLike);
    // afterrender 可能已在 read 内同步触发，rAF 轮询兜底。
    requestAnimationFrame(poll);
  } catch (err) {
    cleanup();
    cb(err);
  }
}

/** 导出 ER 图为 SVG */
export function exportSVG(options: ExportSVGOptions): void {
  const { graphRef, hasGraph, onError, onDone, filenameBase } = options;

  const finishErr = (code: ExportErrorCode, detail?: unknown) => {
    if (detail !== undefined) console.error(`[sql2er] ${code}:`, detail);
    if (onError) onError(code);
    if (onDone) onDone(new Error(code), null);
  };
  const finishOk = (download: () => void) => {
    if (onDone) onDone(null, download);
  };

  if (!graphRef.current || !hasGraph) {
    finishErr("export-no-graph");
    return;
  }

  buildExportSVG(options, (err, result) => {
    if (err || !result) {
      finishErr("export-svg-failed", err);
      return;
    }
    const base = filenameBase || defaultExportFilenameBase();
    finishOk(() => downloadSVG(result.svgString, `${base}.svg`));
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

type RasterizeCallback = (err: unknown, blob?: Blob | null) => void;

// 浏览器 canvas 尺寸硬上限。超过后 canvas 会静默变成 0 尺寸或 toBlob 返回 null。
// Chrome/Firefox/新 Safari：单边 16384、总面积约 16384²；iOS 上保守取
// 4096 单边 / 16.7M 面积（老设备限制），避免"大图导出必失败"。
const isIOS =
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
const MAX_CANVAS_SIDE = isIOS ? 4096 : 16384;
const MAX_CANVAS_AREA = isIOS ? 16_777_216 : 268_435_456;

/**
 * 按浏览器 canvas 上限钳制导出倍率。导出前调用，保证 width*scale /
 * height*scale 不超单边与总面积上限。返回值可能小于 1（图本身超大时）。
 */
export function clampExportScale(
  width: number,
  height: number,
  requested: number,
  maxSide: number = MAX_CANVAS_SIDE,
  maxArea: number = MAX_CANVAS_AREA,
): number {
  if (!(width > 0) || !(height > 0)) return requested;
  const bySide = Math.min(maxSide / width, maxSide / height);
  const byArea = Math.sqrt(maxArea / (width * height));
  return Math.min(requested, bySide, byArea);
}

// 把 SVG 字符串按 scale 倍数光栅化成 PNG Blob。
// 走这条路而不是 G6 的 toFullDataURL：后者按 CSS 像素 1:1 输出，
// 在高分屏或放大查看时文字和细线会糊。
// toBlob 返回 null（个别环境对大 canvas 的表现）时自动按半倍率重试一次。
function rasterizeSVGToPNG(
  svgString: string,
  width: number,
  height: number,
  scale: number,
  cb: RasterizeCallback,
): void {
  const svgBlob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const drawAt = (effectiveScale: number, retriesLeft: number) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * effectiveScale));
        canvas.height = Math.max(1, Math.round(height * effectiveScale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          cb(new Error("canvas getContext returned null"));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            if (retriesLeft > 0 && effectiveScale > 0.5) {
              drawAt(effectiveScale / 2, retriesLeft - 1);
              return;
            }
            URL.revokeObjectURL(url);
            cb(new Error("canvas.toBlob returned null"));
            return;
          }
          URL.revokeObjectURL(url);
          cb(null, blob);
        }, "image/png");
      } catch (e) {
        URL.revokeObjectURL(url);
        cb(e);
      }
    };
    drawAt(clampExportScale(width, height, scale), 2);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    cb(new Error("SVG image decode failed"));
  };
  img.src = url;
}

export function exportPNG(options: ExportPNGOptions): void {
  const { graphRef, hasGraph, onError, onDone, scale: scaleOpt, filenameBase } = options;

  const finishErr = (code: ExportErrorCode, detail?: unknown) => {
    if (detail !== undefined) console.error(`[sql2er] ${code}:`, detail);
    if (onError) onError(code);
    if (onDone) onDone(new Error(code), null);
  };
  const finishOk = (download: () => void) => {
    if (onDone) onDone(null, download);
  };

  if (!graphRef.current || !hasGraph) {
    finishErr("export-no-graph");
    return;
  }

  // 默认至少 2x，在高 DPR 屏幕上跟随系统（封顶 3x 以控制文件体积）。
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  const scale = scaleOpt || Math.max(2, Math.min(3, Math.ceil(dpr)));

  buildExportSVG(options, (err, result) => {
    if (err || !result) {
      finishErr("export-png-failed", err);
      return;
    }
    rasterizeSVGToPNG(result.svgString, result.width, result.height, scale, (rErr, blob) => {
      if (rErr || !blob) {
        finishErr("export-png-failed", rErr);
        return;
      }
      const base = filenameBase || defaultExportFilenameBase();
      finishOk(() => downloadBlob(blob, `${base}.png`));
    });
  });
}

// ========================================
// Drawio (mxfile) 导出
// ========================================
//
// 目的：把当前 G6 图一比一输出为 drawio 官方可直接 File -> Open 的 .drawio 文件。
// 选择直接从 G6 图的"当前状态"抽取节点/边，而不是复用 SVG 导出通路，因为 drawio 需要
// 结构化的 mxCell（带 vertex/edge/source/target/geometry），而不是扁平 SVG 元素。

export function escapeXml(s: unknown): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface DrawioStyleSource {
  style?: {
    fill?: string;
    stroke?: string;
    lineWidth?: number;
    lineDash?: number[];
  };
  labelCfg?: {
    style?: {
      fill?: string;
      fontSize?: number;
      fontWeight?: string | number;
      fontStyle?: string;
    };
  };
  nodeType?: string;
  keyType?: string;
}

// 把样式对象拼成 drawio 的 style 串。drawio 不认 G6 的驼峰键，需要映射。
function buildVertexStyle(model: DrawioStyleSource): string {
  const s = model.style || {};
  const fill = s.fill || "#ffffff";
  const stroke = s.stroke || "#000000";
  const strokeWidth = s.lineWidth || 1;
  const dashed = Array.isArray(s.lineDash) && s.lineDash.length ? "dashed=1;" : "";
  const labelFontColor =
    (model.labelCfg && model.labelCfg.style && model.labelCfg.style.fill) || "#1e293b";

  // fontStyle 是 bitmask：1=bold, 2=italic, 4=underline
  const lblStyle = (model.labelCfg && model.labelCfg.style) || {};
  const fallbackFontSize =
    model.nodeType === "entity" ? 18 : model.nodeType === "relationship" ? 16 : 15;
  const parsedFontSize = Number(lblStyle.fontSize);
  const fontSize =
    Number.isFinite(parsedFontSize) && parsedFontSize > 0 ? parsedFontSize : fallbackFontSize;
  let fontStyle = 0;
  if (
    lblStyle.fontWeight === "bold" ||
    lblStyle.fontWeight === "700" ||
    lblStyle.fontWeight === 700
  )
    fontStyle |= 1;
  if (lblStyle.fontStyle === "italic") fontStyle |= 2;

  if (model.nodeType === "entity") {
    return `rounded=0;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=${strokeWidth};fontSize=${fontSize};fontStyle=${fontStyle || 1};fontColor=${labelFontColor};${dashed}`;
  }
  if (model.nodeType === "attribute") {
    // 主键：加下划线（bit 4），且通常加粗
    if (model.keyType === "pk") fontStyle |= 4 | 1;
    return `ellipse;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=${strokeWidth};fontSize=${fontSize};fontStyle=${fontStyle};fontColor=${labelFontColor};${dashed}`;
  }
  if (model.nodeType === "relationship") {
    return `rhombus;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=${strokeWidth};fontSize=${fontSize};fontStyle=${fontStyle};fontColor=${labelFontColor};${dashed}`;
  }
  return `rounded=0;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=${strokeWidth};`;
}

function buildEdgeStyle(model: DrawioStyleSource): string {
  const s = model.style || {};
  const stroke = s.stroke || "#000000";
  const strokeWidth = s.lineWidth || 1;
  // endArrow=none：Chen 模型里 entity-attribute、entity-relationship 都是无向线
  const parsedFontSize = Number(model.labelCfg?.style?.fontSize);
  const fontSize = Number.isFinite(parsedFontSize) && parsedFontSize > 0 ? parsedFontSize : 12;
  return `endArrow=none;html=1;rounded=0;edgeStyle=none;strokeColor=${stroke};strokeWidth=${strokeWidth};fontSize=${fontSize};`;
}

// 生成一个 drawio diagram id（短、仅字母数字下划线，drawio 对 id 没有严格校验但保守一些）
function makeDiagramId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `sql2er-${t}-${r}`;
}

/**
 * 基于当前 G6 图（位置/标签/样式）生成 drawio .drawio (mxfile) XML 字符串。
 * 走节点当前 bbox，保证用户在页面上拖动/布局后的位置会原样带进 drawio。
 */
export function buildDrawioXML(graph: GraphLike): string {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  const cells: string[] = [];
  cells.push('<mxCell id="0" />');
  cells.push('<mxCell id="1" parent="0" />');

  // G6 node id 可能包含点/斜杠等字符，drawio 对 mxCell id 虽然比较宽松，但 source/target
  // 里若出现未转义字符容易踩坑；这里统一重编号成 v0, v1, ...
  const idMap = new Map<string, string>();
  let vi = 0;

  nodes.forEach((node) => {
    const model = node.getModel() as DrawioStyleSource & {
      id: string;
      label?: string;
    };
    const bbox = node.getBBox(); // 图坐标系下的包围盒
    const id = `v${vi++}`;
    idMap.set(model.id, id);

    const style = buildVertexStyle(model);
    const label = escapeXml(model.label || "");

    // 位置四舍五入，避免导出 "123.45678901234" 这种噪声
    const x = Math.round(bbox.minX);
    const y = Math.round(bbox.minY);
    const w = Math.round(bbox.width);
    const h = Math.round(bbox.height);

    cells.push(
      `<mxCell id="${id}" value="${label}" style="${style}" vertex="1" parent="1">` +
        `<mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />` +
        `</mxCell>`,
    );
  });

  let ei = 0;
  edges.forEach((edge) => {
    const model = edge.getModel() as DrawioStyleSource & {
      source: string;
      target: string;
      label?: string;
    };
    const source = idMap.get(model.source);
    const target = idMap.get(model.target);
    if (!source || !target) return; // 端点找不到（理论不会发生）时跳过

    const id = `e${ei++}`;
    const style = buildEdgeStyle(model);
    const label = escapeXml(model.label || "");

    cells.push(
      `<mxCell id="${id}" value="${label}" style="${style}" edge="1" parent="1" source="${source}" target="${target}">` +
        `<mxGeometry relative="1" as="geometry" />` +
        `</mxCell>`,
    );
  });

  const diagramId = makeDiagramId();
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<mxfile host="app.diagrams.net" agent="sql2er" version="24.0.0" type="device">` +
    `<diagram id="${diagramId}" name="ER">` +
    `<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="826" math="0" shadow="0">` +
    `<root>${cells.join("")}</root>` +
    `</mxGraphModel>` +
    `</diagram>` +
    `</mxfile>`;

  return xml;
}

function downloadDrawio(xmlString: string, filename: string): void {
  // drawio 默认扩展名为 .drawio，MIME 用 application/xml 最通用
  const blob = new Blob([xmlString], {
    type: "application/xml;charset=utf-8",
  });
  downloadBlob(blob, filename);
}

export function exportDrawio(options: ExportDrawioOptions): void {
  const { graphRef, hasGraph, onError, onDone, patchRelationshipLinkPoints, filenameBase } =
    options;

  const finishErr = (code: ExportErrorCode, detail?: unknown) => {
    if (detail !== undefined) console.error(`[sql2er] ${code}:`, detail);
    if (onError) onError(code);
    if (onDone) onDone(new Error(code), null);
  };
  const finishOk = (download: () => void) => {
    if (onDone) onDone(null, download);
  };

  if (!graphRef.current || !hasGraph) {
    finishErr("export-no-graph");
    return;
  }

  try {
    // 对齐 SVG 导出：先把菱形连线点修正到真实边界，这样导出用的 bbox 与可视一致
    if (patchRelationshipLinkPoints) {
      try {
        patchRelationshipLinkPoints(graphRef.current);
      } catch (_) {
        /* 容错 */
      }
    }
    const xml = buildDrawioXML(graphRef.current);
    const base = filenameBase || defaultExportFilenameBase();
    finishOk(() => downloadDrawio(xml, `${base}.drawio`));
  } catch (err) {
    finishErr("export-drawio-failed", err);
  }
}
