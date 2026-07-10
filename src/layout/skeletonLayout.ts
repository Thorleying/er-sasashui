import { measureNodeSize } from "../builder";
import { computeLayoutSizeScale } from "../graph/sizeAwareGeometry";
import type { EREdgeModel, ERNodeModel } from "../types";

const TAU = Math.PI * 2;

interface Pt {
  x: number;
  y: number;
}

export interface SkeletonRelationship {
  id: string;
  entityIds: string[];
  selfLoop: boolean;
}

export interface SkeletonEdge {
  key: string;
  a: string;
  b: string;
  relationshipIds: string[];
}

export interface EntitySkeleton {
  entityIds: string[];
  relationships: SkeletonRelationship[];
  simpleEdges: SkeletonEdge[];
  selfLoops: SkeletonRelationship[];
  hyperRelationships: SkeletonRelationship[];
}

export interface SkeletonEmbedding {
  positions: Map<string, Pt>;
  planarEdges: Array<{ key: string; a: string; b: string }>;
  planarEdgeKeys: string[];
  deferredEdgeKeys: string[];
  planar: boolean;
}

export interface SkeletonLayoutOptions {
  canvasWidth?: number;
  stressIterations?: number;
  ringOverride?: Map<string, number>;
}

const pairKey = (a: string, b: string): string => (a < b ? `${a}\t${b}` : `${b}\t${a}`);
const pairFromKey = (key: string): [string, string] => {
  const [a, b] = key.split("\t");
  return [a, b];
};

const halfDiag = (m: ERNodeModel) => {
  const s = measureNodeSize(m);
  return Math.hypot(s.width, s.height) / 2;
};

const maxHalfOf = (m: ERNodeModel) => {
  const s = measureNodeSize(m);
  return Math.max(s.width, s.height) / 2;
};

export function ringRadiusFor(
  entity: ERNodeModel,
  attrs: ERNodeModel[],
  sizeScale = computeLayoutSizeScale([entity, ...attrs]),
): number {
  const entR = halfDiag(entity);
  if (!attrs.length) return entR;
  const halves = attrs.map(maxHalfOf);
  const maxHalf = Math.max(...halves);
  const gap = 8 * sizeScale;
  const radialMin = entR + maxHalf + gap;
  const target = TAU * 0.92;
  const sum = (radius: number) =>
    halves.reduce(
      (acc, half) => acc + 2 * Math.asin(Math.min(0.999, (half + gap / 2) / radius)),
      0,
    );
  let lo = radialMin;
  let hi = radialMin;
  while (sum(hi) > target && hi < radialMin + 6000) hi *= 1.5;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (sum(mid) <= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

export function buildEntitySkeleton(nodes: ERNodeModel[], edges: EREdgeModel[]): EntitySkeleton {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const entityIds = nodes
    .filter((node) => node.nodeType === "entity")
    .map((node) => node.id)
    .sort();
  const entitySet = new Set(entityIds);
  const rels = nodes
    .filter((node) => node.nodeType === "relationship")
    .sort((a, b) => a.id.localeCompare(b.id));

  const relationships: SkeletonRelationship[] = rels.map((rel) => {
    const touching: string[] = [];
    edges.forEach((edge) => {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (edge.source === rel.id && target?.nodeType === "entity") touching.push(target.id);
      if (edge.target === rel.id && source?.nodeType === "entity") touching.push(source.id);
    });
    const entityIdsForRel = [...new Set(touching.filter((id) => entitySet.has(id)))].sort();
    return {
      id: rel.id,
      entityIds: entityIdsForRel,
      selfLoop: Boolean(rel.isSelfLoop) || entityIdsForRel.length === 1,
    };
  });

  const byPair = new Map<string, SkeletonEdge>();
  relationships.forEach((rel) => {
    if (rel.selfLoop || rel.entityIds.length !== 2) return;
    const [a, b] = rel.entityIds;
    const key = pairKey(a, b);
    let edge = byPair.get(key);
    if (!edge) {
      edge = { key, a: key.split("\t")[0], b: key.split("\t")[1], relationshipIds: [] };
      byPair.set(key, edge);
    }
    edge.relationshipIds.push(rel.id);
  });

  return {
    entityIds,
    relationships,
    simpleEdges: [...byPair.values()].sort((a, b) => a.key.localeCompare(b.key)),
    selfLoops: relationships.filter((rel) => rel.selfLoop),
    hyperRelationships: relationships.filter((rel) => !rel.selfLoop && rel.entityIds.length > 2),
  };
}

function makeAdjacency(vertices: string[], edgeKeys: Iterable<string>): Map<string, Set<string>> {
  const adj = new Map(vertices.map((id) => [id, new Set<string>()]));
  for (const key of edgeKeys) {
    const [a, b] = pairFromKey(key);
    if (a === b || !adj.has(a) || !adj.has(b)) continue;
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }
  return adj;
}

function edgeKeysFromAdjacency(adj: Map<string, Set<string>>): Set<string> {
  const keys = new Set<string>();
  adj.forEach((neighbors, a) => {
    neighbors.forEach((b) => {
      if (a !== b) keys.add(pairKey(a, b));
    });
  });
  return keys;
}

function reduceSeriesVertices(adj: Map<string, Set<string>>): Map<string, Set<string>> {
  const reduced = new Map<string, Set<string>>();
  adj.forEach((neighbors, id) => reduced.set(id, new Set(neighbors)));

  const removeVertex = (id: string) => {
    const neighbors = reduced.get(id);
    if (!neighbors) return;
    neighbors.forEach((neighbor) => reduced.get(neighbor)?.delete(id));
    reduced.delete(id);
  };
  const addEdge = (a: string, b: string) => {
    if (a === b || !reduced.has(a) || !reduced.has(b)) return;
    reduced.get(a)!.add(b);
    reduced.get(b)!.add(a);
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...reduced.keys()].sort()) {
      const neighbors = [...(reduced.get(id) ?? [])];
      if (neighbors.length <= 1) {
        removeVertex(id);
        changed = true;
        break;
      }
      if (neighbors.length === 2) {
        removeVertex(id);
        addEdge(neighbors[0], neighbors[1]);
        changed = true;
        break;
      }
    }
  }
  return reduced;
}

