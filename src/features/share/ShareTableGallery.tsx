/**
 * 只读分享画廊：每张表一张卡，点击打开可拖、可缩放的预览。
 */
import { useEffect, useRef, useState } from "react";
import { Card, Modal, Space, Typography } from "antd";
import G6 from "@antv/g6";
import { registerCustomNodes } from "../../builder";
import { createERGraph } from "../../graph/createERGraph";
import { updateGraphStyles } from "../../graph/updateGraphStyles";
import type { ChenModelData, GraphLike, SnapshotRecord } from "../../types";
import { I18N } from "../../i18n";
import { buildShareTableCards, type ShareTableCardModel } from "./shareTableCards";
import "./share-gallery.css";

registerCustomNodes(G6);

const t = I18N.zh;

function ShareTableCanvas({
  data,
  isColored,
  panZoom = false,
}: {
  data: ChenModelData;
  isColored: boolean;
  panZoom?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || data.nodes.length === 0) return;

    const graph = createERGraph({
      container: host,
      data,
      interactive: false,
      panZoom,
      modes: panZoom ? undefined : [],
    }) as GraphLike & { data: (next: ChenModelData) => void; render: () => void };
    graph.data(data);
    graph.render();
    updateGraphStyles(graph, isColored, 1);
    window.setTimeout(() => graph.fitView?.(24), 40);

    const resize = () => {
      if (graph.destroyed) return;
      graph.changeSize?.(host.clientWidth, host.clientHeight);
      graph.fitView?.(24);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    return () => {
      observer.disconnect();
      graph.destroy?.();
    };
  }, [data, isColored, panZoom]);

  return (
    <div
      ref={hostRef}
      className={panZoom ? "share-table-canvas share-table-canvas--preview" : "share-table-canvas"}
    />
  );
}

function ShareLegend({ isColored }: { isColored: boolean }) {
  const swatch = (shape: "rect" | "diamond" | "circle", fill: string, stroke: string) => (
    <span
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        display: "inline-block",
        borderRadius: shape === "circle" ? "50%" : 2,
        transform: shape === "diamond" ? "rotate(45deg)" : undefined,
        background: fill,
        border: `2px solid ${stroke}`,
      }}
    />
  );

  return (
    <div className="share-gallery-legend">
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

export function ShareTableGallery({ snapshot }: { snapshot: SnapshotRecord }) {
  const cards = buildShareTableCards(snapshot);
  const [preview, setPreview] = useState<ShareTableCardModel | null>(null);

  return (
    <div className="share-gallery">
      <header className="share-gallery-head">
        <div>
          <Typography.Title level={3}>{t.shareGalleryTitle}</Typography.Title>
          <Typography.Paragraph type="secondary" className="share-gallery-lead">
            {t.shareGalleryLead}
          </Typography.Paragraph>
        </div>
        <ShareLegend isColored={snapshot.isColored} />
      </header>
      <div className="share-gallery-grid">
        {cards.map((card) => (
          <Card
            key={`${card.name}-${card.index}`}
            className="share-table-card"
            hoverable
            title={card.name}
            extra={<span className="share-table-card-extra">{t.shareCardPreview}</span>}
            onClick={() => setPreview(card)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setPreview(card);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`${t.shareCardPreview} ${card.name}`}
          >
            <ShareTableCanvas data={card.data} isColored={snapshot.isColored} />
          </Card>
        ))}
      </div>
      <Modal
        className="share-preview-modal"
        title={preview?.name}
        open={Boolean(preview)}
        onCancel={() => setPreview(null)}
        footer={<Typography.Text type="secondary">{t.sharePreviewHint}</Typography.Text>}
        width="min(960px, calc(100vw - 32px))"
        destroyOnHidden
        centered
      >
        {preview ? (
          <ShareTableCanvas data={preview.data} isColored={snapshot.isColored} panZoom />
        ) : null}
      </Modal>
    </div>
  );
}
