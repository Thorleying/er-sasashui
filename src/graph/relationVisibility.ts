/**
 * 预览里显隐 Chen 关系（菱形 + 两边连线）。默认显示。
 */
import type { GraphLike } from "../types";

function isRelationEdge(edgeType: string | undefined) {
  return edgeType === "entity-relationship" || edgeType === "relationship-entity";
}

/** show=false 时藏关系节点和连线，实体和属性不动。 */
export function applyRelationVisibility(graph: GraphLike | null | undefined, show: boolean) {
  if (!graph || graph.destroyed) return;
  const hide = !show;
  graph.setAutoPaint(false);
  graph.getNodes().forEach((node) => {
    if (node.getModel().nodeType !== "relationship") return;
    if (hide) graph.hideItem?.(node);
    else graph.showItem?.(node);
  });
  graph.getEdges().forEach((edge) => {
    if (!isRelationEdge(edge.getModel().edgeType)) return;
    if (hide) graph.hideItem?.(edge);
    else graph.showItem?.(edge);
  });
  graph.paint();
  graph.setAutoPaint(true);
}
