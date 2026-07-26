import type { EREdgeModel, ERNodeModel } from "../types";
import { computeLayoutSizeScale } from "./sizeAwareGeometry";
import {
  TAU,
  boxesOverlap,
  diamondBoundary,
  normalizeAngle,
  rectBoundary,
  safeNodeSize,
  segmentHitsBox,
} from "../layout/geometry";

export interface Point {
  x: number;
  y: number;
}

export interface NodeSize {
  width: number;
  height: number;
}

export type NodeSizeResolver = (node: ERNodeModel) => NodeSize;
export type NodeStartPositions = ReadonlyMap<string, Point>;

export interface RelationshipSyncResult {
  relationshipTargets: Map<string, Point>;
  affectedEntityIds: Set<string>;
}

const positionOf = (node: ERNodeModel): Point => ({
  x: typeof node.x === "number" ? node.x : 0,
  y: typeof node.y === "number" ? node.y : 0,
});

const safeSize = (node: ERNodeModel, sizeOf?: NodeSizeResolver): NodeSize =>
  safeNodeSize(node, sizeOf?.(node));

const centerDistance = (a: ERNodeModel, b: ERNodeModel): number => {
  const pa = positionOf(a);
  const pb = positionOf(b);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
};

const startPositionOf = (
  startPositions: NodeStartPositions | undefined,
  node: ERNodeModel,
): Point | null => {
  if (!startPositions) return null;
  const point = startPositions.get(node.id);
  if (!point) return null;
  return {
    x: typeof point.x === "number" ? point.x : positionOf(node).x,
    y: typeof point.y === "number" ? point.y : positionOf(node).y,
  };
};

/**
 * Build the relationship-id → entity-ids adjacency in one pass over the edge
 * list (previously every relationship re-scanned every edge, O(R×E)).
 */
function buildRelationshipEntityAdjacency(
  nodeById: Map<string, ERNodeModel>,
  edges: EREdgeModel[],
): Map<string, string[]> {
  const byRelationship = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    if (edge.edgeType !== "entity-relationship" && edge.edgeType !== "relationship-entity") {
      return;
    }
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) return;
    const register = (relId: string, entityId: string) => {
      if (!byRelationship.has(relId)) byRelationship.set(relId, new Set());
      byRelationship.get(relId)!.add(entityId);
    };
    if (source.nodeType === "relationship" && target.nodeType === "entity") {
      register(source.id, target.id);
    }
    if (target.nodeType === "relationship" && source.nodeType === "entity") {
      register(target.id, source.id);
    }
  });
  const result = new Map<string, string[]>();
  byRelationship.forEach((ids, relId) => result.set(relId, [...ids]));
  return result;
}

function relationshipEdgeSegment(
  entity: ERNodeModel,
  relationship: ERNodeModel,
  sizeOf?: NodeSizeResolver,
): { a: Point; b: Point } {
  const entityPos = positionOf(entity);
  const relationshipPos = positionOf(relationship);
  const dx = relationshipPos.x - entityPos.x;
  const dy = relationshipPos.y - entityPos.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const entitySize = safeSize(entity, sizeOf);
  const relationshipSize = safeSize(relationship, sizeOf);
  const entityBoundary = rectBoundary(entitySize.width / 2, entitySize.height / 2, ux, uy);
  const relationshipBoundary = diamondBoundary(
    relationshipSize.width / 2,
    relationshipSize.height / 2,
    -ux,
    -uy,
  );

  return {
    a: {
      x: entityPos.x + ux * entityBoundary,
      y: entityPos.y + uy * entityBoundary,
    },
    b: {
      x: relationshipPos.x - ux * relationshipBoundary,
      y: relationshipPos.y - uy * relationshipBoundary,
    },
  };
}

function computeRelationshipAnchor(
  entityA: ERNodeModel,
  entityB: ERNodeModel,
  relationship: ERNodeModel,
  sizeOf?: NodeSizeResolver,
  sizeScale = 1,
): Point {
  const a = positionOf(entityA);
  const b = positionOf(entityB);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  const sizeA = safeSize(entityA, sizeOf);
  const sizeB = safeSize(entityB, sizeOf);
  const sizeR = safeSize(relationship, sizeOf);
  const aBoundary = rectBoundary(sizeA.width / 2, sizeA.height / 2, ux, uy);
  const bBoundary = rectBoundary(sizeB.width / 2, sizeB.height / 2, -ux, -uy);
  const relTowardA = diamondBoundary(sizeR.width / 2, sizeR.height / 2, -ux, -uy);
  const relTowardB = diamondBoundary(sizeR.width / 2, sizeR.height / 2, ux, uy);
  const free = dist - aBoundary - relTowardA - bBoundary - relTowardB;
  const minGap = 28 * sizeScale;
  const equalGap = Math.max(minGap, free / 2);
  const minFromA = aBoundary + relTowardA + minGap;
  const maxFromA = dist - bBoundary - relTowardB - minGap;
  const idealFromA = aBoundary + relTowardA + equalGap;
  const fromA = maxFromA > minFromA ? Math.min(Math.max(idealFromA, minFromA), maxFromA) : dist / 2;

  return {
    x: a.x + ux * fromA,
    y: a.y + uy * fromA,
  };
}

