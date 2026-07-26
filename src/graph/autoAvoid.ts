import type { EREdgeModel, ERNodeModel } from "../types";
import type { NodeSize, NodeSizeResolver, Point } from "./entityMoveSync";
import { computeLayoutSizeScale } from "./sizeAwareGeometry";
import {
  TAU,
  angleDistance,
  boxesOverlap,
  fallbackNodeSize,
  safeNodeSize,
  segmentHitsBox,
  segmentsIntersectStrict as segmentsIntersect,
} from "../layout/geometry";
import { SpatialGrid } from "../layout/spatialGrid";

export interface AutoAvoidOptions {
  enabled?: boolean;
  edges?: EREdgeModel[];
  avoidAttributeEdges?: boolean;
  margin?: number;
  maxIterations?: number;
  movableIds?: Iterable<string>;
}

/** Above this node count the expensive line-avoidance phases are skipped. */
const LINE_AVOIDANCE_NODE_LIMIT = 300;
/** Above this node count the pairwise separation loop switches to a grid. */
const GRID_SEPARATION_THRESHOLD = 64;

const positionOf = (node: ERNodeModel): Point => ({
  x: typeof node.x === "number" ? node.x : 0,
  y: typeof node.y === "number" ? node.y : 0,
});

const fallbackSize = (node: ERNodeModel): NodeSize => fallbackNodeSize(node);

const safeSize = (node: ERNodeModel, sizeOf?: NodeSizeResolver): NodeSize =>
  safeNodeSize(node, sizeOf?.(node));

const movePriority = (node: ERNodeModel): number => {
  if (node.nodeType === "attribute") return 2;
  if (node.nodeType === "relationship") return 1;
  return 0;
};

const deterministicSign = (a: string, b: string): number => (a < b ? 1 : -1);

interface PositionedNode {
  id: string;
  x: number;
  y: number;
  size: NodeSize;
}

interface EdgeSegment {
  id: string;
  source: string;
  target: string;
  edgeType?: EREdgeModel["edgeType"];
  a: Point;
  b: Point;
}

interface LineSearchBudget {
  angleSteps: number;
  radiusSteps: number;
}

const boundaryPoint = (record: PositionedNode, target: Point): Point => {
  const dx = target.x - record.x;
  const dy = target.y - record.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return { x: record.x, y: record.y };
  const ux = dx / len;
  const uy = dy / len;
  const halfW = record.size.width / 2;
  const halfH = record.size.height / 2;
  const sx = Math.abs(ux) > 1e-9 ? halfW / Math.abs(ux) : Infinity;
  const sy = Math.abs(uy) > 1e-9 ? halfH / Math.abs(uy) : Infinity;
  const extent = Math.min(sx, sy);
  return { x: record.x + ux * extent, y: record.y + uy * extent };
};

const makeRecord = (
  node: ERNodeModel,
  positions: Map<string, Point>,
  sizes: Map<string, NodeSize>,
): PositionedNode => {
  const point = positions.get(node.id) ?? positionOf(node);
  return {
    id: node.id,
    x: point.x,
    y: point.y,
    size: sizes.get(node.id) ?? fallbackSize(node),
  };
};

const segmentForEdge = (
  edge: EREdgeModel,
  nodeById: Map<string, ERNodeModel>,
  positions: Map<string, Point>,
  sizes: Map<string, NodeSize>,
): EdgeSegment | null => {
  const source = nodeById.get(edge.source);
  const target = nodeById.get(edge.target);
  if (!source || !target) return null;
  const s = makeRecord(source, positions, sizes);
  const t = makeRecord(target, positions, sizes);
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    edgeType: edge.edgeType,
    a: boundaryPoint(s, { x: t.x, y: t.y }),
    b: boundaryPoint(t, { x: s.x, y: s.y }),
  };
};

const isRelationshipEdgeSegment = (edge: EdgeSegment): boolean =>
  edge.edgeType === "entity-relationship" || edge.edgeType === "relationship-entity";

