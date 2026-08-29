/**
 * 生成器工作台界面。只负责展示和把交互回传给 App，不碰解析。
 */
import {
  ColumnHeightOutlined,
  DisconnectOutlined,
  DownloadOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FormOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  HistoryOutlined,
  LinkOutlined,
  NodeIndexOutlined,
  PlayCircleOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Dropdown,
  Slider,
  Space,
  Spin,
  Switch,
  Tooltip,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import type { ReactNode, Ref } from "react";
import { useState } from "react";
import { CodeEditor } from "../../codeEditor";
import { usePreviewFullscreen } from "../../hooks/usePreviewFullscreen";
import type { ExportFormat } from "../../hooks/useExportButton";
import type { I18N } from "../../i18n";
import type { ParserWarning, SnapshotRecord } from "../../types";
import type { CommentDraftTable } from "./applyCommentEdits";
import { CommentEditor } from "./CommentEditor";
import { HistoryDrawer } from "./HistoryDrawer";
import "./editor.css";

type Translation = (typeof I18N)[keyof typeof I18N];

export type EditorWorkspaceProps = {
  t: Translation;
  readOnly?: boolean;
  inputText: string;
  setInputText: (next: string) => void;
  showComment: boolean;
  setShowComment: (next: boolean) => void;
  loading: boolean;
  hasGraph: boolean;
  /** 当前图实体表数量；>=2 时显示 ZIP 导出。 */
  tableCount: number;
  exporting: boolean;
  onGenerate: () => void;
  onApplyComments?: (draft: CommentDraftTable[]) => void;
  onExport: (fmt: ExportFormat) => void;
  onShare?: () => void;
  onSmartLayout?: () => void;
  onQuickLayout?: () => void;
  showBackground: boolean;
  onToggleBackground: () => void;
  isColored: boolean;
  setIsColored: (next: boolean) => void;
  hideFields: boolean;
  setHideFields: (next: boolean) => void;
  showRelations: boolean;
  setShowRelations: (next: boolean) => void;
  forceOn: boolean;
  setForceOn: (next: boolean) => void;
  autoAvoid: boolean;
  setAutoAvoid: (next: boolean) => void;
  fontScale: number;
  setFontScale: (next: number) => void;
  fontMin: number;
  fontMax: number;
  parserWarnings: ParserWarning[];
  onDismissWarnings: () => void;
  containerRef: Ref<HTMLDivElement>;
  previewHeaderRef: Ref<HTMLDivElement>;
  previewTitleRef: Ref<HTMLHeadingElement>;
  previewActionsRef: Ref<HTMLDivElement>;
  legendMeasureRef: Ref<HTMLDivElement>;
  legendPlacement: "preview" | "top";
  historyOpen: boolean;
  historyItems: SnapshotRecord[];
  onOpenHistory?: () => void;
  onCloseHistory: () => void;
  onRestoreHistory: (snap: SnapshotRecord) => void;
  onDeleteHistory: (id: string) => void;
  formatTimestamp: (ts: number | undefined) => string;
};

function Legend({
  t,
  isColored,
  className,
  legendRef,
  hidden,
}: {
  t: Translation;
  isColored: boolean;
  className: string;
  legendRef?: Ref<HTMLDivElement>;
  hidden?: boolean;
}) {
  const swatch = (
    shape: "rect" | "diamond" | "circle",
    color: string,
    border: string,
  ): ReactNode => (
    <span
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        display: "inline-block",
        borderRadius: shape === "circle" ? "50%" : 2,
        transform: shape === "diamond" ? "rotate(45deg)" : undefined,
        background: color,
        border: `2px solid ${border}`,
      }}
    />
  );
  return (
    <div ref={legendRef} className={className} aria-hidden={hidden || undefined}>
      <Space size={8}>
        {swatch("rect", isColored ? "#e0f2fe" : "#fff", isColored ? "#0ea5e9" : "#1e293b")}
        <Typography.Text>{t.legendEntity}</Typography.Text>
      </Space>
      <Space size={8}>
        {swatch("diamond", isColored ? "#f5f3ff" : "#fff", isColored ? "#8b5cf6" : "#1e293b")}
        <Typography.Text>{t.legendRelation}</Typography.Text>
      </Space>
      <Space size={8}>
        {swatch("circle", "#fff", isColored ? "#94a3b8" : "#1e293b")}
        <Typography.Text>{t.legendAttribute}</Typography.Text>
      </Space>
      <Space size={8}>
        {swatch("circle", isColored ? "#ecfdf5" : "#fff", isColored ? "#10b981" : "#1e293b")}
        <Typography.Text strong>{t.legendPk}</Typography.Text>
      </Space>
    </div>
  );
}