export function computeMovedEntityRelationshipTargets(
  nodes: ERNodeModel[],
  edges: EREdgeModel[],
  movedEntityIds: Iterable<string>,
  sizeOf?: NodeSizeResolver,
  startPositions?: NodeStartPositions,
): RelationshipSyncResult {
  const sizeScale = computeLayoutSizeScale(nodes, sizeOf);
  const movedIds = new Set(movedEntityIds);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const entityIdsByRelationship = buildRelationshipEntityAdjacency(nodeById, edges);
  const relationshipTargets = new Map<string, Point>();
  const affectedEntityIds = new Set<string>();

  nodes.forEach((relationship) => {
    if (relationship.nodeType !== "relationship") return;
    const entityIds = entityIdsByRelationship.get(relationship.id) ?? [];
    if (!entityIds.some((id) => movedIds.has(id))) return;

    if (entityIds.length === 1) {
      const entity = nodeById.get(entityIds[0]);
      const entityStart = entity ? startPositionOf(startPositions, entity) : null;
      const relStart = startPositionOf(startPositions, relationship);
      if (!entity || !entityStart || !relStart) return;
      const entityNow = positionOf(entity);
      relationshipTargets.set(relationship.id, {
        x: relStart.x + entityNow.x - entityStart.x,
        y: relStart.y + entityNow.y - entityStart.y,
      });
      affectedEntityIds.add(entity.id);
      return;
    }

    if (entityIds.length === 2) {
      const entityA = nodeById.get(entityIds[0]);
      const entityB = nodeById.get(entityIds[1]);
      if (!entityA || !entityB) return;
      relationshipTargets.set(
        relationship.id,
        computeRelationshipAnchor(entityA, entityB, relationship, sizeOf, sizeScale),
      );
      affectedEntityIds.add(entityA.id);
      affectedEntityIds.add(entityB.id);
      return;
    }

    // n 元关系（≥3 个实体）：菱形跟随相关实体的质心。
    const entities = entityIds
      .map((id) => nodeById.get(id))
      .filter((entity): entity is ERNodeModel => !!entity);
    if (entities.length < 3) return;
    let cx = 0;
    let cy = 0;
    entities.forEach((entity) => {
      const p = positionOf(entity);
      cx += p.x;
      cy += p.y;
    });
    relationshipTargets.set(relationship.id, {
      x: cx / entities.length,
      y: cy / entities.length,
    });
    entities.forEach((entity) => affectedEntityIds.add(entity.id));
  });

  return { relationshipTargets, affectedEntityIds };
}

export function applyNodePositionTargets(nodes: ERNodeModel[], targets: Map<string, Point>): void {
  if (!targets.size) return;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  targets.forEach((target, id) => {
    const node = nodeById.get(id);
    if (!node) return;
    node.x = target.x;
    node.y = target.y;
  });
}