const edgeTouches = (edge: EdgeSegment, id: string): boolean =>
  edge.source === id || edge.target === id;

const edgeTouchesAny = (edge: EdgeSegment, ids: Iterable<string>): boolean => {
  for (const id of ids) {
    if (edgeTouches(edge, id)) return true;
  }
  return false;
};

const connectorForAttribute = (
  entity: ERNodeModel,
  attribute: ERNodeModel,
  point: Point,
  positions: Map<string, Point>,
  sizes: Map<string, NodeSize>,
): EdgeSegment => {
  const entityRecord = makeRecord(entity, positions, sizes);
  const attrRecord: PositionedNode = {
    id: attribute.id,
    x: point.x,
    y: point.y,
    size: sizes.get(attribute.id) ?? fallbackSize(attribute),
  };
  return {
    id: `connector:${entity.id}:${attribute.id}`,
    source: entity.id,
    target: attribute.id,
    edgeType: "entity-attribute",
    a: boundaryPoint(entityRecord, point),
    b: boundaryPoint(attrRecord, { x: entityRecord.x, y: entityRecord.y }),
  };
};

const minAttributeRadius = (
  entity: ERNodeModel,
  attribute: ERNodeModel,
  angle: number,
  sizes: Map<string, NodeSize>,
  gap: number,
): number => {
  const entitySize = sizes.get(entity.id) ?? fallbackSize(entity);
  const attrSize = sizes.get(attribute.id) ?? fallbackSize(attribute);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const entityHalfW = entitySize.width / 2;
  const entityHalfH = entitySize.height / 2;
  const attrHalfW = attrSize.width / 2;
  const attrHalfH = attrSize.height / 2;
  const entityExtent = Math.min(
    Math.abs(ux) > 1e-9 ? entityHalfW / Math.abs(ux) : Infinity,
    Math.abs(uy) > 1e-9 ? entityHalfH / Math.abs(uy) : Infinity,
  );
  const attrExtent = Math.min(
    Math.abs(ux) > 1e-9 ? attrHalfW / Math.abs(ux) : Infinity,
    Math.abs(uy) > 1e-9 ? attrHalfH / Math.abs(uy) : Infinity,
  );
  return entityExtent + attrExtent + gap;
};

function expandMovableIdsForLineIncidents(
  nodes: ERNodeModel[],
  edges: EREdgeModel[],
  positions: Map<string, Point>,
  sizes: Map<string, NodeSize>,
  movableIds: Set<string>,
): void {
  if (!edges.length || !movableIds.size) return;

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeSegments = edges
    .map((edge) => segmentForEdge(edge, nodeById, positions, sizes))
    .filter((edge): edge is EdgeSegment => !!edge);
  const movableEdgeSegments = edgeSegments.filter((edge) => edgeTouchesAny(edge, movableIds));
  if (!movableEdgeSegments.length) return;

  nodes.forEach((node) => {
    if (node.nodeType !== "attribute" || typeof node.parentEntity !== "string") return;
    if (movableIds.has(node.id)) return;
    const entity = nodeById.get(node.parentEntity);
    if (!entity) return;
    const point = positions.get(node.id) ?? positionOf(node);
    const attrSize = sizes.get(node.id) ?? fallbackSize(node);
    const connector = connectorForAttribute(entity, node, point, positions, sizes);

    for (const edge of movableEdgeSegments) {
      if (edgeTouches(edge, node.id)) continue;
      if (segmentHitsBox(edge.a, edge.b, point, attrSize, 1)) {
        movableIds.add(node.id);
        return;
      }
      if (
        !edgeTouches(edge, entity.id) &&
        segmentsIntersect(connector.a, connector.b, edge.a, edge.b)
      ) {
        movableIds.add(node.id);
        return;
      }
    }
  });
}

/**
 * Shared indexed geometry for the line-avoidance phases.
 *
 * Nodes and edge segments live in spatial grids so clearance checks only
 * inspect nearby items; when a node moves, only the segments touching that
 * node are recomputed (incremental update instead of full rebuilds inside
 * every per-node loop iteration).
 */