function connectedComponentsOf(adj: Map<string, Set<string>>): string[][] {
  const seen = new Set<string>();
  const components: string[][] = [];
  [...adj.keys()].sort().forEach((start) => {
    if (seen.has(start)) return;
    const stack = [start];
    const comp: string[] = [];
    seen.add(start);
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      (adj.get(cur) ?? []).forEach((neighbor) => {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          stack.push(neighbor);
        }
      });
    }
    components.push(comp.sort());
  });
  return components;
}

function combinations<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  const pick = (start: number, acc: T[]) => {
    if (acc.length === size) {
      result.push([...acc]);
      return;
    }
    for (let i = start; i <= items.length - (size - acc.length); i++) {
      acc.push(items[i]);
      pick(i + 1, acc);
      acc.pop();
    }
  };
  pick(0, []);
  return result;
}

function isBipartiteComponent(component: string[], adj: Map<string, Set<string>>): boolean {
  const inComponent = new Set(component);
  const color = new Map<string, number>();
  for (const start of component) {
    if (color.has(start)) continue;
    color.set(start, 0);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      const curColor = color.get(cur)!;
      for (const neighbor of adj.get(cur) ?? []) {
        if (!inComponent.has(neighbor)) continue;
        if (!color.has(neighbor)) {
          color.set(neighbor, 1 - curColor);
          queue.push(neighbor);
        } else if (color.get(neighbor) === curColor) {
          return false;
        }
      }
    }
  }
  return true;
}

function componentEdgeCount(component: string[], edgeKeys: Set<string>): number {
  const ids = new Set(component);
  let count = 0;
  edgeKeys.forEach((key) => {
    const [a, b] = pairFromKey(key);
    if (ids.has(a) && ids.has(b)) count++;
  });
  return count;
}

function hasK5Subgraph(component: string[], edgeKeys: Set<string>): boolean {
  return combinations(component, 5).some((group) => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (!edgeKeys.has(pairKey(group[i], group[j]))) return false;
      }
    }
    return true;
  });
}

function hasK33Subgraph(component: string[], edgeKeys: Set<string>): boolean {
  for (const left of combinations(component, 3)) {
    const leftSet = new Set(left);
    const remaining = component.filter((id) => !leftSet.has(id));
    for (const right of combinations(remaining, 3)) {
      let complete = true;
      for (const a of left) {
        for (const b of right) {
          if (!edgeKeys.has(pairKey(a, b))) {
            complete = false;
            break;
          }
        }
        if (!complete) break;
      }
      if (complete) return true;
    }
  }
  return false;
}

function isLikelyPlanar(vertices: string[], edgeKeys: Set<string>): boolean {
  const reducedAdj = reduceSeriesVertices(makeAdjacency(vertices, edgeKeys));
  const reducedEdges = edgeKeysFromAdjacency(reducedAdj);
  for (const component of connectedComponentsOf(reducedAdj)) {
    const v = component.length;
    const e = componentEdgeCount(component, reducedEdges);
    if (v < 3) continue;
    if (e > 3 * v - 6) return false;
    if (isBipartiteComponent(component, reducedAdj) && e > 2 * v - 4) return false;
    if (hasK5Subgraph(component, reducedEdges)) return false;
    if (hasK33Subgraph(component, reducedEdges)) return false;
  }
  return true;
}