export function computeAttributeRotationTargets(
  nodes: ERNodeModel[],
  edges: EREdgeModel[],
  entityIds: Iterable<string>,
  sizeOf?: NodeSizeResolver,
): Map<string, Point> {
  const sizeScale = computeLayoutSizeScale(nodes, sizeOf);
  const targets = new Map<string, Point>();
  const entityIdSet = new Set(entityIds);
  if (!entityIdSet.size) return targets;

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const relationshipIdsByEntity = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    if (edge.edgeType !== "entity-relationship" && edge.edgeType !== "relationship-entity") {
      return;
    }
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) return;
    const entity =
      source.nodeType === "entity" ? source : target.nodeType === "entity" ? target : null;
    const relationship =
      source.nodeType === "relationship"
        ? source
        : target.nodeType === "relationship"
          ? target
          : null;
    if (!entity || !relationship || !entityIdSet.has(entity.id)) return;
    if (!relationshipIdsByEntity.has(entity.id)) relationshipIdsByEntity.set(entity.id, new Set());
    relationshipIdsByEntity.get(entity.id)!.add(relationship.id);
  });

  const attrsByEntity = new Map<string, ERNodeModel[]>();
  nodes.forEach((node) => {
    if (
      node.nodeType === "attribute" &&
      typeof node.parentEntity === "string" &&
      entityIdSet.has(node.parentEntity)
    ) {
      if (!attrsByEntity.has(node.parentEntity)) attrsByEntity.set(node.parentEntity, []);
      attrsByEntity.get(node.parentEntity)!.push(node);
    }
  });

  const relationshipObstacles = nodes
    .filter((node) => node.nodeType === "relationship")
    .map((node) => ({ node, pos: positionOf(node), size: safeSize(node, sizeOf) }));
  const relationshipLineObstacles = edges
    .map((edge) => {
      if (edge.edgeType !== "entity-relationship" && edge.edgeType !== "relationship-entity") {
        return null;
      }
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) return null;
      const entity =
        source.nodeType === "entity" ? source : target.nodeType === "entity" ? target : null;
      const relationship =
        source.nodeType === "relationship"
          ? source
          : target.nodeType === "relationship"
            ? target
            : null;
      if (!entity || !relationship) return null;
      return {
        entityId: entity.id,
        relationshipId: relationship.id,
        ...relationshipEdgeSegment(entity, relationship, sizeOf),
      };
    })
    .filter(
      (
        obstacle,
      ): obstacle is {
        entityId: string;
        relationshipId: string;
        a: Point;
        b: Point;
      } => !!obstacle,
    );

  const attributeObstacles = nodes
    .filter((node) => node.nodeType === "attribute")
    .map((node) => ({
      node,
      pos: positionOf(node),
      size: safeSize(node, sizeOf),
    }));

  const pointFor = (entity: ERNodeModel, radius: number, angle: number): Point => {
    const c = positionOf(entity);
    return {
      x: c.x + radius * Math.cos(angle),
      y: c.y + radius * Math.sin(angle),
    };
  };

  const candidateOverlaps = (
    attr: ERNodeModel,
    point: Point,
    attrSize: NodeSize,
    relatedRelationshipIds: Set<string>,
  ): { hard: number; soft: number } => {
    let hard = 0;
    let soft = 0;
    relationshipObstacles.forEach((obstacle) => {
      const gap = relatedRelationshipIds.has(obstacle.node.id) ? 8 * sizeScale : 2 * sizeScale;
      if (boxesOverlap(point, attrSize, obstacle.pos, obstacle.size, gap)) hard++;
    });
    relationshipLineObstacles.forEach((obstacle) => {
      if (!relatedRelationshipIds.has(obstacle.relationshipId)) return;
      if (segmentHitsBox(obstacle.a, obstacle.b, point, attrSize, 1)) hard++;
    });
    attributeObstacles.forEach((obstacle) => {
      if (obstacle.node.id === attr.id) return;
      const target = targets.get(obstacle.node.id);
      const obstaclePos = target ?? obstacle.pos;
      if (boxesOverlap(point, attrSize, obstaclePos, obstacle.size, 4 * sizeScale)) soft++;
    });
    return { hard, soft };
  };

  entityIdSet.forEach((entityId) => {
    const entity = nodeById.get(entityId);
    if (!entity) return;
    const attrs = attrsByEntity.get(entityId) ?? [];
    const relatedRelationshipIds = relationshipIdsByEntity.get(entityId) ?? new Set<string>();
    if (!attrs.length || !relatedRelationshipIds.size) return;

    attrs.forEach((attr) => {
      const center = positionOf(entity);
      const current = positionOf(attr);
      const radius = centerDistance(entity, attr);
      if (radius < 1e-6) return;

      const attrSize = safeSize(attr, sizeOf);
      const currentScore = candidateOverlaps(attr, current, attrSize, relatedRelationshipIds);
      if (currentScore.hard === 0) return;

      const currentAngle = normalizeAngle(Math.atan2(current.y - center.y, current.x - center.x));
      let best: { point: Point; score: { hard: number; soft: number }; angleDelta: number } | null =
        null;
      const consider = (angleDelta: number): void => {
        const point = pointFor(entity, radius, currentAngle + angleDelta);
        const score = candidateOverlaps(attr, point, attrSize, relatedRelationshipIds);
        if (
          !best ||
          score.hard < best.score.hard ||
          (score.hard === best.score.hard && score.soft < best.score.soft) ||
          (score.hard === best.score.hard &&
            score.soft === best.score.soft &&
            Math.abs(angleDelta) < Math.abs(best.angleDelta))
        ) {
          best = { point, score, angleDelta };
        }
      };

      consider(0);
      const STEPS = 72;
      for (let step = 1; step <= STEPS / 2; step++) {
        const delta = (step / STEPS) * TAU;
        consider(delta);
        consider(-delta);
        if (best?.score.hard === 0 && best.score.soft === 0) break;
      }

      if (!best || (best.score.hard >= currentScore.hard && best.score.soft >= currentScore.soft)) {
        return;
      }
      targets.set(attr.id, best.point);
    });
  });

  return targets;
}