class AvoidanceIndex {
  readonly nodeById: Map<string, ERNodeModel>;
  readonly nodeGrid: SpatialGrid<string>;
  readonly segGrid: SpatialGrid<number>;
  readonly segments: (EdgeSegment | null)[] = [];
  private readonly segmentsByNode = new Map<string, number[]>();
  private readonly edges: EREdgeModel[];

  constructor(
    readonly nodes: ERNodeModel[],
    edges: EREdgeModel[],
    readonly positions: Map<string, Point>,
    readonly sizes: Map<string, NodeSize>,
    cellSize: number,
  ) {
    this.edges = edges;
    this.nodeById = new Map(nodes.map((node) => [node.id, node]));
    this.nodeGrid = new SpatialGrid<string>(cellSize);
    this.segGrid = new SpatialGrid<number>(cellSize);

    nodes.forEach((node) => this.insertNode(node.id));
    edges.forEach((edge, index) => {
      this.segments.push(null);
      this.registerSegmentOwner(edge.source, index);
      this.registerSegmentOwner(edge.target, index);
      this.refreshSegment(index);
    });
  }

  private registerSegmentOwner(nodeId: string, index: number): void {
    let list = this.segmentsByNode.get(nodeId);
    if (!list) {
      list = [];
      this.segmentsByNode.set(nodeId, list);
    }
    list.push(index);
  }

  private insertNode(id: string): void {
    const node = this.nodeById.get(id);
    if (!node) return;
    const point = this.positions.get(id) ?? positionOf(node);
    const size = this.sizes.get(id) ?? fallbackSize(node);
    this.nodeGrid.insert(id, {
      minX: point.x - size.width / 2,
      minY: point.y - size.height / 2,
      maxX: point.x + size.width / 2,
      maxY: point.y + size.height / 2,
    });
  }

  private refreshSegment(index: number): void {
    const segment = segmentForEdge(this.edges[index], this.nodeById, this.positions, this.sizes);
    this.segments[index] = segment;
    if (!segment) {
      this.segGrid.remove(index);
      return;
    }
    this.segGrid.insert(index, {
      minX: Math.min(segment.a.x, segment.b.x),
      minY: Math.min(segment.a.y, segment.b.y),
      maxX: Math.max(segment.a.x, segment.b.x),
      maxY: Math.max(segment.a.y, segment.b.y),
    });
  }

  /** Move one node and incrementally refresh only the segments that touch it. */
  moveNode(id: string, point: Point): void {
    this.positions.set(id, point);
    this.insertNode(id);
    const touching = this.segmentsByNode.get(id);
    if (touching) touching.forEach((index) => this.refreshSegment(index));
  }

  edgesTouching(id: string): EdgeSegment[] {
    const indices = this.segmentsByNode.get(id);
    if (!indices) return [];
    return indices
      .map((index) => this.segments[index])
      .filter((segment): segment is EdgeSegment => !!segment);
  }

  forEachNodeNearRect(
    point: Point,
    size: NodeSize,
    pad: number,
    cb: (node: ERNodeModel) => boolean | void,
  ): void {
    this.nodeGrid.queryRect(
      {
        minX: point.x - size.width / 2,
        minY: point.y - size.height / 2,
        maxX: point.x + size.width / 2,
        maxY: point.y + size.height / 2,
      },
      pad,
      (id) => {
        const node = this.nodeById.get(id);
        if (!node) return;
        return cb(node);
      },
    );
  }

  forEachNodeNearSegment(
    a: Point,
    b: Point,
    pad: number,
    cb: (node: ERNodeModel) => boolean | void,
  ): void {
    this.nodeGrid.querySegment(a, b, pad, (id) => {
      const node = this.nodeById.get(id);
      if (!node) return;
      return cb(node);
    });
  }