class DisjointSet {
  private parent = new Map<string, string>();

  constructor(ids: string[]) {
    ids.forEach((id) => this.parent.set(id, id));
  }

  find(id: string): string {
    const parent = this.parent.get(id) ?? id;
    if (parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(a: string, b: string): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    this.parent.set(ra, rb);
    return true;
  }
}

function maximalPlanarEdgeKeys(skeleton: EntitySkeleton): { planar: string[]; deferred: string[] } {
  const all = skeleton.simpleEdges.map((edge) => edge.key);
  const allSet = new Set(all);
  if (isLikelyPlanar(skeleton.entityIds, allSet)) return { planar: all, deferred: [] };

  const chosen = new Set<string>();
  const deferred = new Set<string>();
  const dsu = new DisjointSet(skeleton.entityIds);

  skeleton.simpleEdges.forEach((edge) => {
    if (dsu.union(edge.a, edge.b)) chosen.add(edge.key);
  });

  skeleton.simpleEdges.forEach((edge) => {
    if (chosen.has(edge.key)) return;
    const candidate = new Set(chosen);
    candidate.add(edge.key);
    if (isLikelyPlanar(skeleton.entityIds, candidate)) chosen.add(edge.key);
    else deferred.add(edge.key);
  });

  return {
    planar: all.filter((key) => chosen.has(key)),
    deferred: all.filter((key) => deferred.has(key)),
  };
}

const segmentsCross = (a1: Pt, a2: Pt, b1: Pt, b2: Pt): boolean => {
  const eq = (p: Pt, q: Pt) => Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6;
  if (eq(a1, b1) || eq(a1, b2) || eq(a2, b1) || eq(a2, b2)) return false;
  const c = (o: Pt, p: Pt, q: Pt) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = c(b1, b2, a1);
  const d2 = c(b1, b2, a2);
  const d3 = c(a1, a2, b1);
  const d4 = c(a1, a2, b2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};

function countCrossings(pos: Map<string, Pt>, edges: Array<{ a: string; b: string }>): number {
  let total = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const e1 = edges[i];
      const e2 = edges[j];
      if (e1.a === e2.a || e1.a === e2.b || e1.b === e2.a || e1.b === e2.b) continue;
      const a1 = pos.get(e1.a);
      const a2 = pos.get(e1.b);
      const b1 = pos.get(e2.a);
      const b2 = pos.get(e2.b);
      if (a1 && a2 && b1 && b2 && segmentsCross(a1, a2, b1, b2)) total++;
    }
  }
  return total;
}

function enumerateCycles(ids: string[], adj: Map<string, Set<string>>, limit = 300): string[][] {
  if (ids.length > 12) return [];
  const order = new Map(ids.map((id, index) => [id, index]));
  const seen = new Set<string>();
  const cycles: string[][] = [];
  const canonical = (cycle: string[]) => {
    const forward = cycle;
    const backward = [cycle[0], ...cycle.slice(1).reverse()];
    const f = forward.join("\t");
    const b = backward.join("\t");
    return f <= b ? f : b;
  };

  ids.forEach((start) => {
    const startIndex = order.get(start)!;
    const dfs = (cur: string, path: string[], visited: Set<string>) => {
      if (cycles.length >= limit) return;
      const neighbors = [...(adj.get(cur) ?? [])].sort();
      for (const nb of neighbors) {
        const nbIndex = order.get(nb)!;
        if (nb === start && path.length >= 3) {
          const key = canonical(path);
          if (!seen.has(key)) {
            seen.add(key);
            cycles.push([...path]);
          }
          continue;
        }
        if (visited.has(nb) || nbIndex < startIndex || path.length >= ids.length) continue;
        visited.add(nb);
        path.push(nb);
        dfs(nb, path, visited);
        path.pop();
        visited.delete(nb);
      }
    };
    dfs(start, [start], new Set([start]));
  });

  return cycles;
}

