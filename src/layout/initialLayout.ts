/**
 * Initial Layout Module
 * Contains functions for initial component positioning:
 * - Position disconnected components around the center before first render
 */

import { measureNodeSize } from "../builder";
import { computeLayoutSizeScale } from "../graph/sizeAwareGeometry";
import { deterministicHash, deterministicRandom } from "./utils";
import type { EREdgeModel, ERNodeModel } from "../types";

/**
 * 初始定位：让互不相连的组件一开始就围绕中心分布
 * @param nodes - 节点数据数组
 * @param edges - 边数据数组
 * @param containerEl - 容器元素
 * @param seed - 随机种子
 */
export const applyInitialComponentPositions = (
  nodes: ERNodeModel[],
  edges: EREdgeModel[],
  containerEl: HTMLElement | null | undefined,
  seed = 0,
): void => {
  if (!containerEl || !nodes.length) return;
  if (nodes.length < 2) return;

  const width = containerEl.offsetWidth || 1200;
  const height = containerEl.offsetHeight || 800;
  const center = { x: width / 2, y: height / 2 };

  const sizeScale = computeLayoutSizeScale(nodes);

  const approxRadius = (node: ERNodeModel): number => {
    const size = measureNodeSize(node);
    return Math.hypot(size.width, size.height) / 2 + 20 * sizeScale;
  };

  const adj = new Map<string, Set<string>>();
  edges.forEach((e) => {
    const { source, target } = e;
    if (!adj.has(source)) adj.set(source, new Set());
    if (!adj.has(target)) adj.set(target, new Set());
    adj.get(source)!.add(target);
    adj.get(target)!.add(source);
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const components: ERNodeModel[][] = [];
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  sortedNodes.forEach((n) => {
    if (visited.has(n.id)) return;
    const stack: string[] = [n.id];
    const comp: ERNodeModel[] = [];
    visited.add(n.id);
    while (stack.length) {
      const cur = stack.pop()!;
      const found = nodeById.get(cur);
      if (found) comp.push(found);
      const neighbors = adj.get(cur);
      if (!neighbors) continue;
      const sortedNeighbors = Array.from(neighbors).sort((a, b) => a.localeCompare(b));
      sortedNeighbors.forEach((nb) => {
        if (!visited.has(nb)) {
          visited.add(nb);
          stack.push(nb);
        }
      });
    }
    if (comp.length) components.push(comp);
  });

  if (components.length < 2) return;

  const compMeta = components.map((list) => {
    const r = list.reduce((max, n) => Math.max(max, approxRadius(n)), 30 * sizeScale);
    const extra = Math.max(0, list.length - 6) * 6 * sizeScale;
    return { nodes: list, radius: r + extra };
  });

  const perim = compMeta.reduce((sum, c) => sum + c.radius * 2, 0);
  const gap = 100 * sizeScale;
  const orbit = Math.min(
    Math.max(240 * sizeScale, (perim + gap * compMeta.length) / (2 * Math.PI)),
    520 * sizeScale,
  );

  let angle = -Math.PI / 2;
  const angleStep = (Math.PI * 2) / compMeta.length;
  compMeta.forEach((meta) => {
    const cx = center.x + orbit * Math.cos(angle);
    const cy = center.y + orbit * Math.sin(angle);
    meta.nodes.forEach((n) => {
      const hash = deterministicHash(n.id, seed);
      const offsetX = deterministicRandom(hash, seed) * Math.max(40 * sizeScale, meta.radius * 0.4);
      const offsetY =
        deterministicRandom(hash + 1000, seed) * Math.max(40 * sizeScale, meta.radius * 0.4);
      n.x = cx + offsetX;
      n.y = cy + offsetY;
    });
    angle += angleStep;
  });
};
