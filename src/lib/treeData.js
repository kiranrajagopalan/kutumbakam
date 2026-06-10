// Kutumbakam's own whole-family layout.
//
// (relatives-tree was evaluated and rejected: it renders an hourglass around
// one root — direct ancestors/descendants only — and drops collateral
// branches, which defeats "zoom out and see every branch". Verified again
// 10 Jun 2026: no maintained OSS library does whole-graph + collaterals +
// marriage cycles; the crossing-legibility techniques below are the industry
// ones — JointJS/draw.io-style jumps and gaps — implemented natively.)
//
// Layout: generation-layered.
//   1. BFS from the root assigns a generation to every reachable person
//      (parent edge = ±1, spouse/sibling edge = 0; first assignment wins, so
//      marriage cycles can't loop).
//   2. Same-generation couples merge into "units" — chains like
//      [wife1, person, wife2] for remarriage — so partners render adjacent.
//   3. Barycenter sweeps (children pull parents, parents pull children)
//      order each generation; units pack left-to-right without overlap,
//      keeping sibling blocks contiguous where cycles allow.
//   4. Connector geometry per union: a "bus" — drop from the couple, a
//      horizontal rail (lane-separated when same-generation rails overlap),
//      risers to each child (dashed = adoptive/step).
//   5. Crossing sweep: where a vertical (drop/riser) of one family passes
//      through another family's rail, the vertical jumps it with a hop arc
//      (style chosen by Kiran on sight, 10 Jun 2026 — over gap-style).
//
// The line grammar rendered from this:
//   rounded elbow = the line turns · dot = junction · hop = passes through
//
// Pure module — no Dexie, no DOM — testable and reusable.

export const NODE_W = 76;
export const NODE_H = 96;
export const SLOT_W = 92; // horizontal rhythm per person slot
export const ROW_H = 170; // vertical rhythm per generation
export const AVATAR_Y = 24; // avatar centre line within a node — lines join here
export const ELBOW_R = 7; // rounded corner radius: "this line turns"
export const HOP_R = 5; // radius of a jump arc: "passes through, not connected"
export const DOT_R = 2.25; // junction dot radius
const UNIT_GAP = 0.45; // gap between units, in slots
const SWEEPS = 4;
const EPS = 0.5;