function treeLayout(ids: string[], adj: Map<string, Set<string>>): Map<string, Pt> {
  const root = ids
    .slice()
    .sort((a, b) => (adj.get(b)?.size ?? 0) - (adj.get(a)?.size ?? 0) || a.localeCompare(b))[0];
  const children = new Map<string, string[]>();
  const seen = new Set([root]);
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    const kids = [...(adj.get(cur) ?? [])].filter((id) => !seen.has(id)).sort();
    children.set(cur, kids);
    kids.forEach((kid) => {
      seen.add(kid);
      stack.push(kid);
    });
  }

  let cursor = 0;
  const pos = new Map<string, Pt>();
  const assign = (id: string, depth: number) => {
    const kids = children.get(id) ?? [];
    if (!kids.length) {
      pos.set(id, { x: cursor * 260, y: depth * 220 });
      cursor++;
      return;
    }
    kids.forEach((kid) => assign(kid, depth + 1));
    const xs = kids.map((kid) => pos.get(kid)!.x);
    pos.set(id, { x: xs.reduce((sum, x) => sum + x, 0) / xs.length, y: depth * 220 });
  };
  assign(root, 0);

  ids.forEach((id) => {
    if (!pos.has(id)) {
      pos.set(id, { x: cursor * 260, y: 0 });
      cursor++;
    }
  });
  return pos;
}

function barycentricLayout(
  ids: string[],
  edgeList: Array<{ key: string; a: string; b: string }>,
  outer: string[],
): Map<string, Pt> {
  const pos = new Map<string, Pt>();
  const outerSet = new Set(outer);
  const radius = Math.max(220, outer.length * 70);
  outer.forEach((id, index) => {
    const angle = -Math.PI / 2 + (index / outer.length) * TAU;
    pos.set(id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  });

  const adj = makeAdjacency(
    ids,
    edgeList.map((edge) => edge.key),
  );
  const inner = ids.filter((id) => !outerSet.has(id));
  inner.forEach((id, index) => {
    const angle = (index / Math.max(1, inner.length)) * TAU;
    pos.set(id, { x: Math.cos(angle) * radius * 0.18, y: Math.sin(angle) * radius * 0.18 });
  });

  for (let iter = 0; iter < 120; iter++) {
    inner.forEach((id) => {
      const neighbors = [...(adj.get(id) ?? [])];
      if (!neighbors.length) return;
      let x = 0;
      let y = 0;
      neighbors.forEach((nb) => {
        const p = pos.get(nb) ?? { x: 0, y: 0 };
        x += p.x;
        y += p.y;
      });
      pos.set(id, { x: x / neighbors.length, y: y / neighbors.length });
    });
  }
  return pos;
}

function componentSeed(
  ids: string[],
  edgeList: Array<{ key: string; a: string; b: string }>,
): Map<string, Pt> {
  if (ids.length === 1) return new Map([[ids[0], { x: 0, y: 0 }]]);
  const adj = makeAdjacency(
    ids,
    edgeList.map((edge) => edge.key),
  );
  if (edgeList.length <= ids.length - 1) return treeLayout(ids, adj);

  const cycles = enumerateCycles(ids, adj);
  if (!cycles.length) return treeLayout(ids, adj);

  let best: { pos: Map<string, Pt>; crossings: number; cycleLength: number; area: number } | null =
    null;
  cycles
    .slice()
    .sort((a, b) => a.length - b.length || a.join("\t").localeCompare(b.join("\t")))
    .forEach((cycle) => {
      const pos = barycentricLayout(ids, edgeList, cycle);
      const crossings = countCrossings(pos, edgeList);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      pos.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
      const area = (maxX - minX) * (maxY - minY);
      if (
        !best ||
        crossings < best.crossings ||
        (crossings === best.crossings && cycle.length < best.cycleLength) ||
        (crossings === best.crossings && cycle.length === best.cycleLength && area < best.area)
      ) {
        best = { pos, crossings, cycleLength: cycle.length, area };
      }
    });
  return best?.pos ?? treeLayout(ids, adj);
}

export function computeSkeletonEmbedding(skeleton: EntitySkeleton): SkeletonEmbedding {
  const { planar, deferred } = maximalPlanarEdgeKeys(skeleton);
  const planarSet = new Set(planar);
  const edgeByKey = new Map(skeleton.simpleEdges.map((edge) => [edge.key, edge]));
  const planarEdges = planar
    .map((key) => edgeByKey.get(key))
    .filter((edge): edge is SkeletonEdge => Boolean(edge))
    .map((edge) => ({ key: edge.key, a: edge.a, b: edge.b }));
  const adj = makeAdjacency(skeleton.entityIds, planar);
  const components = connectedComponentsOf(adj);
  const positions = new Map<string, Pt>();
  const componentGap = 260;
  const canvasWidth = 1200;
  let cursorX = componentGap;
  let cursorY = componentGap;
  let rowHeight = 0;

  components.forEach((ids) => {
    const idSet = new Set(ids);
    const localEdges = planarEdges.filter((edge) => idSet.has(edge.a) && idSet.has(edge.b));
    const local = componentSeed(ids, localEdges);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    local.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    const width = Math.max(120, maxX - minX) + componentGap;
    const height = Math.max(120, maxY - minY) + componentGap;
    if (cursorX + width > canvasWidth && cursorX > componentGap) {
      cursorX = componentGap;
      cursorY += rowHeight + componentGap;
      rowHeight = 0;
    }
    const ox = cursorX - minX;
    const oy = cursorY - minY;
    local.forEach((p, id) => positions.set(id, { x: p.x + ox, y: p.y + oy }));
    cursorX += width;
    rowHeight = Math.max(rowHeight, height);
  });

  skeleton.entityIds.forEach((id, index) => {
    if (!positions.has(id)) positions.set(id, { x: componentGap + index * 240, y: componentGap });
  });

  return {
    positions,
    planarEdges,
    planarEdgeKeys: planar,
    deferredEdgeKeys: deferred,
    planar: deferred.length === 0 && planarSet.size === skeleton.simpleEdges.length,
  };
}

function smacof(pos: Pt[], distances: number[][], iters: number): void {
  const n = pos.length;
  for (let iter = 0; iter < iters; iter++) {
    for (let i = 0; i < n; i++) {
      let nx = 0;
      let ny = 0;
      let den = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dij = distances[i][j];
        if (!Number.isFinite(dij) || dij <= 0) continue;
        const w = 1 / (dij * dij);
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dist = Math.hypot(dx, dy) || 1e-4;
        nx += w * (pos[j].x + (dij * dx) / dist);
        ny += w * (pos[j].y + (dij * dy) / dist);
        den += w;
      }
      if (den > 0) {
        pos[i].x = nx / den;
        pos[i].y = ny / den;
      }
    }
  }
}

