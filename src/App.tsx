import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import G6 from "@antv/g6";
import { showError } from "./app/feedback";
import { I18N, isInitialSampleInput } from "./i18n";
import type { Language } from "./i18n";
import { patchRelationshipLinkPoints, registerCustomNodes } from "./builder";
import * as Exporter from "./exporter";
import * as Snapshots from "./snapshots";
import type { SnapshotRecord } from "./types";
import { EditorWorkspace } from "./features/editor/EditorWorkspace";
import { createShareRequest } from "./features/share/api";
import { buildShareUrl } from "./features/share/buildShareUrl";
import { ShareLinkModal } from "./features/share/ShareLinkModal";
import { useGraph } from "./hooks/useGraph";
import type { ExportFormat, ExportDoneCallback } from "./hooks/useExportButton";
import { useUndoRedoShortcuts } from "./hooks/useUndoRedoShortcuts";
import { useWheelZoomRotate } from "./hooks/useWheelZoomRotate";
import { canPlaceLegendInPreviewHeader } from "./legendPlacement";

registerCustomNodes(G6);

const FONT_SCALE_MIN = 0.4;
const FONT_SCALE_MAX = 1.6;
const PREVIEW_HEADER_GAP = 16;

export type AppProps = {
  onGenerated?: () => void;
  onExported?: (format: string) => void;
  /** 生成/导出前的登录校验。返回 false 则中止，不跑解析。 */
  beforeOperate?: () => Promise<boolean>;
  /** 只读分享页：禁止编辑，允许导出。 */
  readOnly?: boolean;
  /** 分享页注入的初始快照。 */
  initialSnapshot?: SnapshotRecord;
};