export function layoutFamilyTree({ persons, unions, childLinks }, rootId, opts = {}) {
  const include = opts.include || new Set(persons.map((p) => p.id));
  const people = persons.filter((p) => include.has(p.id));
  if (!people.length) return null;
  const personIds = new Set(people.map((p) => p.id));
  if (!personIds.has(rootId)) rootId = people[0].id;
  const peopleById = new Map(people.map((p) => [p.id, p]));

  // ---- working copies of unions with placed partners/kids only ----
  const fams = [];
  const famById = new Map();
  for (const u of unions) {
    const partners = u.partnerIds.filter((id) => personIds.has(id));
    const fam = { id: u.id, createdAt: u.createdAt || 0, status: u.status || '', partners, kids: [] };
    fams.push(fam);
    famById.set(u.id, fam);
  }
  for (const l of childLinks) {
    const fam = famById.get(l.unionId);
    if (fam && personIds.has(l.childId)) fam.kids.push({ id: l.childId, rel: l.relation || '' });
  }

  // ---- adjacency: gen offsets ----
  const adj = new Map();
  const link = (a, b, d) => adj.set(a, [...(adj.get(a) || []), { id: b, d }]);
  for (const f of fams) {
    for (const a of f.partners) for (const b of f.partners) if (a !== b) link(a, b, 0);
    for (const c of f.kids) {
      for (const p of f.partners) {
        link(p, c.id, 1);
        link(c.id, p, -1);
      }
      for (const s of f.kids) if (s.id !== c.id) link(c.id, s.id, 0);
    }
  }

  // ---- 1. generations ----
  const gen = new Map([[rootId, 0]]);
  let queue = [rootId];
  while (queue.length) {
    const next = [];
    for (const id of queue) {
      for (const { id: nb, d } of adj.get(id) || []) {
        if (!gen.has(nb)) {
          gen.set(nb, gen.get(id) + d);
          next.push(nb);
        }
      }
    }
    queue = next;
  }
  const unplaced = people.filter((p) => !gen.has(p.id)).map((p) => p.id);
  const placedIds = [...gen.keys()];
  const minGen = Math.min(...gen.values());
  for (const id of placedIds) gen.set(id, gen.get(id) - minGen);
  const maxGen = Math.max(...gen.values());

  const famsOf = new Map(); // personId -> fams where partner
  for (const f of fams) {
    for (const p of f.partners) famsOf.set(p, [...(famsOf.get(p) || []), f]);
  }

  // ---- 2. couple units (chains) per generation ----
  const unitOf = new Map();
  const units = [];
  const sameGenPartners = (id) =>
    (famsOf.get(id) || [])
      .sort((a, b) => a.createdAt - b.createdAt)
      .flatMap((f) => f.partners.filter((x) => x !== id && gen.get(x) === gen.get(id)));

  for (const id of placedIds) {
    if (unitOf.has(id)) continue;
    const chain = [id];
    let grew = true;
    while (grew) {
      grew = false;
      for (const [end, push] of [
        [chain[0], (x) => chain.unshift(x)],
        [chain[chain.length - 1], (x) => chain.push(x)],
      ]) {
        const cand = sameGenPartners(end).find((x) => !chain.includes(x) && !unitOf.has(x));
        if (cand) {
          push(cand);
          grew = true;
        }
      }
    }
    const unit = { gen: gen.get(id), members: chain, x: 0 };
    chain.forEach((m) => unitOf.set(m, unit));
    units.push(unit);
  }
  const rows = Array.from({ length: maxGen + 1 }, () => []);
  for (const u of units) rows[u.gen].push(u);
  rows.forEach((row) => row.forEach((u, i) => (u.x = i * 4))); // initial spread

  const slotOf = (id) => {
    const u = unitOf.get(id);
    return u.x + u.members.indexOf(id) + 0.5;
  };
  const famAnchor = (f) => {
    const placed = f.partners.filter((p) => gen.has(p));
    if (placed.length) return placed.reduce((s, p) => s + slotOf(p), 0) / placed.length;
    const kids = f.kids.filter((k) => gen.has(k.id));
    if (!kids.length) return null;
    return kids.reduce((s, k) => s + slotOf(k.id), 0) / kids.length;
  };

  const parentFamOf = new Map(); // childId -> fam
  for (const f of fams) for (const c of f.kids) if (!parentFamOf.has(c.id)) parentFamOf.set(c.id, f);

  // Pull of a unit toward its members' parents (used by the down sweep, and
  // as the up-sweep fallback so childless units aren't flung outward).
  const parentPullOf = (u) => {
    const targets = [];
    u.members.forEach((m, i) => {
      const f = parentFamOf.get(m);
      if (!f) return;
      const a = famAnchor(f);
      if (a != null) targets.push(a - i - 0.5);
    });
    return targets.length ? targets.reduce((x, y) => x + y, 0) / targets.length : null;
  };

  // Pack sorted by a transitive composite key: half-slot-quantized desire,
  // then parent-family anchor (keeps sibling blocks contiguous), then birth
  // order within the block.
  const pack = (row) => {
    for (const u of row) {
      const f = parentFamOf.get(u.members[0]);
      const person = peopleById.get(u.members[0]);
      u._key = [
        Math.round(u.desired * 2) / 2,
        f ? famAnchor(f) ?? 9999 : 9999,
        person?.birthOrder ?? person?.birthYear ?? 0,
        u.members[0],
      ];
    }
    row.sort(
      (a, b) =>
        a._key[0] - b._key[0] ||
        a._key[1] - b._key[1] ||
        a._key[2] - b._key[2] ||
        (a._key[3] < b._key[3] ? -1 : 1),
    );
    let cur = -Infinity;
    for (const u of row) {
      u.x = Math.max(u.desired, cur + UNIT_GAP);
      cur = u.x + u.members.length;
    }
  };

  // ---- 3. barycenter sweeps ----
  for (let s = 0; s < SWEEPS; s++) {
    // down: children move under parents
    for (let g = 1; g <= maxGen; g++) {
      for (const u of rows[g]) u.desired = parentPullOf(u) ?? u.x;
      pack(rows[g]);
    }
    // up: parents move over children (childless units fall back to parents)
    for (let g = maxGen - 1; g >= 0; g--) {
      for (const u of rows[g]) {
        const targets = [];
        u.members.forEach((m, i) => {
          for (const f of famsOf.get(m) || []) {
            const kids = f.kids.filter((k) => gen.has(k.id));
            if (!kids.length) continue;
            const mid = kids.reduce((x, k) => x + slotOf(k.id), 0) / kids.length;
            targets.push(mid - i - 0.5);
          }
        });
        u.desired = targets.length
          ? targets.reduce((x, y) => x + y, 0) / targets.length
          : parentPullOf(u) ?? u.x;
      }
      pack(rows[g]);
    }
  }

  // ---- normalize + pixels ----
  let minSlot = Infinity;
  for (const u of units) minSlot = Math.min(minSlot, u.x);
  for (const u of units) u.x -= minSlot;

  const px = (slot) => slot * SLOT_W;
  const py = (g) => g * ROW_H;
  const nodes = [];
  for (const id of placedIds) {
    nodes.push({
      id,
      person: peopleById.get(id),
      x: px(slotOf(id)) - NODE_W / 2,
      y: py(gen.get(id)),
      cx: px(slotOf(id)),
      cy: py(gen.get(id)) + NODE_H / 2,
      gen: gen.get(id),
    });
  }
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // ---- 4. connectors ----
  const spouseLines = [];
  const extraMarriageLines = [];
  const busses = [];

  for (const f of fams) {
    const placedPartners = f.partners.filter((p) => gen.has(p));
    if (placedPartners.length === 2) {
      const [a, b] = placedPartners.map((p) => nodeById.get(p));
      const ua = unitOf.get(a.id);
      const adjacent =
        ua === unitOf.get(b.id) &&
        Math.abs(ua.members.indexOf(a.id) - ua.members.indexOf(b.id)) === 1;
      const line = {
        x1: a.cx, y1: a.y + AVATAR_Y,
        x2: b.cx, y2: b.y + AVATAR_Y,
        dashed: f.status === 'divorced',
        famId: f.id,
      };
      (adjacent ? spouseLines : extraMarriageLines).push(line);
    }
    const kids = f.kids
      .filter((k) => gen.has(k.id))
      .map((k) => ({ node: nodeById.get(k.id), rel: k.rel }));
    if (!kids.length) continue;
    const anchor = famAnchor(f);
    if (anchor == null) continue;
    const kidGen = Math.min(...kids.map((k) => k.node.gen));
    const xs = kids.map((k) => k.node.cx);
    const anchorX = px(anchor);
    busses.push({
      famId: f.id,
      kidGen,
      hasDrop: placedPartners.length > 0,
      dropX: anchorX,
      dropTopY: placedPartners.length ? py(kidGen - 1) + AVATAR_Y : 0, // patched to railY below
      railY: 0, // assigned in the lane pass below
      railX1: Math.min(...xs, ...(placedPartners.length ? [anchorX] : [])),
      railX2: Math.max(...xs, ...(placedPartners.length ? [anchorX] : [])),
      risers: kids.map((k) => ({
        x: k.node.cx,
        topY: k.node.y + AVATAR_Y,
        dashed: k.rel === 'adoptive' || k.rel === 'step',
      })),
      verticalHops: [], // foreign rails this bus's verticals jump over
    });
  }

  // Lane pass: families feeding the same generation whose rails overlap
  // horizontally would fuse into one line — push overlapping rails onto
  // separate lanes (12px apart, stacked upward into the gap).
  const byGen = new Map();
  for (const b of busses) byGen.set(b.kidGen, [...(byGen.get(b.kidGen) || []), b]);
  for (const [g, list] of byGen) {
    const base = py(g) - (ROW_H - NODE_H) / 2;
    list.sort((a, b) => a.railX1 - b.railX1);
    const laneEnds = [];
    for (const b of list) {
      let lane = 0;
      while (lane < laneEnds.length && b.railX1 < laneEnds[lane] + 16) lane++;
      laneEnds[lane] = b.railX2;
      b.railY = base - lane * 12;
      if (!b.hasDrop) b.dropTopY = b.railY;
    }
  }

  // Crossing sweep: verticals of one family × rails of another, same
  // generation band only (a vertical never reaches another band's rails).
  const crossings = [];
  for (const [, list] of byGen) {
    const verticals = [];
    for (const b of list) {
      if (b.hasDrop && b.railY - b.dropTopY > EPS) {
        verticals.push({ x: b.dropX, yTop: b.dropTopY, yBot: b.railY, famId: b.famId, kind: 'drop', bus: b });
      }
      for (const r of b.risers) {
        verticals.push({
          x: r.x,
          yTop: Math.min(b.railY, r.topY),
          yBot: Math.max(b.railY, r.topY),
          famId: b.famId,
          kind: 'riser',
          bus: b,
        });
      }
    }
    for (const b of list) {
      for (const v of verticals) {
        if (v.famId === b.famId) continue;
        if (
          v.x > b.railX1 + EPS &&
          v.x < b.railX2 - EPS &&
          b.railY > v.yTop + EPS &&
          b.railY < v.yBot - EPS
        ) {
          v.bus.verticalHops.push({ x: v.x, y: b.railY, hFamId: b.famId });
          crossings.push({ x: v.x, y: b.railY, vFamId: v.famId, hFamId: b.famId, vKind: v.kind });
        }
      }
    }
  }

  // famIndex: personId -> the unions that form their connector constellation
  // (drives tap-to-trace in the renderer).
  const famIndex = new Map();
  const fi = (id) => {
    if (!famIndex.has(id)) famIndex.set(id, { parentFams: [], ownFams: [] });
    return famIndex.get(id);
  };
  for (const f of fams) {
    for (const p of f.partners) fi(p).ownFams.push(f.id);
    for (const c of f.kids) fi(c.id).parentFams.push(f.id);
  }

  let maxX = 0;
  for (const n of nodes) maxX = Math.max(maxX, n.x + NODE_W);
  return {
    nodes,
    spouseLines,
    extraMarriageLines,
    busses,
    crossings,
    famIndex,
    size: { width: maxX + SLOT_W / 2, height: (maxGen + 1) * ROW_H },
    unplaced,
  };
}

