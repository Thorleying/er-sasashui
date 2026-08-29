/**
 * 分享页按表切图。SQL 不展示，每张表一张卡。
 */
import { generateChenModelData } from "../../builder";
import { parseDBML } from "../../parser/dbml";
import { parseSQLTables } from "../../parser/sql";
import type { ChenModelData, SnapshotRecord } from "../../types";
import { filterGraphDataForTable } from "../export/tableExportZip";

export type ShareTableCardModel = {
  name: string;
  index: number;
  data: ChenModelData;
};

export function buildShareTableCards(snapshot: SnapshotRecord): ShareTableCardModel[] {
  const input = String(snapshot.inputText || "").trim();
  if (!input) return [];

  let parsed = parseSQLTables(input);
  if (parsed.tables.length === 0) parsed = parseDBML(input);
  if (parsed.tables.length === 0) return [];

  const { nodes, edges } = generateChenModelData(
    parsed.tables,
    parsed.relationships,
    snapshot.isColored,
    snapshot.showComment ? "comment" : "name",
    snapshot.hideFields,
  );

  const positions = new Map(snapshot.nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    const saved = positions.get(node.id);
    if (!saved) continue;
    if (typeof saved.x === "number") node.x = saved.x;
    if (typeof saved.y === "number") node.y = saved.y;
    if (saved.label != null) node.label = saved.label;
  }

  return parsed.tables
    .map((table, index) => {
      const sliced = filterGraphDataForTable({ nodes, edges }, table.name, index);
      return {
        name: table.name,
        index,
        data: {
          nodes: (sliced.nodes ?? []) as ChenModelData["nodes"],
          edges: (sliced.edges ?? []) as ChenModelData["edges"],
        },
      };
    })
    .filter((card) => card.data.nodes.length > 0);
}
