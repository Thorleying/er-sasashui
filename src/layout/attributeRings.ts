import { measureNodeSize } from "../builder";
import type { EREdgeModel, ERNodeModel } from "../types";

const TAU = Math.PI * 2;

const normAngle = (a: number): number => {
  let x = a % TAU;
  if (x < 0) x += TAU;
  return x;
};

export interface AttributeRingState {
  nodes: ERNodeModel[];
  edges: EREdgeModel[];
}

// moderate: a single uniform ring per entity. This is the shared implementation
// used by the headless CLI and by the Web quick layout after skeleton stress.
export function placeAttributesModerate(state: AttributeRingState): void {
  const entById = new Map(state.nodes.filter((n) => n.nodeType === "entity").map((e) => [e.id, e]));
  const relById = new Map(
    state.nodes.filter((n) => n.nodeType === "relationship").map((r) => [r.id, r]),
  );

  const attrsByEntity = new Map<string, ERNodeModel[]>();
  state.nodes.forEach((n) => {
    if (
      n.nodeType === "attribute" &&
      typeof n.parentEntity === "string" &&
      entById.has(n.parentEntity)
    ) {
      if (!attrsByEntity.has(n.parentEntity)) attrsByEntity.set(n.parentEntity, []);
      attrsByEntity.get(n.parentEntity)!.push(n);
    }
  });

  const relAngles = new Map<string, number[]>();
  state.edges.forEach((e) => {
    if (e.edgeType !== "entity-relationship" && e.edgeType !== "relationship-entity") return;
    const entId = entById.has(e.source) ? e.source : entById.has(e.target) ? e.target : null;
    const relId = relById.has(e.source) ? e.source : relById.has(e.target) ? e.target : null;
    if (!entId || !relId) return;
    const en = entById.get(entId)!;
    const rn = relById.get(relId)!;
    const ang = normAngle(Math.atan2((rn.y ?? 0) - (en.y ?? 0), (rn.x ?? 0) - (en.x ?? 0)));
    if (!relAngles.has(entId)) relAngles.set(entId, []);
    relAngles.get(entId)!.push(ang);
  });

  const radiusOf = (m: ERNodeModel) => {
    const s = measureNodeSize(m);
    return Math.hypot(s.width, s.height) / 2;
  };

  interface Obstacle {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }
  const obstacles: Obstacle[] = [];
  state.nodes.forEach((n) => {
    if (n.nodeType === "entity" || n.nodeType === "relationship") {
      const s = measureNodeSize(n);
      obstacles.push({ id: n.id, x: n.x ?? 0, y: n.y ?? 0, w: s.width, h: s.height });
    }
  });
  const hits = (x: number, y: number, w: number, h: number, skipId: string) =>
    obstacles.some(
      (o) =>
        o.id !== skipId &&
        Math.abs(x - o.x) < (w + o.w) / 2 - 2 &&
        Math.abs(y - o.y) < (h + o.h) / 2 - 2,
    );

  const centre = new Map<string, { x: number; y: number }>();
  state.nodes.forEach((n) => {
    if (n.nodeType === "entity" || n.nodeType === "relationship")
      centre.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
  });
  const relSegs: {
    s: { x: number; y: number };
    t: { x: number; y: number };
    a: string;
    b: string;
  }[] = [];
  state.edges.forEach((e) => {
    if (e.edgeType === "entity-relationship" || e.edgeType === "relationship-entity") {
      const s = centre.get(e.source);
      const t = centre.get(e.target);
      if (s && t) relSegs.push({ s, t, a: e.source, b: e.target });
    }
  });
  type P = { x: number; y: number };
  const properCross = (a1: P, a2: P, b1: P, b2: P) => {
    const eq = (p: P, q: P) => Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6;
    if (eq(a1, b1) || eq(a1, b2) || eq(a2, b1) || eq(a2, b2)) return false;
    const c = (o: P, p: P, q: P) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
    const d1 = c(b1, b2, a1);
    const d2 = c(b1, b2, a2);
    const d3 = c(a1, a2, b1);
    const d4 = c(a1, a2, b2);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };
  const connectorCrosses = (ex: number, ey: number, x: number, y: number, eid: string) =>
    relSegs.some(
      (seg) =>
        seg.a !== eid && seg.b !== eid && properCross({ x: ex, y: ey }, { x, y }, seg.s, seg.t),
    );
  const segHitsBox = (p1: P, p2: P, bx: number, by: number, bw: number, bh: number): boolean => {
    const minx = bx - bw / 2;
    const maxx = bx + bw / 2;
    const miny = by - bh / 2;
    const maxy = by + bh / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    let t0 = 0;
    let t1 = 1;
    const clip = (p: number, q: number): boolean => {
      if (p === 0) return q >= 0;
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
      return true;
    };
    return (
      clip(-dx, p1.x - minx) &&
      clip(dx, maxx - p1.x) &&
      clip(-dy, p1.y - miny) &&
      clip(dy, maxy - p1.y) &&
      t1 > t0
    );
  };
  const boxPierced = (x: number, y: number, w: number, h: number) =>
    relSegs.some((seg) => segHitsBox(seg.s, seg.t, x, y, w, h));

  const angleOf = (m: ERNodeModel, cx: number, cy: number) =>
    normAngle(Math.atan2((m.y ?? 0) - cy, (m.x ?? 0) - cx));

  const order = [...attrsByEntity.keys()].sort(
    (a, b) => (attrsByEntity.get(b)?.length ?? 0) - (attrsByEntity.get(a)?.length ?? 0),
  );

  order.forEach((eid) => {
    const attrs = attrsByEntity.get(eid)!;
    const ent = entById.get(eid)!;
    const ecx = ent.x ?? 0;
    const ecy = ent.y ?? 0;
    const entR = radiusOf(ent);
    const rels = relAngles.get(eid) ?? [];
    const gap = 8;

    const items = attrs.map((at) => {
      const s = measureNodeSize(at);
      return { at, s, half: Math.max(s.width, s.height) / 2 };
    });
    const n = items.length;
    const maxHalf = Math.max(...items.map((it) => it.half));

    const angWidth = (half: number, radius: number) =>
      2 * Math.asin(Math.min(0.999, (half + gap / 2) / radius));
    const angularSum = (radius: number) =>
      items.reduce((sum, it) => sum + angWidth(it.half, radius), 0);
    const radialMin = entR + maxHalf + gap;
    const target = TAU * 0.92;
    let lo = radialMin;
    let hi = radialMin;
    while (angularSum(hi) > target && hi < radialMin + 6000) hi *= 1.5;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (angularSum(mid) <= target) hi = mid;
      else lo = mid;
    }
    const ringR = hi;

    const ordered = items.slice().sort((a, b) => angleOf(a.at, ecx, ecy) - angleOf(b.at, ecx, ecy));
    const widths = ordered.map((it) => angWidth(it.half, ringR));
    const slack = Math.max(0, TAU - widths.reduce((sum, w) => sum + w, 0)) / Math.max(1, n);
    const baseAngles: number[] = [];
    let acc = 0;
    for (let i = 0; i < ordered.length; i++) {
      acc += slack / 2 + widths[i] / 2;
      baseAngles.push(acc);
      acc += widths[i] / 2 + slack / 2;
    }

    let phase = ordered.length ? angleOf(ordered[0].at, ecx, ecy) - baseAngles[0] : 0;
    if (rels.length) {
      const tries = 36;
      let best = -Infinity;
      for (let t = 0; t < tries; t++) {
        const ph = (t / tries) * TAU;
        let minGap = Infinity;
        for (const ba of baseAngles) {
          const slot = normAngle(ph + ba);
          for (const r of rels) {
            let d = Math.abs(slot - r);
            d = Math.min(d, TAU - d);
            if (d < minGap) minGap = d;
          }
        }
        if (minGap > best) {
          best = minGap;
          phase = ph;
        }
      }
    }

    ordered.forEach((it, i) => {
      const baseAng = phase + baseAngles[i];
      const win = widths[i] / 2 + slack;
      const offsets = [0];
      const slide = 10;
      for (let k = 1; k <= slide; k++) {
        const off = (k / slide) * win;
        offsets.push(off, -off);
      }
      let bx = ecx + ringR * Math.cos(baseAng);
      let by = ecy + ringR * Math.sin(baseAng);
      let placed = false;
      for (const off of offsets) {
        const a2 = baseAng + off;
        const x = ecx + ringR * Math.cos(a2);
        const y = ecy + ringR * Math.sin(a2);
        if (
          !hits(x, y, it.s.width, it.s.height, eid) &&
          !connectorCrosses(ecx, ecy, x, y, eid) &&
          !boxPierced(x, y, it.s.width, it.s.height)
        ) {
          bx = x;
          by = y;
          placed = true;
          break;
        }
      }
      if (!placed) {
        for (const off of offsets) {
          const a2 = baseAng + off;
          const x = ecx + ringR * Math.cos(a2);
          const y = ecy + ringR * Math.sin(a2);
          if (!hits(x, y, it.s.width, it.s.height, eid)) {
            bx = x;
            by = y;
            break;
          }
        }
      }
      it.at.x = bx;
      it.at.y = by;
      obstacles.push({ id: it.at.id, x: bx, y: by, w: it.s.width, h: it.s.height });
    });
  });

  const obById = new Map(obstacles.map((o) => [o.id, o]));
  state.nodes.forEach((at) => {
    if (at.nodeType !== "attribute" || typeof at.parentEntity !== "string") return;
    const ent = entById.get(at.parentEntity);
    if (!ent) return;
    const s = measureNodeSize(at);
    const cx = at.x ?? 0;
    const cy = at.y ?? 0;
    if (
      !boxPierced(cx, cy, s.width, s.height) &&
      !hits(cx, cy, s.width, s.height, at.id) &&
      !connectorCrosses(ent.x ?? 0, ent.y ?? 0, cx, cy, at.parentEntity)
    )
      return;
    const ecx = ent.x ?? 0;
    const ecy = ent.y ?? 0;
    const half = Math.max(s.width, s.height) / 2;
    const curR = Math.hypot(cx - ecx, cy - ecy) || radiusOf(ent) + half;
    const curAng = normAngle(Math.atan2(cy - ecy, cx - ecx));
    let best: { x: number; y: number; d: number } | null = null;
    const clearCandidate = (x: number, y: number): boolean =>
      !hits(x, y, s.width, s.height, at.id) &&
      !boxPierced(x, y, s.width, s.height) &&
      !connectorCrosses(ecx, ecy, x, y, at.parentEntity);
    const consider = (x: number, y: number): void => {
      if (!clearCandidate(x, y)) return;
      const d = Math.hypot(x - cx, y - cy);
      if (!best || d < best.d) best = { x, y, d };
    };

    const localStep = Math.max(6, Math.min(12, half / 4));
    const localMax = Math.max(220, half * 8);
    for (let r = localStep; r <= localMax; r += localStep) {
      const steps = Math.max(24, Math.ceil((TAU * r) / localStep));
      for (let k = 0; k < steps; k++) {
        const ang = (k / steps) * TAU;
        consider(cx + r * Math.cos(ang), cy + r * Math.sin(ang));
      }
      if (best && best.d + localStep < r) break;
    }

    for (let dr = 0; dr <= 8; dr++) {
      const r2 = curR + dr * (half * 0.6 + 6);
      const steps = Math.max(36, Math.round((TAU * r2) / (half + 6)));
      for (let k = 0; k < steps; k++) {
        const ang = curAng + (k / steps) * TAU;
        const x = ecx + r2 * Math.cos(ang);
        const y = ecy + r2 * Math.sin(ang);
        consider(x, y);
      }
    }
    if (best) {
      at.x = best.x;
      at.y = best.y;
      const ob = obById.get(at.id);
      if (ob) {
        ob.x = best.x;
        ob.y = best.y;
      }
    }
  });
}