  forEachSegmentNearRect(
    point: Point,
    size: NodeSize,
    pad: number,
    cb: (segment: EdgeSegment) => boolean | void,
  ): void {
    this.segGrid.queryRect(
      {
        minX: point.x - size.width / 2,
        minY: point.y - size.height / 2,
        maxX: point.x + size.width / 2,
        maxY: point.y + size.height / 2,
      },
      pad,
      (index) => {
        const segment = this.segments[index];
        if (!segment) return;
        return cb(segment);
      },
    );
  }

  forEachSegmentNearSegment(
    a: Point,
    b: Point,
    pad: number,
    cb: (segment: EdgeSegment) => boolean | void,
  ): void {
    this.segGrid.querySegment(a, b, pad, (index) => {
      const segment = this.segments[index];
      if (!segment) return;
      return cb(segment);
    });
  }
}

function applyAttributeLineAvoidance(
  index: AvoidanceIndex,
  margin: number,
  sizeScale: number,
  movableIds?: ReadonlySet<string>,
  searchBudget: LineSearchBudget = { angleSteps: 24, radiusSteps: 32 },
): void {
  const { nodeById, positions, sizes } = index;
  const attributes = index.nodes
    .filter(
      (node) =>
        node.nodeType === "attribute" &&
        typeof node.parentEntity === "string" &&
        (!movableIds || movableIds.has(node.id)),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!attributes.length) return;

  const placementIsClear = (attribute: ERNodeModel, entity: ERNodeModel, point: Point): boolean => {
    const attrSize = sizes.get(attribute.id) ?? fallbackSize(attribute);
    const connector = connectorForAttribute(entity, attribute, point, positions, sizes);

    let blocked = false;
    index.forEachNodeNearRect(point, attrSize, margin + 2, (other) => {
      if (other.id === attribute.id) return;
      const otherPoint = positions.get(other.id) ?? positionOf(other);
      const otherSize = sizes.get(other.id) ?? fallbackSize(other);
      if (boxesOverlap(point, attrSize, otherPoint, otherSize, margin)) {
        blocked = true;
        return true;
      }
    });
    if (blocked) return false;

    index.forEachNodeNearSegment(connector.a, connector.b, 2, (other) => {
      if (other.id === attribute.id || other.id === entity.id) return;
      const otherPoint = positions.get(other.id) ?? positionOf(other);
      const otherSize = sizes.get(other.id) ?? fallbackSize(other);
      if (segmentHitsBox(connector.a, connector.b, otherPoint, otherSize, 1)) {
        blocked = true;
        return true;
      }
    });
    if (blocked) return false;

    index.forEachSegmentNearSegment(connector.a, connector.b, 2, (edge) => {
      if (!edgeTouches(edge, entity.id) && !edgeTouches(edge, attribute.id)) {
        if (segmentsIntersect(connector.a, connector.b, edge.a, edge.b)) {
          blocked = true;
          return true;
        }
      }
    });
    if (blocked) return false;

    index.forEachSegmentNearRect(point, attrSize, 2, (edge) => {
      if (!edgeTouches(edge, attribute.id)) {
        if (segmentHitsBox(edge.a, edge.b, point, attrSize, 1)) {
          blocked = true;
          return true;
        }
      }
    });
    return !blocked;
  };

  const nearestClearPoint = (attribute: ERNodeModel, entity: ERNodeModel): Point | null => {
    const entityPoint = positions.get(entity.id) ?? positionOf(entity);
    const current = positions.get(attribute.id) ?? positionOf(attribute);
    const dx = current.x - entityPoint.x;
    const dy = current.y - entityPoint.y;
    const currentRadius = Math.hypot(dx, dy);
    const baseAngle = currentRadius > 1e-6 ? Math.atan2(dy, dx) : 0;
    const baseRadius = Math.max(
      currentRadius,
      minAttributeRadius(entity, attribute, baseAngle, sizes, margin + 10 * sizeScale),
    );
    let best: { point: Point; score: number } | null = null;

    const consider = (angle: number, radius: number): void => {
      const minR = minAttributeRadius(entity, attribute, angle, sizes, margin + 10 * sizeScale);
      const r = Math.max(radius, minR);
      const point = {
        x: entityPoint.x + r * Math.cos(angle),
        y: entityPoint.y + r * Math.sin(angle),
      };
      if (!placementIsClear(attribute, entity, point)) return;
      const score = Math.hypot(point.x - current.x, point.y - current.y);
      if (!best || score < best.score) best = { point, score };
    };

    const angleDeltas = [0];
    const angleSteps = searchBudget.angleSteps;
    for (let step = 1; step <= angleSteps / 2; step++) {
      const delta = (step / angleSteps) * TAU;
      angleDeltas.push(delta, -delta);
    }

    const radiusOffsets = [0];
    const radiusStep = 8 * sizeScale;
    for (let step = 1; step <= searchBudget.radiusSteps; step++) {
      const offset = step * radiusStep;
      radiusOffsets.push(offset, -offset);
    }

    // Near-to-far: |angle deltas| grow monotonically, so once the incumbent
    // best is closer than any point reachable at the next angular offset the
    // remaining candidates cannot win and the search stops.
    for (const angleDelta of angleDeltas) {
      if (best) {
        const reachableLowerBound =
          currentRadius * Math.sin(Math.min(Math.abs(angleDelta), Math.PI / 2));
        if (best.score <= reachableLowerBound) break;
      }
      const angle = baseAngle + angleDelta;
      for (const radiusOffset of radiusOffsets) {
        consider(angle, baseRadius + radiusOffset);
        if (best && best.score <= radiusStep) return best.point;
      }
    }

    return best?.point ?? null;
  };

  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const attribute of attributes) {
      const entity = nodeById.get(String(attribute.parentEntity));
      if (!entity) continue;
      const current = positions.get(attribute.id) ?? positionOf(attribute);
      if (placementIsClear(attribute, entity, current)) continue;
      const target = nearestClearPoint(attribute, entity);
      if (!target) continue;
      index.moveNode(attribute.id, target);
      moved = true;
    }
    if (!moved) break;
  }
}