// ---------------------------------------------------------------------------
// busPathData — turns one bus into SVG path data implementing the line
// grammar. Returns { solidD, dashedD, junctionXs }. Rails stay continuous;
// this bus's verticals jump foreign rails with hop arcs.
// ---------------------------------------------------------------------------

// Vertical run from (x, fromY) to (x, toY) — pen already at (x, fromY) —
// splicing hop arcs (bulging right) over the given crossing ys.
function vRun(x, fromY, toY, hopYs) {
  if (!hopYs?.length) return ` V ${toY}`;
  const down = toY > fromY;
  const ys = hopYs
    .filter((y) => y > Math.min(fromY, toY) + EPS && y < Math.max(fromY, toY) - EPS)
    .sort((a, b) => (down ? a - b : b - a));
  if (!ys.length) return ` V ${toY}`;
  // merge clusters closer than a hop diameter into one elongated jump
  const groups = [];
  for (const y of ys) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(y - g[g.length - 1]) < HOP_R * 2 + 1) g.push(y);
    else groups.push([y]);
  }
  let d = '';
  for (const g of groups) {
    const a = down ? g[0] - HOP_R : g[0] + HOP_R;
    const b = down ? g[g.length - 1] + HOP_R : g[g.length - 1] - HOP_R;
    const ry = Math.abs(b - a) / 2;
    d += ` V ${a} A ${HOP_R} ${ry} 0 0 ${down ? 1 : 0} ${x} ${b}`;
  }
  return `${d} V ${toY}`;
}