function removeOverlaps(pos: Pt[], rad: number[], iters = 400): void {
  for (let iter = 0; iter < iters; iter++) {
    let moved = 0;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const dist = Math.hypot(dx, dy) || 1e-4;
        const min = rad[i] + rad[j];
        if (dist < min) {
          const push = (min - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          pos[i].x -= ux * push;
          pos[i].y -= uy * push;
          pos[j].x += ux * push;
          pos[j].y += uy * push;
          moved = Math.max(moved, push);
        }
      }
    }
    if (moved < 0.3) break;
  }
}

function countArrayCrossings(pos: Pt[], edges: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const [a, b] = edges[i];
      const [c, d] = edges[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (segmentsCross(pos[a], pos[b], pos[c], pos[d])) total++;
    }
  }
  return total;
}

function reduceCrossings(pos: Pt[], edges: [number, number][], n: number): void {
  let cur = countArrayCrossings(pos, edges);
  for (let pass = 0; pass < 8 && cur > 0; pass++) {
    let improved = false;
    for (let i = 0; i < n && cur > 0; i++) {
      for (let j = i + 1; j < n; j++) {
        const tmp = pos[i];
        pos[i] = pos[j];
        pos[j] = tmp;
        const next = countArrayCrossings(pos, edges);
        if (next < cur) {
          cur = next;
          improved = true;
        } else {
          const restore = pos[i];
          pos[i] = pos[j];
          pos[j] = restore;
        }
      }
    }
    if (!improved) break;
  }
}

function rotateToTargetAspect(pos: Pt[], rad: number[], target = 1.5): void {
  if (pos.length < 2) return;
  const cx = pos.reduce((sum, p) => sum + p.x, 0) / pos.length;
  const cy = pos.reduce((sum, p) => sum + p.y, 0) / pos.length;
  let bestTheta = 0;
  let bestScore = Infinity;
  let bestArea = Infinity;
  for (let deg = 0; deg < 180; deg++) {
    const theta = (deg * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < pos.length; i++) {
      const dx = pos[i].x - cx;
      const dy = pos[i].y - cy;
      const x = cx + dx * cos - dy * sin;
      const y = cy + dx * sin + dy * cos;
      minX = Math.min(minX, x - rad[i]);
      maxX = Math.max(maxX, x + rad[i]);
      minY = Math.min(minY, y - rad[i]);
      maxY = Math.max(maxY, y + rad[i]);
    }
    const w = maxX - minX;
    const h = maxY - minY;
    const score = Math.abs(w / Math.max(1, h) - target);
    const area = w * h;
    if (score < bestScore - 1e-9 || (Math.abs(score - bestScore) < 1e-9 && area < bestArea)) {
      bestScore = score;
      bestArea = area;
      bestTheta = theta;
    }
  }
  if (Math.abs(bestTheta) < 1e-9) return;
  const cos = Math.cos(bestTheta);
  const sin = Math.sin(bestTheta);
  for (let i = 0; i < pos.length; i++) {
    const dx = pos[i].x - cx;
    const dy = pos[i].y - cy;
    pos[i].x = cx + dx * cos - dy * sin;
    pos[i].y = cy + dx * sin + dy * cos;
  }
}