function applyRelationshipLineAvoidance(
  index: AvoidanceIndex,
  margin: number,
  sizeScale: number,
  movableIds?: ReadonlySet<string>,
  searchBudget: LineSearchBudget = { angleSteps: 24, radiusSteps: 32 },
): void {
  const { nodeById, positions, sizes } = index;
  const relationships = index.nodes
    .filter((node) => node.nodeType === "relationship" && (!movableIds || movableIds.has(node.id)))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!relationships.length) return;

  const attributes = index.nodes.filter(
    (node) => node.nodeType === "attribute" && typeof node.parentEntity === "string",
  );

  // Attribute connectors only depend on entity/attribute positions, which do
  // not change during this phase — build them once, outside the loop.
  const attributeConnectors = attributes
    .map((attribute) => {
      const entity = nodeById.get(String(attribute.parentEntity));
      if (!entity) return null;
      const point = positions.get(attribute.id) ?? positionOf(attribute);
      return connectorForAttribute(entity, attribute, point, positions, sizes);
    })
    .filter((edge): edge is EdgeSegment => !!edge);
  const connGrid = new SpatialGrid<EdgeSegment>(256 * sizeScale);
  attributeConnectors.forEach((connector) => {
    connGrid.insert(connector, {
      minX: Math.min(connector.a.x, connector.b.x),
      minY: Math.min(connector.a.y, connector.b.y),
      maxX: Math.max(connector.a.x, connector.b.x),
      maxY: Math.max(connector.a.y, connector.b.y),
    });
  });

  const projectSegment = (edge: EdgeSegment, relationshipId: string, point: Point): EdgeSegment => {
    const before = positions.get(relationshipId);
    positions.set(relationshipId, point);
    const projected = segmentForEdge(
      { id: edge.id, source: edge.source, target: edge.target, edgeType: edge.edgeType },
      nodeById,
      positions,
      sizes,
    );
    if (before) positions.set(relationshipId, before);
    else positions.delete(relationshipId);
    return projected ?? edge;
  };

  const placementIsClear = (relationship: ERNodeModel, point: Point): boolean => {
    const relSize = sizes.get(relationship.id) ?? fallbackSize(relationship);

    let blocked = false;
    index.forEachSegmentNearRect(point, relSize, 2, (edge) => {
      if (
        !edgeTouches(edge, relationship.id) &&
        segmentHitsBox(edge.a, edge.b, point, relSize, 1)
      ) {
        blocked = true;
        return true;
      }
    });
    if (blocked) return false;

    const touchingEdges = index
      .edgesTouching(relationship.id)
      .map((edge) => projectSegment(edge, relationship.id, point));

    for (const edge of touchingEdges) {
      if (isRelationshipEdgeSegment(edge)) {
        index.forEachNodeNearSegment(edge.a, edge.b, 2, (obstacle) => {
          if (obstacle.nodeType !== "entity" && obstacle.nodeType !== "relationship") return;
          if (edgeTouches(edge, obstacle.id)) return;
          const obstaclePoint =
            obstacle.id === relationship.id
              ? point
              : (positions.get(obstacle.id) ?? positionOf(obstacle));
          const obstacleSize = sizes.get(obstacle.id) ?? fallbackSize(obstacle);
          if (segmentHitsBox(edge.a, edge.b, obstaclePoint, obstacleSize, 1)) {
            blocked = true;
            return true;
          }
        });
        if (blocked) return false;

        index.forEachSegmentNearSegment(edge.a, edge.b, 2, (otherEdge) => {
          if (!isRelationshipEdgeSegment(otherEdge)) return;
          if (edgeTouchesAny(edge, [otherEdge.source, otherEdge.target])) return;
          if (segmentsIntersect(edge.a, edge.b, otherEdge.a, otherEdge.b)) {
            blocked = true;
            return true;
          }
        });
        if (blocked) return false;
      }

      index.forEachNodeNearSegment(edge.a, edge.b, 2, (attribute) => {
        if (attribute.nodeType !== "attribute" || typeof attribute.parentEntity !== "string")
          return;
        if (edgeTouches(edge, attribute.id)) return;
        const attrPoint = positions.get(attribute.id) ?? positionOf(attribute);
        const attrSize = sizes.get(attribute.id) ?? fallbackSize(attribute);
        if (segmentHitsBox(edge.a, edge.b, attrPoint, attrSize, 1)) {
          blocked = true;
          return true;
        }
      });
      if (blocked) return false;

      connGrid.querySegment(edge.a, edge.b, 2, (connector) => {
        if (edgeTouchesAny(connector, [edge.source, edge.target])) return;
        if (segmentsIntersect(edge.a, edge.b, connector.a, connector.b)) {
          blocked = true;
          return true;
        }
      });
      if (blocked) return false;
    }

    index.forEachNodeNearRect(point, relSize, margin + 2, (other) => {
      if (other.id === relationship.id) return;
      const otherPoint = positions.get(other.id) ?? positionOf(other);
      const otherSize = sizes.get(other.id) ?? fallbackSize(other);
      if (boxesOverlap(point, relSize, otherPoint, otherSize, margin)) {
        blocked = true;
        return true;
      }
    });
    return !blocked;
  };

  // Reference direction for tie-breaking: keep the diamond on the side of the
  // centroid of its connected nodes instead of always drifting toward 0 rad.
  const referenceAngleFor = (relationship: ERNodeModel, current: Point): number => {
    const touching = index.edgesTouching(relationship.id);
    if (!touching.length) return 0;
    let cx = 0;
    let cy = 0;
    let count = 0;
    touching.forEach((edge) => {
      const otherId = edge.source === relationship.id ? edge.target : edge.source;
      const other = nodeById.get(otherId);
      if (!other) return;
      const point = positions.get(otherId) ?? positionOf(other);
      cx += point.x;
      cy += point.y;
      count++;
    });
    if (!count) return 0;
    const dx = current.x - cx / count;
    const dy = current.y - cy / count;
    if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return 0;
    return Math.atan2(dy, dx);
  };

  const nearestClearPoint = (relationship: ERNodeModel): Point | null => {
    const current = positions.get(relationship.id) ?? positionOf(relationship);
    if (placementIsClear(relationship, current)) return current;

    const referenceAngle = referenceAngleFor(relationship, current);
    const angleSteps = searchBudget.angleSteps;
    for (let radiusStep = 1; radiusStep <= searchBudget.radiusSteps; radiusStep++) {
      const radius = radiusStep * 8 * sizeScale;
      let best: { point: Point; angleDelta: number } | null = null;
      for (let step = 0; step < angleSteps; step++) {
        const angle = (step / angleSteps) * TAU;
        const point = {
          x: current.x + radius * Math.cos(angle),
          y: current.y + radius * Math.sin(angle),
        };
        if (!placementIsClear(relationship, point)) continue;
        const delta = angleDistance(angle, referenceAngle);
        if (!best || delta < best.angleDelta) best = { point, angleDelta: delta };
      }
      if (best) return best.point;
    }

    return null;
  };

  for (let pass = 0; pass < 3; pass++) {
    let moved = false;

    for (const relationship of relationships) {
      const current = positions.get(relationship.id) ?? positionOf(relationship);
      if (placementIsClear(relationship, current)) continue;
      const target = nearestClearPoint(relationship);
      if (!target) continue;
      index.moveNode(relationship.id, target);
      moved = true;
    }

    if (!moved) break;
  }
}