const App = ({
  onGenerated,
  onExported,
  beforeOperate,
  readOnly = false,
  initialSnapshot,
}: AppProps = {}) => {
  const lang: Language = "zh";
  const t = I18N.zh;
  const [showBackground, setShowBackground] = useState(true);
  const [legendPlacement, setLegendPlacement] = useState<"preview" | "top">("preview");
  const previewHeaderRef = useRef<HTMLDivElement | null>(null);
  const previewTitleRef = useRef<HTMLHeadingElement | null>(null);
  const previewActionsRef = useRef<HTMLDivElement | null>(null);
  const legendMeasureRef = useRef<HTMLDivElement | null>(null);
  // 历史面板常驻为 opacity: 0 的关闭态，确保首次打开也能触发 CSS 渐显。
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<SnapshotRecord[]>([]);
  const historyRefreshTimerRef = useRef<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareLoading, setShareLoading] = useState(false);

  const {
    containerRef,
    graphRef,
    historyRef,
    lastInputRef,
    inputText,
    isColored,
    showComment,
    hideFields,
    fontScale,
    forceOn,
    autoAvoid,
    hasGraph,
    tableList,
    error,
    parserWarnings,
    loading,
    setError,
    setInputText,
    setIsColored,
    setShowComment,
    setHideFields,
    setFontScale,
    setForceOn,
    setAutoAvoid,
    handleGenerate,
    dismissParserWarnings,
    handleQuickLayout,
    handleArrangeLayout,
    restoreFromSnapshot,
    persistCurrentSnapshot,
    settleAfterRotation,
  } = useGraph({ t, initialLang: lang, onGenerated, readOnly, initialSnapshot });

  // 导出 SVG/PNG/Drawio - 使用 Exporter 模块。
  // exporter 只上报错误码，这里映射为当前语言的文案。
  const exportErrorText: Record<Exporter.ExportErrorCode, string> = {
    "export-no-graph": t.errExportNoGraph,
    "export-svg-failed": t.errExportSvg,
    "export-png-failed": t.errExportPng,
    "export-drawio-failed": t.errExportDrawio,
    "export-zip-failed": t.errExportZip,
    "export-zip-needs-tables": t.errExportZipNeedsTables,
  };
  const onExportError = (code: Exporter.ExportErrorCode) =>
    showError(exportErrorText[code] ?? code);

  const handleExportSVG = (onDone: ExportDoneCallback) => {
    if (!hasGraph || !graphRef.current) {
      onDone(new Error("no-graph"));
      return;
    }
    Exporter.exportSVG({
      graphRef,
      hasGraph,
      containerRef,
      onError: onExportError,
      onDone,
      patchRelationshipLinkPoints,
      G6,
    });
  };

  const handleExportPNG = (onDone: ExportDoneCallback) => {
    if (!hasGraph || !graphRef.current) {
      onDone(new Error("no-graph"));
      return;
    }
    Exporter.exportPNG({
      graphRef,
      hasGraph,
      containerRef,
      onError: onExportError,
      onDone,
      patchRelationshipLinkPoints,
      G6,
    });
  };

  const handleExportDrawio = (onDone: ExportDoneCallback) => {
    if (!hasGraph || !graphRef.current) {
      onDone(new Error("no-graph"));
      return;
    }
    Exporter.exportDrawio({
      graphRef,
      hasGraph,
      onError: onExportError,
      onDone,
      patchRelationshipLinkPoints,
    });
  };

  const handleExportZIP = (onDone: ExportDoneCallback) => {
    if (!hasGraph || !graphRef.current) {
      onDone(new Error("no-graph"));
      return;
    }
    Exporter.exportZIP({
      graphRef,
      hasGraph,
      containerRef,
      onError: onExportError,
      onDone,
      patchRelationshipLinkPoints,
      G6,
      tables: tableList,
    });
  };

  const runExport = (fmt: ExportFormat, onDone: ExportDoneCallback) => {
    const wrapped: ExportDoneCallback = (err, download) => {
      if (!err) onExported?.(fmt);
      onDone(err, download);
    };
    if (fmt === "PNG") handleExportPNG(wrapped);
    else if (fmt === "XML") handleExportDrawio(wrapped);
    else if (fmt === "ZIP") handleExportZIP(wrapped);
    else handleExportSVG(wrapped);
  };

  const [exporting, setExporting] = useState(false);

  /** 先过登录门闩再执行。只读分享页允许直接导出。 */
  const guardedOperate = (run: () => void) => {
    if (readOnly) {
      run();
      return;
    }
    if (!beforeOperate) {
      run();
      return;
    }
    void beforeOperate().then((ok) => {
      if (ok) run();
    });
  };

  const handleShare = () => {
    if (readOnly || !hasGraph || !graphRef.current) return;
    const nodes = Snapshots.captureGraphSnapshot(graphRef.current);
    if (!nodes?.length) {
      showError(t.errShareNoGraph);
      return;
    }
    setShareOpen(true);
    setShareUrl("");
    setShareLoading(true);
    void createShareRequest({
      payload: {
        inputText,
        isColored,
        showComment,
        hideFields,
        nodes,
      },
    }).then((res) => {
      setShareLoading(false);
      if (res.code !== 0 || !res.data) {
        showError(res.message || t.errShareFailed);
        return;
      }
      setShareUrl(buildShareUrl(res.data.urlPath));
    });
  };

  const handlePickExport = (fmt: ExportFormat) => {
    setExporting(true);
    runExport(fmt, (err, download) => {
      setExporting(false);
      if (err) return;
      try {
        download?.();
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: unknown }).message)
            : String(e);
        showError(msg);
      }
    });
  };

  useEffect(() => {
    if (!error) return;
    showError(error);
    setError("");
  }, [error, setError]);

  useUndoRedoShortcuts({
    graphRef,
    historyRef,
    disabled: readOnly,
    // 撤销/重做前先停掉持续力导向，避免力循环与补间动画互写坐标
    onBeforeChange: () => {
      if (forceOn) setForceOn(false);
    },
    onAfterChange: () => {
      void persistCurrentSnapshot();
    },
  });
  useWheelZoomRotate({
    containerRef,
    graphRef,
    historyRef,
    onAfterChange: settleAfterRotation,
  });

  // 切换背景显示
  const handleToggleBackground = () => {
    setShowBackground(!showBackground);
  };

  // ─── 生成历史 ───────────────────────────────────────────
  // 打开历史面板：
  //  1) 立刻用 IndexedDB 里的现有数据把面板撑起来（点击不卡）；
  //  2) 在后台为当前画面拍一张矢量快照、写库；写完再静默刷新一次列表。
  // 这样用户拖动后点开面板，先看到上次的状态，约 1s 后卡片自动换成
  // 包含最新位置的缩略图 —— 不用关掉再开。
  const sortByUpdated = (xs: SnapshotRecord[]) =>
    xs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const openHistory = async () => {
    try {
      const items = await Snapshots.getAll();
      setHistoryItems(sortByUpdated(items.filter((item) => !isInitialSampleInput(item.inputText))));
    } catch (e) {
      console.warn("snapshots getAll failed", e);
      setHistoryItems([]);
    }
    setHistoryOpen(true);

    // 1440px WebP 的 SVG 光栅化和编码可能占用一帧以上。等 400ms 渐显结束后
    // 再刷新当前快照，避免首次打开时与 opacity / backdrop-filter 合成抢主线程。
    if (graphRef.current && lastInputRef.current) {
      if (historyRefreshTimerRef.current !== null) {
        window.clearTimeout(historyRefreshTimerRef.current);
      }
      const reduceMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      historyRefreshTimerRef.current = window.setTimeout(
        async () => {
          historyRefreshTimerRef.current = null;
          const input = lastInputRef.current;
          if (!graphRef.current || !input) return;
          const id = Snapshots.hashInput(input);
          await persistCurrentSnapshot();
          // 只取刚更新的这一条做局部替换，不再全量重读（getAll 会把所有
          // 缩略图一起读进内存，开一次面板读两遍很浪费）。
          try {
            const fresh = await Snapshots.get(id);
            if (!fresh || isInitialSampleInput(fresh.inputText)) return;
            setHistoryItems((prev) =>
              sortByUpdated([fresh, ...prev.filter((x) => x.id !== fresh.id)]),
            );
          } catch (_) {}
        },
        reduceMotion ? 0 : 420,
      );
    }
  };

  const closeHistory = () => setHistoryOpen(false);

  const handleRestore = (snap: SnapshotRecord) => {
    restoreFromSnapshot(snap);
    setHistoryOpen(false);
  };

  const deleteSnapshot = async (id: string) => {
    try {
      await Snapshots.deleteById(id);
      setHistoryItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.warn("snapshot delete failed", e);
    }
  };

  // 关闭历史面板的快捷键：Esc
  useEffect(() => {
    if (!historyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeHistory();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen]);

  useEffect(
    () => () => {
      if (historyRefreshTimerRef.current !== null) {
        window.clearTimeout(historyRefreshTimerRef.current);
      }
    },
    [],
  );

  // 历史面板开着时给 body 加标记，CSS 据此把右上角的语言胶囊隐去
  // —— 它的 z-index 比覆盖层高，否则会浮在卡片轨道之上。
  useEffect(() => {
    if (historyOpen) {
      document.body.classList.add("history-open");
    } else {
      document.body.classList.remove("history-open");
    }
    return () => document.body.classList.remove("history-open");
  }, [historyOpen]);

  useLayoutEffect(() => {
    const updateLegendPlacement = () => {
      const header = previewHeaderRef.current;
      const title = previewTitleRef.current;
      const actions = previewActionsRef.current;
      const legend = legendMeasureRef.current;
      if (!header || !title || !actions || !legend) return;

      const headerStyle = window.getComputedStyle(header);
      const horizontalPadding =
        parseFloat(headerStyle.paddingLeft || "0") + parseFloat(headerStyle.paddingRight || "0");
      const gap = parseFloat(headerStyle.columnGap || headerStyle.gap || "") || PREVIEW_HEADER_GAP;
      const nextPlacement = canPlaceLegendInPreviewHeader({
        headerWidth: header.getBoundingClientRect().width,
        horizontalPadding,
        titleWidth: title.getBoundingClientRect().width,
        legendWidth: legend.getBoundingClientRect().width,
        actionsWidth: actions.getBoundingClientRect().width,
        gap,
      })
        ? "preview"
        : "top";

      setLegendPlacement((current) => (current === nextPlacement ? current : nextPlacement));
    };

    updateLegendPlacement();
    const frame = window.requestAnimationFrame(updateLegendPlacement);
    const resizeObserver = new ResizeObserver(updateLegendPlacement);
    [
      previewHeaderRef.current,
      previewTitleRef.current,
      previewActionsRef.current,
      legendMeasureRef.current,
    ]
      .filter(Boolean)
      .forEach((el) => resizeObserver.observe(el as Element));

    void document.fonts?.ready.then(updateLegendPlacement);
    window.addEventListener("resize", updateLegendPlacement);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateLegendPlacement);
    };
  }, [lang]);

  useEffect(() => {
    document.body.classList.toggle("legend-top-visible", legendPlacement === "top");
    return () => document.body.classList.remove("legend-top-visible");
  }, [legendPlacement]);

  // 时间戳格式化（按当前语言显示本地化的"几秒前 / 时间戳"）
  const formatTimestamp = (ts: number | undefined) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      const diff = Date.now() - ts;
      const min = Math.floor(diff / 60000);
      if (min < 1) return t.timeJustNow;
      if (min < 60) return t.timeMinAgo.replace("{n}", String(min));
      const hr = Math.floor(min / 60);
      if (hr < 24) return t.timeHrAgo.replace("{n}", String(hr));
      return d.toLocaleString("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return "";
    }
  };

  // HistoryDrawer 用稳定回调，避免字号滑块拖动时整块历史列表跟着重渲。
  const historyCbRef = useRef({
    close: closeHistory,
    restore: handleRestore,
    remove: deleteSnapshot,
    format: formatTimestamp,
  });
  historyCbRef.current = {
    close: closeHistory,
    restore: handleRestore,
    remove: deleteSnapshot,
    format: formatTimestamp,
  };
  const onHistoryClose = useCallback(() => historyCbRef.current.close(), []);
  const onHistoryRestore = useCallback(
    (snap: SnapshotRecord) => historyCbRef.current.restore(snap),
    [],
  );
  const onHistoryDelete = useCallback((id: string) => historyCbRef.current.remove(id), []);
  const onHistoryFormatTimestamp = useCallback(
    (ts: number | undefined) => historyCbRef.current.format(ts),
    [],
  );

  return (
    <>
      <EditorWorkspace
        t={t}
        readOnly={readOnly}
        inputText={inputText}
      setInputText={setInputText}
      showComment={showComment}
      setShowComment={setShowComment}
      loading={loading}
      hasGraph={hasGraph}
      tableCount={tableList.length}
      exporting={exporting}
      onGenerate={() => guardedOperate(() => handleGenerate())}
      onExport={(fmt) => guardedOperate(() => handlePickExport(fmt))}
      onShare={readOnly ? undefined : handleShare}
      onSmartLayout={readOnly ? undefined : handleArrangeLayout}
      onQuickLayout={readOnly ? undefined : handleQuickLayout}
      showBackground={showBackground}
      onToggleBackground={handleToggleBackground}
      isColored={isColored}
      setIsColored={setIsColored}
      hideFields={hideFields}
      setHideFields={setHideFields}
      forceOn={forceOn}
      setForceOn={setForceOn}
      autoAvoid={autoAvoid}
      setAutoAvoid={setAutoAvoid}
      fontScale={fontScale}
      setFontScale={setFontScale}
      fontMin={FONT_SCALE_MIN}
      fontMax={FONT_SCALE_MAX}
      parserWarnings={parserWarnings}
      onDismissWarnings={dismissParserWarnings}
      containerRef={containerRef}
      previewHeaderRef={previewHeaderRef}
      previewTitleRef={previewTitleRef}
      previewActionsRef={previewActionsRef}
      legendMeasureRef={legendMeasureRef}
      legendPlacement={legendPlacement}
      historyOpen={historyOpen}
      historyItems={historyItems}
      onOpenHistory={readOnly ? undefined : () => void openHistory()}
      onCloseHistory={onHistoryClose}
      onRestoreHistory={onHistoryRestore}
      onDeleteHistory={(id) => void onHistoryDelete(id)}
      formatTimestamp={onHistoryFormatTimestamp}
      />
      {!readOnly ? (
        <ShareLinkModal
          open={shareOpen}
          loading={shareLoading}
          url={shareUrl}
          title={t.shareModalTitle}
          hint={t.shareModalHint}
          expiresHint={t.shareExpiresHint}
          copyLabel={t.shareCopy}
          copiedLabel={t.shareCopied}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </>
  );
};

export default App;