function angleDistance(a: number, b: number): number {
  let d = Math.abs(a - b) % TAU;
  if (d > Math.PI) d = TAU - d;
  return d;
}

function placeRelationshipNodes(
  nodes: ERNodeModel[],
  skeleton: EntitySkeleton,
  embedding: SkeletonEmbedding,
  ring: Map<string, number>,
  sizeScale: number,
): void {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const entities = nodes.filter((node) => node.nodeType === "entity");
  const rels = nodes.filter((node) => node.nodeType === "relationship");
  const epos = new Map(
    entities.map((entity) => [entity.id, { x: entity.x ?? 0, y: entity.y ?? 0 }]),
  );
  const deferred = new Set(embedding.deferredEdgeKeys);

  skeleton.simpleEdges.forEach((edge) => {
    const pa = epos.get(edge.a);
    const pb = epos.get(edge.b);
    if (!pa || !pb) return;
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const px = -uy;
    const py = ux;
    const relItems = edge.relationshipIds
      .map((id) => nodeById.get(id))
      .filter((node): node is ERNodeModel => Boolean(node))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!relItems.length) return;
    const maxHalf = Math.max(...relItems.map(halfDiag));
    const mid = (relItems.length - 1) / 2;
    const extra = deferred.has(edge.key) ? maxHalf * 2 + 54 * sizeScale : 0;
    relItems.forEach((rel, index) => {
      const dh = halfDiag(rel);
      const free =
        dist - (ring.get(edge.a) ?? 40 * sizeScale) - (ring.get(edge.b) ?? 40 * sizeScale) - 2 * dh;
      const gap = Math.max(20 * sizeScale, free / 2);
      const fromA = (ring.get(edge.a) ?? 40 * sizeScale) + dh + gap;
      const parallelOffset = (index - mid) * (maxHalf * 2 + 16 * sizeScale);
      const deferredOffset = extra ? (edge.key.charCodeAt(0) % 2 === 0 ? extra : -extra) : 0;
      rel.x = pa.x + ux * fromA + px * (parallelOffset + deferredOffset);
      rel.y = pa.y + uy * fromA + py * (parallelOffset + deferredOffset);
    });
  });

  const loopByEntity = new Map<string, ERNodeModel[]>();
  skeleton.selfLoops.forEach((loop) => {
    const owner = loop.entityIds[0];
    const rel = nodeById.get(loop.id);
    if (!owner || !rel) return;
    if (!loopByEntity.has(owner)) loopByEntity.set(owner, []);
    loopByEntity.get(owner)!.push(rel);
  });

  const neighborAngles = new Map<string, number[]>();
  skeleton.simpleEdges.forEach((edge) => {
    const pa = epos.get(edge.a);
    const pb = epos.get(edge.b);
    if (!pa || !pb) return;
    const ab = Math.atan2(pb.y - pa.y, pb.x - pa.x);
    const ba = Math.atan2(pa.y - pb.y, pa.x - pb.x);
    if (!neighborAngles.has(edge.a)) neighborAngles.set(edge.a, []);
    if (!neighborAngles.has(edge.b)) neighborAngles.set(edge.b, []);
    neighborAngles.get(edge.a)!.push(ab);
    neighborAngles.get(edge.b)!.push(ba);
  });

  loopByEntity.forEach((loops, entityId) => {
    const center = epos.get(entityId);
    if (!center) return;
    const sorted = loops.slice().sort((a, b) => a.id.localeCompare(b.id));
    const usedAngles = [...(neighborAngles.get(entityId) ?? [])];
    const radius =
      (ring.get(entityId) ?? 60 * sizeScale) + Math.max(...sorted.map(halfDiag)) + 54 * sizeScale;
    sorted.forEach((rel) => {
      let bestAngle = -Math.PI / 2;
      let bestScore = -Infinity;
      for (let i = 0; i < 32; i++) {
        const angle = -Math.PI + (i / 32) * TAU;
        const clearance = usedAngles.length
          ? Math.min(...usedAngles.map((used) => angleDistance(angle, used)))
          : Math.PI;
        const topPreference = Math.cos(angle + Math.PI / 2) * 0.2;
        const score = clearance + topPreference;
        if (score > bestScore) {
          bestScore = score;
          bestAngle = angle;
        }
      }
      rel.x = center.x + Math.cos(bestAngle) * radius;
      rel.y = center.y + Math.sin(bestAngle) * radius;
      usedAngles.push(bestAngle);
    });
  });

  skeleton.hyperRelationships.forEach((relInfo) => {
    const rel = nodeById.get(relInfo.id);
    if (!rel) return;
    const pts = relInfo.entityIds.map((id) => epos.get(id)).filter((p): p is Pt => Boolean(p));
    if (!pts.length) return;
    rel.x = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
    rel.y = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
  });

  separateRelationshipOverlaps(nodes, sizeScale);
}