export function computeAutoAvoidTargets(
  nodes: ERNodeModel[],
  sizeOf?: NodeSizeResolver,
  options: AutoAvoidOptions = {},
): Map<string, Point> {
  if (options.enabled === false) return new Map();

  const sizeScale = computeLayoutSizeScale(nodes, sizeOf);
  const margin = options.margin ?? 4 * sizeScale;
  const maxIterations = options.maxIterations ?? 120;
  const original = new Map(nodes.map((node) => [node.id, positionOf(node)]));
  const positions = new Map(Array.from(original, ([id, point]) => [id, { ...point }]));
  const sizes = new Map(nodes.map((node) => [node.id, safeSize(node, sizeOf)]));
  const movableIds = options.movableIds ? new Set(options.movableIds) : null;
  if (movableIds) {
    expandMovableIdsForLineIncidents(nodes, options.edges ?? [], positions, sizes, movableIds);
  }
  const canMove = (node: ERNodeModel): boolean =>
    movePriority(node) > 0 && (!movableIds || movableIds.has(node.id));

  // Entity/entity overlaps have no movable side in the priority model; the
  // fallback below still separates them (half push each) in full auto-avoid
  // mode so overlapping locked entities do not stay glued together forever.
  const forceMovedIds = new Set<string>();
  const allowEntityFallback = !movableIds;

  interface SeparationItem {
    id: string;
    node: ERNodeModel;
    pos: Point;
    size: NodeSize;
  }
  const items: SeparationItem[] = nodes.map((node) => ({
    id: node.id,
    node,
    pos: positions.get(node.id)!,
    size: sizes.get(node.id) ?? fallbackSize(node),
  }));

  let maxDim = 0;
  items.forEach((item) => {
    maxDim = Math.max(maxDim, item.size.width, item.size.height);
  });
  const cellSize = Math.max(64, maxDim + margin + 8);

  const processPair = (a: SeparationItem, b: SeparationItem): number => {
    const overlapX = (a.size.width + b.size.width) / 2 + margin - Math.abs(b.pos.x - a.pos.x);
    const overlapY = (a.size.height + b.size.height) / 2 + margin - Math.abs(b.pos.y - a.pos.y);
    if (overlapX <= 0 || overlapY <= 0) return 0;

    let aPriority = canMove(a.node) ? movePriority(a.node) : 0;
    let bPriority = canMove(b.node) ? movePriority(b.node) : 0;
    if (aPriority === 0 && bPriority === 0) {
      if (!allowEntityFallback || a.node.nodeType !== "entity" || b.node.nodeType !== "entity") {
        return 0;
      }
      // Locked entity pair: push both halves apart as a last resort.
      aPriority = 1;
      bPriority = 1;
      forceMovedIds.add(a.id);
      forceMovedIds.add(b.id);
    }

    let moveA = 0;
    let moveB = 0;
    if (aPriority > bPriority) moveA = 1;
    else if (bPriority > aPriority) moveB = 1;
    else {
      moveA = 0.5;
      moveB = 0.5;
    }

    const separateX = overlapX <= overlapY;
    const rawDelta = separateX ? b.pos.x - a.pos.x : b.pos.y - a.pos.y;
    const sign = Math.abs(rawDelta) > 1e-6 ? Math.sign(rawDelta) : deterministicSign(a.id, b.id);
    const amount = (separateX ? overlapX : overlapY) + 0.5 * sizeScale;

    if (separateX) {
      a.pos.x -= sign * amount * moveA;
      b.pos.x += sign * amount * moveB;
    } else {
      a.pos.y -= sign * amount * moveA;
      b.pos.y += sign * amount * moveB;
    }
    return amount;
  };

  const useGrid = nodes.length > GRID_SEPARATION_THRESHOLD;
  for (let iter = 0; iter < maxIterations; iter++) {
    let maxMove = 0;

    if (useGrid) {
      const grid = new Map<string, SeparationItem[]>();
      items.forEach((item) => {
        const cx = Math.floor(item.pos.x / cellSize);
        const cy = Math.floor(item.pos.y / cellSize);
        const key = cx + "," + cy;
        let bucket = grid.get(key);
        if (!bucket) {
          bucket = [];
          grid.set(key, bucket);
        }
        bucket.push(item);
      });
      items.forEach((item) => {
        const cx = Math.floor(item.pos.x / cellSize);
        const cy = Math.floor(item.pos.y / cellSize);
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const bucket = grid.get(cx + ox + "," + (cy + oy));
            if (!bucket) continue;
            for (let k = 0; k < bucket.length; k++) {
              const other = bucket[k];
              if (other.id <= item.id) continue;
              const amount = processPair(item, other);
              if (amount > maxMove) maxMove = amount;
            }
          }
        }
      });
    } else {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const amount = processPair(items[i], items[j]);
          if (amount > maxMove) maxMove = amount;
        }
      }
    }

    if (maxMove < 0.1) break;
  }

  const runLineAvoidance =
    options.avoidAttributeEdges !== false && nodes.length <= LINE_AVOIDANCE_NODE_LIMIT;
  if (runLineAvoidance) {
    // Budget adapts down with node count so large diagrams stay responsive.
    const scaleBudget = (base: number): number =>
      nodes.length > 160 ? Math.max(12, Math.floor(base / 2)) : base;
    const budget: LineSearchBudget = {
      angleSteps: scaleBudget(24),
      radiusSteps: scaleBudget(32),
    };

    const index = new AvoidanceIndex(
      nodes,
      options.edges ?? [],
      positions,
      sizes,
      Math.max(128, 256 * sizeScale),
    );
    applyAttributeLineAvoidance(index, margin, sizeScale, movableIds ?? undefined, budget);
    applyRelationshipLineAvoidance(index, margin, sizeScale, movableIds ?? undefined, budget);
    applyAttributeLineAvoidance(index, margin, sizeScale, movableIds ?? undefined, budget);
  }

  const targets = new Map<string, Point>();
  nodes.forEach((node) => {
    if (!canMove(node) && !forceMovedIds.has(node.id)) return;
    const before = original.get(node.id);
    const after = positions.get(node.id);
    if (!before || !after) return;
    if (Math.abs(before.x - after.x) < 1e-6 && Math.abs(before.y - after.y) < 1e-6) return;
    targets.set(node.id, { x: after.x, y: after.y });
  });
  return targets;
}