export function EditorWorkspace(props: EditorWorkspaceProps) {
  const { targetRef: previewBodyRef, isFullscreen, toggleFullscreen } = usePreviewFullscreen();
  const [commentOpen, setCommentOpen] = useState(false);

  const exportItems: MenuProps["items"] = [
    { key: "PNG", label: "PNG" },
    { key: "XML", label: "Drawio" },
    { key: "SVG", label: "SVG" },
    ...(props.tableCount >= 2 ? [{ key: "ZIP", label: "ZIP（png/svg/drawio 分目录）" }] : []),
  ];

  return (
    <div className={`editor-workspace${props.readOnly ? " editor-workspace--readonly" : ""}`}>
      <Legend
        t={props.t}
        isColored={props.isColored}
        className="editor-legend editor-legend--measure"
        legendRef={props.legendMeasureRef}
        hidden
      />
      {props.legendPlacement === "top" ? (
        <Legend t={props.t} isColored={props.isColored} className="editor-legend" />
      ) : null}

      <Card
        className="editor-card editor-card--preview"
        title={
          <div ref={props.previewHeaderRef} className="editor-preview-header">
            <h2
              ref={props.previewTitleRef}
              className="ant-typography"
              style={{ margin: 0, fontSize: 16 }}
            >
              {props.t.cardPreviewTitle}
            </h2>
            {props.legendPlacement === "preview" ? (
              <Legend t={props.t} isColored={props.isColored} className="editor-legend" />
            ) : null}
            <div ref={props.previewActionsRef} className="editor-preview-header-actions">
              {!props.readOnly ? (
                <Space>
                  <Button
                    size="small"
                    disabled={!props.hasGraph || props.loading}
                    onClick={props.onSmartLayout}
                  >
                    {props.t.btnSmartLayout}
                  </Button>
                  <Button
                    size="small"
                    disabled={!props.hasGraph || props.loading}
                    onClick={props.onQuickLayout}
                  >
                    {props.t.btnQuickLayout}
                  </Button>
                </Space>
              ) : null}
            </div>
            <p className="editor-preview-hint" dangerouslySetInnerHTML={{ __html: props.t.hint }} />
          </div>
        }
      >
        <div
          ref={previewBodyRef}
          className={`editor-preview-body${isFullscreen ? " editor-preview-body--immersive" : ""}`}
        >
          <div className={`diagram-container${props.showBackground ? "" : " no-grid"}`}>
            <div className="editor-preview-tools">
              <Tooltip title={isFullscreen ? props.t.tipExitFullscreen : props.t.tipFullscreen}>
                <Button
                  type={isFullscreen ? "primary" : "default"}
                  icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                  aria-pressed={isFullscreen}
                  disabled={!props.hasGraph || props.loading}
                  onClick={() => void toggleFullscreen()}
                />
              </Tooltip>
              <Tooltip title={props.showBackground ? props.t.tipHideBg : props.t.tipShowBg}>
                <Button
                  icon={props.showBackground ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                  aria-pressed={!props.showBackground}
                  onClick={props.onToggleBackground}
                />
              </Tooltip>
              <Tooltip title={props.hideFields ? props.t.tipShowAttrs : props.t.tipHideAttrs}>
                <Button
                  type={props.hideFields ? "primary" : "default"}
                  icon={<UnorderedListOutlined />}
                  aria-pressed={props.hideFields}
                  onClick={() => props.setHideFields(!props.hideFields)}
                />
              </Tooltip>
              <Tooltip
                title={props.showRelations ? props.t.tipHideRelations : props.t.tipShowRelations}
              >
                <Button
                  type={props.showRelations ? "default" : "primary"}
                  icon={props.showRelations ? <LinkOutlined /> : <DisconnectOutlined />}
                  aria-pressed={!props.showRelations}
                  aria-label={
                    props.showRelations ? props.t.tipHideRelations : props.t.tipShowRelations
                  }
                  onClick={() => props.setShowRelations(!props.showRelations)}
                />
              </Tooltip>
              {props.onOpenHistory ? (
                <Tooltip title={props.t.tipHistory}>
                  <Button icon={<HistoryOutlined />} onClick={props.onOpenHistory} />
                </Tooltip>
              ) : null}
              {!props.readOnly ? (
                <>
                  <Tooltip title={props.forceOn ? props.t.tipForceOff : props.t.tipForceOn}>
                    <Button
                      type={props.forceOn ? "primary" : "default"}
                      icon={<NodeIndexOutlined />}
                      aria-pressed={props.forceOn}
                      onClick={() => props.setForceOn(!props.forceOn)}
                    />
                  </Tooltip>
                  <Tooltip
                    title={props.autoAvoid ? props.t.tipAutoAvoidOff : props.t.tipAutoAvoidOn}
                  >
                    <Button
                      type={props.autoAvoid ? "primary" : "default"}
                      icon={<ColumnHeightOutlined />}
                      aria-pressed={props.autoAvoid}
                      onClick={() => props.setAutoAvoid(!props.autoAvoid)}
                    />
                  </Tooltip>
                </>
              ) : null}
              <div className="editor-font-slider">
                <Slider
                  vertical
                  min={props.fontMin}
                  max={props.fontMax}
                  step={0.03}
                  value={props.fontScale}
                  onChange={props.setFontScale}
                  aria-label={props.t.tipFontSize}
                />
              </div>
            </div>
            {props.loading ? (
              <div className="loading-overlay">
                <Spin />
              </div>
            ) : null}
            {props.parserWarnings.length > 0 ? (
              <Alert
                type="warning"
                showIcon
                closable
                onClose={props.onDismissWarnings}
                message={props.t.warnTitle}
                description={
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {props.parserWarnings.slice(0, 4).map((warning, index) => (
                      <li key={`${warning.code}-${warning.line ?? "x"}-${index}`}>
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                }
                style={{ position: "absolute", top: 16, left: 16, right: 72, zIndex: 21 }}
              />
            ) : null}
            <div
              ref={props.containerRef}
              style={{ width: "100%", height: "100%", position: "relative" }}
            />
          </div>
        </div>
      </Card>

      {props.readOnly ? null : (
        <Card
          className="editor-card"
          title={
            <Space>
              <UnorderedListOutlined />
              <span>{props.t.cardInputTitle}</span>
            </Space>
          }
          extra={
            props.readOnly ? null : (
              <Space>
                <Typography.Text>{props.t.showComment}</Typography.Text>
                <Switch checked={props.showComment} onChange={props.setShowComment} />
                <Button
                  size="small"
                  icon={<FormOutlined />}
                  disabled={!props.hasGraph}
                  onClick={() => setCommentOpen(true)}
                >
                  {props.t.commentEditorOpen}
                </Button>
              </Space>
            )
          }
        >
          <div className="editor-input-stack">
            <CodeEditor
              value={props.inputText}
              onChange={props.setInputText}
              placeholder={props.t.editorPlaceholder}
              readOnly={props.readOnly}
            />
            <Space className="editor-input-actions" wrap>
              {!props.readOnly ? (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  loading={props.loading}
                  onClick={props.onGenerate}
                >
                  {props.t.btnGenerate}
                </Button>
              ) : null}
              <Dropdown
                disabled={!props.hasGraph}
                menu={{
                  items: exportItems,
                  onClick: ({ key }) => props.onExport(key as ExportFormat),
                }}
              >
                <Button
                  icon={<DownloadOutlined />}
                  loading={props.exporting}
                  disabled={!props.hasGraph}
                >
                  {props.t.btnExportLabel}
                </Button>
              </Dropdown>
              {props.onShare ? (
                <Button icon={<LinkOutlined />} disabled={!props.hasGraph} onClick={props.onShare}>
                  {props.t.btnShare}
                </Button>
              ) : null}
            </Space>
          </div>
        </Card>
      )}

      {props.onApplyComments ? (
        <CommentEditor
          open={commentOpen}
          inputText={props.inputText}
          t={props.t}
          onClose={() => setCommentOpen(false)}
          onApply={(draft) => {
            props.onApplyComments?.(draft);
            setCommentOpen(false);
          }}
        />
      ) : null}

      <HistoryDrawer
        open={props.historyOpen}
        items={props.historyItems}
        t={props.t}
        onClose={props.onCloseHistory}
        onRestore={props.onRestoreHistory}
        onDelete={props.onDeleteHistory}
        formatTimestamp={props.formatTimestamp}
      />
    </div>
  );
}
