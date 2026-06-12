// Geometry for the relationship path schematic — the visual snapshot of one
// chain (decided 12 Jun 2026, option B): only the people on the path,
// vertical position = generation, drawn in the line grammar. Pure layout —
// consumed by the SVG diagram (Relation section) and the canvas share card.
//
// Column/row rules: parent and child steps move a generation and stack in
// the same column; spouse and sibling steps advance a column. A vertical
// step that REVERSES the previous vertical direction (e.g. "adoptive
// father's son", which sibling-collapse leaves spelled out) also advances a
// column so it never lands back on an occupied cell.

export const AV_R = 16; // avatar radius
const COL_W = 96;
const ROW_H = 78;
const BRIDGE_H = 18; // sibling ∩ rises this far above the avatars
const ELBOW = 8;
const PAD_X = 52; // room for labels overhanging the end columns
const LABEL_H = 30; // name + step word under each avatar

export function layoutRelationPath(trail) {
  if (!trail || trail.length < 2) return null;

  let col = 0;
  let gen = 0;
  let prevDir = null; // 'up' | 'down' | null
  const cells = [{ id: trail[0].id, col, gen, word: null }];
  for (let i = 1; i < trail.length; i++) {
    const t = trail[i];
    if (t.kind === 'parent') {
      if (prevDir === 'down') col += 1;
      gen -= 1;
      prevDir = 'up';
    } else if (t.kind === 'child') {
      if (prevDir === 'up') col += 1;
      gen += 1;
      prevDir = 'down';
    } else {
      col += 1;
      prevDir = null;
    }
    cells.push({ id: t.id, col, gen, word: t.word, kind: t.kind, dashed: !!t.dashed, former: !!t.former });
  }

  const genMin = Math.min(...cells.map((c) => c.gen));
  const genMax = Math.max(...cells.map((c) => c.gen));
  const topBridge = cells.some((c, i) => i > 0 && c.kind === 'sibling' && c.gen === genMin);
  const topPad = AV_R + 4 + (topBridge ? BRIDGE_H + 4 : 0);

  const nodes = cells.map((c) => ({
    id: c.id,
    word: c.word,
    x: PAD_X + c.col * COL_W,
    y: topPad + (c.gen - genMin) * ROW_H,
  }));

  const links = [];
  for (let i = 1; i < cells.length; i++) {
    const a = nodes[i - 1];
    const b = nodes[i];
    const { kind, dashed, former } = cells[i];
    if (kind === 'spouse') {
      links.push({
        kind,
        dashed: dashed || former,
        former,
        d: `M ${a.x + AV_R} ${a.y} L ${b.x - AV_R} ${b.y}`,
        heart: { x: (a.x + b.x) / 2, y: a.y },
      });
    } else if (kind === 'sibling') {
      const by = a.y - AV_R - BRIDGE_H;
      links.push({
        kind,
        dashed,
        d:
          `M ${a.x} ${a.y - AV_R} L ${a.x} ${by + ELBOW} Q ${a.x} ${by} ${a.x + ELBOW} ${by} ` +
          `L ${b.x - ELBOW} ${by} Q ${b.x} ${by} ${b.x} ${by + ELBOW} L ${b.x} ${b.y - AV_R}`,
        dot: { x: (a.x + b.x) / 2, y: by },
      });
    } else if (a.x === b.x) {
      // straight riser/drop between generations
      const [y1, y2] = a.y < b.y ? [a.y + AV_R, b.y - AV_R] : [a.y - AV_R, b.y + AV_R];
      links.push({ kind, dashed, d: `M ${a.x} ${y1} L ${a.x} ${y2}` });
    } else {
      // direction-reversal vertical: down/up then a rounded elbow across
      const dirY = b.y > a.y ? 1 : -1;
      const dirX = b.x > a.x ? 1 : -1;
      links.push({
        kind,
        dashed,
        d:
          `M ${a.x} ${a.y + dirY * AV_R} L ${a.x} ${b.y - dirY * ELBOW} ` +
          `Q ${a.x} ${b.y} ${a.x + dirX * ELBOW} ${b.y} L ${b.x - dirX * AV_R} ${b.y}`,
      });
    }
  }

  return {
    nodes,
    links,
    width: PAD_X * 2 + (Math.max(...cells.map((c) => c.col)) || 0) * COL_W,
    height: topPad + (genMax - genMin) * ROW_H + AV_R + LABEL_H,
  };
}