function separateRelationshipOverlaps(nodes: ERNodeModel[], sizeScale: number): void {
  const entities = nodes.filter((node) => node.nodeType === "entity");
  const rels = nodes.filter((node) => node.nodeType === "relationship");
  const entBox = entities.map((entity) => {
    const s = measureNodeSize(entity);
    return { id: entity.id, x: entity.x ?? 0, y: entity.y ?? 0, hw: s.width / 2, hh: s.height / 2 };
  });
  const relBox = rels.map((rel) => {
    const s = measureNodeSize(rel);
    return { rel, hw: s.width / 2, hh: s.height / 2 };
  });
  const margin = 3 * sizeScale;
  for (let iter = 0; iter < 200; iter++) {
    let moved = 0;
    for (let i = 0; i < relBox.length; i++) {
      const a = relBox[i];
      for (const e of entBox) {
        const dx = (a.rel.x ?? 0) - e.x;
        const dy = (a.rel.y ?? 0) - e.y;
        const ox = a.hw + e.hw + margin - Math.abs(dx);
        const oy = a.hh + e.hh + margin - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox <= oy) a.rel.x = (a.rel.x ?? 0) + (dx >= 0 ? ox : -ox);
          else a.rel.y = (a.rel.y ?? 0) + (dy >= 0 ? oy : -oy);
          moved = Math.max(moved, Math.min(ox, oy));
        }
      }
      for (let j = i + 1; j < relBox.length; j++) {
        const b = relBox[j];
        const dx = (a.rel.x ?? 0) - (b.rel.x ?? 0);
        const dy = (a.rel.y ?? 0) - (b.rel.y ?? 0);
        const ox = a.hw + b.hw + margin - Math.abs(dx);
        const oy = a.hh + b.hh + margin - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox <= oy) {
            const push = (dx >= 0 ? ox : -ox) / 2;
            a.rel.x = (a.rel.x ?? 0) + push;
            b.rel.x = (b.rel.x ?? 0) - push;
          } else {
            const push = (dy >= 0 ? oy : -oy) / 2;
            a.rel.y = (a.rel.y ?? 0) + push;
            b.rel.y = (b.rel.y ?? 0) - push;
          }
          moved = Math.max(moved, Math.min(ox, oy));
        }
      }
    }
    if (moved < 0.3) break;
  }
}