export function busPathData(bus) {
  const { railY, railX1: L, railX2: R } = bus;
  const W = R - L;
  const r = Math.min(ELBOW_R, W / 2);
  const hopYsAt = (x, yLo, yHi) =>
    bus.verticalHops.filter((h) => Math.abs(h.x - x) < EPS && h.y > yLo && h.y < yHi).map((h) => h.y);

  // Collect verticals; pair a drop with a riser at the same x into a
  // "through" vertical (straight line through the rail + junction dot).
  let verts = [];
  if (bus.hasDrop && railY - bus.dropTopY > EPS) {
    verts.push({ x: bus.dropX, kind: 'drop', yEnd: bus.dropTopY, dashed: false });
  }
  for (const ri of bus.risers) verts.push({ x: ri.x, kind: 'riser', yEnd: ri.topY, dashed: ri.dashed });
  const drop = verts.find((v) => v.kind === 'drop');
  if (drop) {
    const mate = verts.find((v) => v.kind === 'riser' && Math.abs(v.x - drop.x) < EPS);
    if (mate) {
      verts = verts.filter((v) => v !== drop && v !== mate);
      verts.push({ x: drop.x, kind: 'through', yTop: drop.yEnd, yBot: mate.yEnd, dashedBottom: mate.dashed });
    }
  }

  const solid = [];
  const dashed = [];
  const junctions = new Set();
  const dot = (x) => junctions.add(Math.round(x * 2) / 2);

  // Degenerate bus (zero-width rail): just vertical(s)
  if (W < EPS) {
    for (const v of verts) {
      if (v.kind === 'through') {
        const top = `M ${v.x} ${v.yTop}${vRun(v.x, v.yTop, railY, hopYsAt(v.x, v.yTop, railY))}`;
        const bottom = vRun(v.x, railY, v.yBot, hopYsAt(v.x, railY, v.yBot));
        if (v.dashedBottom) {
          solid.push(top);
          dashed.push(`M ${v.x} ${railY}${bottom}`);
          dot(v.x);
        } else {
          solid.push(top + bottom);
        }
      } else {
        const from = v.kind === 'drop' ? v.yEnd : railY;
        const to = v.kind === 'drop' ? railY : v.yEnd;
        const d = `M ${v.x} ${from}${vRun(v.x, from, to, hopYsAt(v.x, Math.min(from, to), Math.max(from, to)))}`;
        (v.dashed ? dashed : solid).push(d);
        if (v.dashed && verts.length > 1) dot(v.x);
      }
    }
    return finish();
  }

  // End terminals: solid non-through verticals sitting exactly at L / R get
  // rounded elbows into the rail; everything else is interior or square.
  const isEndable = (v, X) => Math.abs(v.x - X) < EPS && v.kind !== 'through' && !v.dashed;
  const leftEnd = verts.find((v) => isEndable(v, L));
  const rightEnd = verts.find((v) => v !== leftEnd && isEndable(v, R));
  const interior = verts.filter((v) => v !== leftEnd && v !== rightEnd);

  // Main run: left vertical → elbow → rail → elbow → right vertical
  let d = '';
  if (leftEnd) {
    const startY = leftEnd.yEnd;
    const elbowY = leftEnd.kind === 'riser' ? railY + r : railY - r;
    d += `M ${L} ${startY}${vRun(L, startY, elbowY, hopYsAt(L, Math.min(startY, elbowY), Math.max(startY, elbowY)))}`;
    d += ` Q ${L} ${railY} ${L + r} ${railY}`;
  } else {
    d += `M ${L} ${railY}`;
  }
  if (rightEnd) {
    d += ` H ${R - r}`;
    const elbowY = rightEnd.kind === 'riser' ? railY + r : railY - r;
    d += ` Q ${R} ${railY} ${R} ${elbowY}`;
    d += vRun(R, elbowY, rightEnd.yEnd, hopYsAt(R, Math.min(elbowY, rightEnd.yEnd), Math.max(elbowY, rightEnd.yEnd)));
  } else {
    d += ` H ${R}`;
  }
  solid.push(d);

  // Interior + demoted verticals (own subpaths; dots mark the junctions)
  for (const v of interior) {
    if (v.kind === 'through') {
      const top = `M ${v.x} ${v.yTop}${vRun(v.x, v.yTop, railY, hopYsAt(v.x, v.yTop, railY))}`;
      const bottom = vRun(v.x, railY, v.yBot, hopYsAt(v.x, railY, v.yBot));
      if (v.dashedBottom) {
        solid.push(top);
        dashed.push(`M ${v.x} ${railY}${bottom}`);
      } else {
        solid.push(top + bottom);
      }
      dot(v.x);
    } else if (v.kind === 'drop') {
      solid.push(`M ${v.x} ${v.yEnd}${vRun(v.x, v.yEnd, railY, hopYsAt(v.x, v.yEnd, railY))}`);
      dot(v.x);
    } else {
      const run = `M ${v.x} ${railY}${vRun(v.x, railY, v.yEnd, hopYsAt(v.x, railY, v.yEnd))}`;
      (v.dashed ? dashed : solid).push(run);
      dot(v.x);
    }
  }

  return finish();

  function finish() {
    return {
      solidD: solid.join(' '),
      dashedD: dashed.length ? dashed.join(' ') : null,
      junctionXs: [...junctions],
    };
  }
}
