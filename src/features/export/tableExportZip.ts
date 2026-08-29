/**
 * 多表 ZIP 导出：按表切分图数据、文件名消毒、组装 zip 条目。
 */
import { strToU8, zipSync } from "fflate";

/** 参与 ZIP 导出的表引用（name + 建图时的 tableIndex）。 */
export type TableExportRef = {
  name: string;
  index: number;
};

type SavedGraphNode = {
  id?: string;
  parentEntity?: string;
  [key: string]: unknown;
};

export type SavedGraphData = {
  nodes?: SavedGraphNode[];
  edges?: Array<{ source?: string; target?: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

/** 单表导出产物（三种格式）。 */
export type TableExportArtifacts = {
  svg: string;
  png: Uint8Array;
  drawio: string;
};

/** 将表名转为安全文件名（保留中文，替换路径非法字符）。 */
export function sanitizeTableExportBasename(name: string): string {
  const trimmed = String(name || "table").trim() || "table";
  return trimmed.replace(/[\\/:*?"<>|]/g, "_").slice(0, 120);
}

/**
 * 从完整 Chen 图数据中切出单表子图：实体 + 该表属性 + 连线。
 * tableIndex 与 builder 中 entity id 后缀一致。
 */
export function filterGraphDataForTable(
  data: SavedGraphData,
  tableName: string,
  tableIndex: number,
): SavedGraphData {
  const entityId = `entity-${tableName}-${tableIndex}`;
  const nodeIds = new Set<string>();

  for (const node of data.nodes ?? []) {
    const id = node.id;
    if (!id) continue;
    if (id === entityId) {
      nodeIds.add(id);
      continue;
    }
    if (id.startsWith(`attr-${tableName}-`) || node.parentEntity === entityId) {
      nodeIds.add(id);
    }
  }

  const edges = (data.edges ?? []).filter(
    (edge) => nodeIds.has(String(edge.source)) && nodeIds.has(String(edge.target)),
  );

  return {
    ...data,
    nodes: (data.nodes ?? []).filter((node) => node.id && nodeIds.has(node.id)),
    edges,
  };
}

/** 按格式分目录组装 zip：png/ svg/ drawio/ 下各放对应表文件。重名表自动加序号后缀。 */
export function composeTableZipEntries(
  artifacts: Array<{ basename: string; files: TableExportArtifacts }>,
): Record<string, Uint8Array> {
  const used = new Map<string, number>();
  const entries: Record<string, Uint8Array> = {};

  for (const { basename, files } of artifacts) {
    const count = used.get(basename) ?? 0;
    used.set(basename, count + 1);
    const stem = count === 0 ? basename : `${basename}-${count + 1}`;

    entries[`png/${stem}.png`] = files.png;
    entries[`svg/${stem}.svg`] = strToU8(files.svg);
    entries[`drawio/${stem}.drawio`] = strToU8(files.drawio);
  }

  return entries;
}

/** 将条目打包为 zip 二进制。 */
export function packZipEntries(entries: Record<string, Uint8Array>): Uint8Array {
  return zipSync(entries, { level: 6 });
}