export function applySkeletonLayout(
  nodes: ERNodeModel[],
  edges: EREdgeModel[],
  options: SkeletonLayoutOptions = {},
): SkeletonEmbedding {
  const sizeScale = computeLayoutSizeScale(nodes);
  const skeleton = buildEntitySkeleton(nodes, edges);
  const embedding = computeSkeletonEmbedding(skeleton);
  if (Math.abs(sizeScale - 1) > 1e-9) {
    embedding.positions.forEach((position) => {
      position.x *= sizeScale;
      position.y *= sizeScale;
    });
  }
  const entityById = new Map(
    nodes.filter((n) => n.nodeType === "entity").map((node) => [node.id, node]),
  );
  const relById = new Map(
    nodes.filter((n) => n.nodeType === "relationship").map((node) => [node.id, node]),
  );
  const attrsByEntity = new Map<string, ERNodeModel[]>();
  nodes.forEach((node) => {
    if (node.nodeType === "attribute" && typeof node.parentEntity === "string") {
      if (!attrsByEntity.has(node.parentEntity)) attrsByEntity.set(node.parentEntity, []);
      attrsByEntity.get(node.parentEntity)!.push(node);
    }
  });

  const ring = new Map(
    skeleton.entityIds.map((id) => {
      const entity = entityById.get(id)!;
      return [
        id,
        options.ringOverride?.get(id) ??
          ringRadiusFor(entity, attrsByEntity.get(id) ?? [], sizeScale),
      ] as const;
    }),
  );
  const footprint = new Map(
    skeleton.entityIds.map((id) => {
      const attrs = attrsByEntity.get(id) ?? [];
      const maxAttr = attrs.length ? Math.max(...attrs.map(maxHalfOf)) : 0;
      return [
        id,
        (ring.get(id) ?? halfDiag(entityById.get(id)!)) + maxAttr + 6 * sizeScale,
      ] as const;
    }),
  );

  embedding.positions.forEach((pos, id) => {
    const entity = entityById.get(id);
    if (!entity) return;
    entity.x = pos.x;
    entity.y = pos.y;
  });

  const desired = new Map<string, number>();
  skeleton.simpleEdges.forEach((edge) => {
    if (!embedding.planarEdgeKeys.includes(edge.key)) return;
    const maxRelHalf = Math.max(
      ...edge.relationshipIds
        .map((id) => relById.get(id))
        .filter((rel): rel is ERNodeModel => Boolean(rel))
        .map(halfDiag),
      36 * sizeScale,
    );
    desired.set(
      edge.key,
      (ring.get(edge.a) ?? 40 * sizeScale) +
        (ring.get(edge.b) ?? 40 * sizeScale) +
        2 * maxRelHalf +
        40 * sizeScale,
    );
  });

  const planarAdj = makeAdjacency(skeleton.entityIds, embedding.planarEdgeKeys);
  const components = connectedComponentsOf(planarAdj);
  interface Laid {
    ids: string[];
    pos: Map<string, Pt>;
    w: number;
    h: number;
  }
  const laid: Laid[] = components.map((ids) => {
    const idx = new Map(ids.map((id, index) => [id, index]));
    const localPos = ids.map((id) => {
      const entity = entityById.get(id)!;
      return { x: entity.x ?? 0, y: entity.y ?? 0 };
    });
    const rad = ids.map((id) => footprint.get(id) ?? 60 * sizeScale);
    const localEdges: [number, number][] = [];
    embedding.planarEdges.forEach((edge) => {
      if (!idx.has(edge.a) || !idx.has(edge.b)) return;
      localEdges.push([idx.get(edge.a)!, idx.get(edge.b)!]);
    });

    if (ids.length > 1 && localEdges.length) {
      const inf = 1e9;
      const d: number[][] = Array.from({ length: ids.length }, () =>
        new Array(ids.length).fill(inf),
      );
      for (let i = 0; i < ids.length; i++) d[i][i] = 0;
      embedding.planarEdges.forEach((edge) => {
        if (!idx.has(edge.a) || !idx.has(edge.b)) return;
        const ia = idx.get(edge.a)!;
        const ib = idx.get(edge.b)!;
        const want = desired.get(edge.key) ?? 260 * sizeScale;
        d[ia][ib] = Math.min(d[ia][ib], want);
        d[ib][ia] = Math.min(d[ib][ia], want);
      });
      for (let k = 0; k < ids.length; k++) {
        for (let i = 0; i < ids.length; i++) {
          for (let j = 0; j < ids.length; j++) {
            if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
          }
        }
      }
      smacof(localPos, d, options.stressIterations ?? 260);
      removeOverlaps(localPos, rad, 360);
      reduceCrossings(localPos, localEdges, ids.length);
      removeOverlaps(localPos, rad, 360);
      rotateToTargetAspect(localPos, rad);
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    ids.forEach((id, index) => {
      const r = footprint.get(id) ?? 60 * sizeScale;
      minX = Math.min(minX, localPos[index].x - r);
      maxX = Math.max(maxX, localPos[index].x + r);
      minY = Math.min(minY, localPos[index].y - r);
      maxY = Math.max(maxY, localPos[index].y + r);
    });
    const pos = new Map<string, Pt>();
    ids.forEach((id, index) =>
      pos.set(id, { x: localPos[index].x - minX, y: localPos[index].y - minY }),
    );
    return { ids, pos, w: maxX - minX, h: maxY - minY };
  });

  laid.sort((a, b) => b.w * b.h - a.w * a.h);
  const pad = 80 * sizeScale;
  const maxWidth = options.canvasWidth ?? 1200;
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  laid.forEach((component) => {
    if (cursorX > 0 && cursorX + component.w > maxWidth) {
      cursorX = 0;
      cursorY += rowHeight + pad;
      rowHeight = 0;
    }
    component.ids.forEach((id) => {
      const entity = entityById.get(id);
      const p = component.pos.get(id);
      if (!entity || !p) return;
      entity.x = cursorX + p.x;
      entity.y = cursorY + p.y;
    });
    cursorX += component.w + pad;
    rowHeight = Math.max(rowHeight, component.h);
  });

  placeRelationshipNodes(nodes, skeleton, embedding, ring, sizeScale);
  return embedding;
}

export function stressLayout(
  nodes: ERNodeModel[],
  edges: EREdgeModel[],
  ringOverride?: Map<string, number>,
): void {
  applySkeletonLayout(nodes, edges, { ringOverride });
}
