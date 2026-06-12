// Renders the "how are we related" share card — a 1080×1080 paper & ink
// image of names + chain, nothing else. No contact info can appear here by
// construction: the renderer only ever receives names and chain text.
//
// Synchronous on purpose (toDataURL, no awaits) so navigator.share() can be
// called inside the original tap gesture — Safari drops share sheets that
// arrive after an await.

// Literal copies of the paper & ink tokens (canvas can't read CSS vars
// reliably across contexts). Keep in sync with ../index.css / paper-ink.
const PAPER = '#f7f3ec';
const INK = '#221d18';
const INK_SOFT = '#6f6457';
const INK_FAINT = '#776c5d';
const LINE = '#e6ddd0';
const ACCENT = '#96402f';
const DISPLAY = '"Fraunces Variable", Georgia, serif';
const BODY = '"Albert Sans Variable", Arial, sans-serif';

const HEART_D =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

// Letterspaced caps — uses ctx.letterSpacing where the browser has it,
// per-character drawing where it doesn't (the canvas QA lesson).
function drawTracked(ctx, text, x, y, spacing) {
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(text, x, y);
    ctx.letterSpacing = '0px';
    return;
  }
  const total = ctx.measureText(text).width + spacing * (text.length - 1);
  let cx = x - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = align;
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const probe = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(probe).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = probe;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Draws the path schematic (layout from relationPath.js) at the given top
// edge, centred, scaled to fit. Tones + initials only — photos would need
// async image loads, and the card must stay synchronous. Returns the height
// it used. Pass measure=true to get the height without drawing.
function paintTrail(ctx, layout, meta, top, maxW, maxH, measure = false) {
  if (!layout || !meta) return 0;
  const s = Math.min(maxW / layout.width, maxH / layout.height, 2.4);
  if (!measure) {
    ctx.save();
    ctx.translate((1080 - layout.width * s) / 2, top);
    ctx.scale(s, s);
    ctx.lineCap = 'round';
    for (const l of layout.links) {
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1.8;
      ctx.setLineDash(l.dashed ? [4, 4] : []);
      ctx.stroke(new Path2D(l.d));
      ctx.setLineDash([]);
      if (l.dot) {
        ctx.fillStyle = ACCENT;
        ctx.beginPath();
        ctx.arc(l.dot.x, l.dot.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (l.heart) {
        ctx.fillStyle = PAPER;
        ctx.beginPath();
        ctx.arc(l.heart.x, l.heart.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(l.heart.x, l.heart.y);
        ctx.scale(0.46, 0.46);
        ctx.translate(-12, -12.2);
        const heart = new Path2D(HEART_D);
        if (l.former) {
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = 2.6;
          ctx.stroke(heart);
        } else {
          ctx.fillStyle = ACCENT;
          ctx.fill(heart);
        }
        ctx.restore();
      }
    }
    layout.nodes.forEach((n, i) => {
      const m = meta[i];
      if (!m) return;
      if (m.isSelf) {
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([2.5, 3.5]);
        ctx.beginPath();
        ctx.arc(n.x, n.y, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = m.bg;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = m.fg;
      ctx.font = `600 11px ${DISPLAY}`;
      ctx.fillText(m.initials, n.x, n.y + 4);
      ctx.font = `500 11.5px ${BODY}`;
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.strokeText(m.name, n.x, n.y + 29);
      ctx.fillStyle = INK;
      ctx.fillText(m.name, n.x, n.y + 29);
      if (m.word) {
        ctx.font = `400 10.5px ${BODY}`;
        ctx.strokeText(m.word, n.x, n.y + 41);
        ctx.fillStyle = INK_FAINT;
        ctx.fillText(m.word, n.x, n.y + 41);
      }
    });
    ctx.restore();
  }
  return layout.height * s;
}

export function renderRelationCard({
  targetName,
  anchorFirst,
  primaryBody,
  alsoBodies = [],
  trailLayout = null,
  trailMeta = null,
}) {
  const S = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  const cx = S / 2;
  const margin = 96;
  const maxW = S - margin * 2;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, S, S);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // heart + eyebrow
  ctx.save();
  ctx.translate(cx, 132);
  ctx.scale(1.9, 1.9);
  ctx.translate(-12, -12.2);
  ctx.fillStyle = ACCENT;
  ctx.fill(new Path2D(HEART_D));
  ctx.restore();

  ctx.fillStyle = INK_FAINT;
  ctx.font = `600 26px ${BODY}`;
  drawTracked(ctx, 'HOW ARE WE RELATED', cx, 216, 4);

  // target name — shrink to fit one line
  let nameSize = 96;
  ctx.font = `600 ${nameSize}px ${DISPLAY}`;
  while (ctx.measureText(targetName).width > maxW && nameSize > 48) {
    nameSize -= 4;
    ctx.font = `600 ${nameSize}px ${DISPLAY}`;
  }

  // chain — wrap, shrink if it would overflow the card
  const sentence = `${anchorFirst}’s ${primaryBody}.`;
  let chainSize = 46;
  let chainLines;
  for (;;) {
    ctx.font = `500 ${chainSize}px ${BODY}`;
    chainLines = wrap(ctx, sentence, maxW);
    if (chainLines.length <= 4 || chainSize <= 32) break;
    chainSize -= 3;
  }
  const chainLH = Math.round(chainSize * 1.4);

  const alsoSize = 29;
  const alsoLH = 44;
  const alsoLines = alsoBodies.slice(0, 2).flatMap((b) => {
    ctx.font = `400 ${alsoSize}px ${BODY}`;
    return wrap(ctx, `also ${anchorFirst}’s ${b}`, maxW);
  });

  // vertical centring of the middle block between eyebrow and footer —
  // the schematic (when present) sits between the name and the chain.
  const avail = S - 120 - 216;
  const textH =
    nameSize + 56 + chainLines.length * chainLH + (alsoLines.length ? 28 + alsoLines.length * alsoLH : 0);
  const trailH = trailLayout
    ? paintTrail(ctx, trailLayout, trailMeta, 0, 820, Math.max(140, avail - textH - 88), true)
    : 0;
  const blockH = textH + (trailH ? trailH + 44 : 0);
  let y = 216 + (avail - blockH) / 2 + nameSize;

  ctx.fillStyle = INK;
  ctx.font = `600 ${nameSize}px ${DISPLAY}`;
  ctx.fillText(targetName, cx, y);
  y += 12;

  if (trailH) {
    paintTrail(ctx, trailLayout, trailMeta, y + 20, 820, Math.max(140, avail - textH - 88));
    y += trailH + 44;
  } else {
    y += 44;
  }

  ctx.fillStyle = INK;
  ctx.font = `500 ${chainSize}px ${BODY}`;
  for (const line of chainLines) {
    y += chainLH;
    ctx.fillText(line, cx, y);
  }

  if (alsoLines.length) {
    y += 28;
    ctx.fillStyle = INK_SOFT;
    ctx.font = `400 ${alsoSize}px ${BODY}`;
    for (const line of alsoLines) {
      y += alsoLH;
      ctx.fillText(line, cx, y);
    }
  }

  // footer
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 90, S - 132);
  ctx.lineTo(cx + 90, S - 132);
  ctx.stroke();
  ctx.fillStyle = INK_FAINT;
  ctx.font = `600 30px ${DISPLAY}`;
  ctx.fillText('Kutumbakam', cx, S - 84);

  return canvas.toDataURL('image/png');
}

// dataURL → File, synchronously (keeps the share call inside the gesture).
export function dataUrlToFile(dataUrl, filename) {
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], filename, { type: 'image/png' });
}
