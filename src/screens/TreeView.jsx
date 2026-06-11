import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getTreeData } from '../db/repo.js';
import { layoutFamilyTree, busPathData, AVATAR_Y, DOT_R } from '../lib/treeData.js';
import { branchMembers, inLawClusters } from '../lib/kinship.js';
import { describeRelationship } from '../lib/relationship.js';
import { toneFor, initialsOf, mixHex } from '../lib/avatar.js';
import { photoUrlFor } from '../lib/photos.js';
import { lifeSpan } from '../lib/format.js';
import { ListGlyph, FitGlyph } from '../components/icons.jsx';
import Avatar from '../components/Avatar.jsx';
import { nav } from '../lib/router.js';

const AV_R = 23;
const KIN_LABEL = {
  blood: 'Bloodline',
  married: 'Married in',
  extended: 'Extended family',
  unconnected: 'Not yet connected',
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Literal copies of the paper/ink tokens: SVG fills are pre-blended to solid
// colors here (opacity-dimmed fills are translucent, which lets connector
// lines show through the avatar circle). Keep in sync with index.css @theme.
const PAPER = '#f7f3ec';
const INK = '#221d18';
const INK_SOFT = '#6f6457';
// De-emphasis must stay LEGIBLE: the avatar fades hard, but text only
// softens — equal fading made dim names vanish on phones ("empty circle"
// bug). Initials sit on an already-faded circle, so they fade least.
const DIM_AVATAR = 0.62;
const DIM_INITIALS = 0.35;
const DIM_TEXT = 0.38;

function TreeNode({ n, kin, selected, hint }) {
  const p = n.person;
  const tone = toneFor(p.id);
  const url = photoUrlFor(p);
  const dim = kin === 'extended' || kin === 'unconnected';
  // Dim and deceased both fade the avatar — compose the two into one solid blend.
  let t = dim ? DIM_AVATAR : 0;
  if (!p.isAlive) t = 1 - (1 - t) * 0.8;
  const tInitials = dim ? DIM_INITIALS : 0;
  const tText = dim ? DIM_TEXT : 0;
  const first = p.name.split(/\s+/)[0] || '·';
  const label = first.length > 11 ? `${first.slice(0, 10)}…` : first;
  const sub = hint || (p.birthYear ? `${p.birthApprox ? 'c. ' : ''}${p.birthYear}` : null);
  return (
    <g data-pid={p.id} transform={`translate(${n.cx} ${n.y})`} style={{ cursor: 'pointer' }}>
      {selected && (
        <circle cy={AVATAR_Y} r={AV_R + 5} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" />
      )}
      {p.isSelf && !selected && (
        <circle
          cy={AVATAR_Y}
          r={AV_R + 4}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          strokeDasharray="2.5 3.5"
        />
      )}
      {url ? (
        <>
          <image
            href={url}
            x={-AV_R}
            y={AVATAR_Y - AV_R}
            width={AV_R * 2}
            height={AV_R * 2}
            clipPath="url(#kutumbakam-av)"
            preserveAspectRatio="xMidYMid slice"
          />
          {t > 0 && <circle cy={AVATAR_Y} r={AV_R} fill={PAPER} fillOpacity={t} />}
        </>
      ) : (
        <>
          <circle cy={AVATAR_Y} r={AV_R} fill={mixHex(tone.bg, PAPER, t)} />
          <text
            y={AVATAR_Y}
            dy="0.36em"
            textAnchor="middle"
            fill={mixHex(tone.fg, PAPER, Math.max(tInitials, !p.isAlive ? 0.2 : 0))}
            fontSize="15"
            fontWeight="600"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {initialsOf(p.name)}
          </text>
        </>
      )}
      <text
        y={AVATAR_Y + AV_R + 17}
        textAnchor="middle"
        fill={mixHex(INK, PAPER, tText)}
        fontSize="12.5"
        fontWeight="500"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </text>
      {sub && (
        <text
          y={AVATAR_Y + AV_R + 32}
          textAnchor="middle"
          fill={mixHex(INK_SOFT, PAPER, tText)}
          fontSize="10.5"
          fontWeight="400"
          style={{ fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' }}
        >
          {sub}
        </text>
      )}
    </g>
  );
}

// A folded in-law family, rendered where it attaches. Tap to unfold.
function CapsuleNode({ cap }) {
  const text = `${cap.label} ▸ ${cap.count}`;
  const w = text.length * 6.2 + 26;
  return (
    <g data-capsule={cap.key} transform={`translate(${cap.x} ${cap.y})`} style={{ cursor: 'pointer' }}>
      <line x1="0" y1="13" x2="0" y2="27" stroke="var(--color-thread)" strokeWidth="1.5" strokeDasharray="3 3" />
      <rect x={-w / 2} y={-13} width={w} height={26} rx={13} fill="var(--color-card)" stroke="var(--color-line)" />
      <text textAnchor="middle" dy="0.34em" fill="var(--color-ink-soft)" style={{ font: '600 11px var(--font-body)' }}>
        {text}
      </text>
    </g>
  );
}

function Pill({ children, onClick, active, ariaLabel }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`pointer-events-auto flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold shadow-pop backdrop-blur transition-colors ${
        active
          ? 'border-accent bg-accent-soft/90 text-accent-deep'
          : 'border-line bg-card/90 text-ink-soft'
      }`}
    >
      {children}
    </button>
  );
}

export default function TreeView({ focusId = null }) {
  const data = useLiveQuery(() => getTreeData(), []);
  const [selectedId, setSelectedId] = useState(null);
  const [expandedCaps, setExpandedCaps] = useState(() => new Set());
  const [branchRootId, setBranchRootId] = useState(null);
  const wrapRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 0.8 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const expandedRef = useRef(expandedCaps);
  expandedRef.current = expandedCaps;
  const ptrs = useRef(new Map());
  const gesture = useRef({ moved: false, lastX: 0, lastY: 0, lastDist: 0, lastMid: null, downPid: null, downCap: null });
  const focusPending = useRef(null);

  const clusters = useMemo(() => (data?.classes ? inLawClusters(data, data.classes) : []), [data]);

  // What the layout includes: a branch, or everything minus folded in-law
  // families (undefined = everyone).
  const include = useMemo(() => {
    if (!data) return undefined;
    if (branchRootId) return branchMembers(data, branchRootId);
    const hidden = new Set();
    for (const c of clusters) {
      if (!expandedCaps.has(c.key)) for (const m of c.members) hidden.add(m);
    }
    if (!hidden.size) return undefined;
    return new Set(data.persons.filter((p) => !hidden.has(p.id)).map((p) => p.id));
  }, [data, branchRootId, clusters, expandedCaps]);

  const layout = useMemo(() => {
    if (!data || !data.persons.length) return null;
    const rootId = branchRootId || data.self?.id || data.persons[0].id;
    return layoutFamilyTree(data, rootId, include ? { include } : {});
  }, [data, include, branchRootId]);
  const layoutRef = useRef(null);
  layoutRef.current = layout;

  useEffect(() => {
    if (import.meta.env.DEV && layout) {
      console.debug('[tree] crossings', layout.crossings.length);
    }
  }, [layout]);

  const busPaths = useMemo(() => {
    if (!layout) return null;
    return new Map(layout.busses.map((b) => [b.famId, busPathData(b)]));
  }, [layout]);

  const traced = useMemo(() => {
    if (!selectedId || !layout) return null;
    const e = layout.famIndex.get(selectedId);
    return new Set(e ? [...e.parentFams, ...e.ownFams] : []);
  }, [selectedId, layout]);
  const connOpacity = (famId) => (traced && !traced.has(famId) ? 0.35 : 1);

  // The selected person's chain from "you" — the card's kin label, upgraded
  // to the actual relationship. Memoized: TreeView re-renders on every pan.
  const selectedRel = useMemo(() => {
    if (!selectedId || !data?.self || selectedId === data.self.id) return null;
    const r = describeRelationship(data, data.self.id, selectedId);
    return r.kind === 'related' ? `Your ${r.primary.body}` : null;
  }, [selectedId, data]);

  // Folded capsules to draw (skipped in branch view — branches exclude
  // in-law families by definition).
  const capsules = useMemo(() => {
    if (!layout || branchRootId) return [];
    const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));
    const byId = new Map((data?.persons || []).map((p) => [p.id, p]));
    return clusters
      .filter((c) => !expandedCaps.has(c.key))
      .map((c) => {
        const anchor = nodeById.get(c.anchorId);
        const person = byId.get(c.anchorId);
        if (!anchor || !person) return null;
        return {
          key: c.key,
          x: anchor.cx,
          y: anchor.y - 26,
          label: `${person.name.split(/\s+/)[0]}’s family`,
          count: c.members.size,
        };
      })
      .filter(Boolean);
  }, [layout, clusters, expandedCaps, branchRootId, data]);

  const fitAll = () => {
    if (!layoutRef.current || !wrapRef.current) return;
    const L = layoutRef.current;
    const { width: cw, height: ch } = wrapRef.current.getBoundingClientRect();
    const k = clamp(Math.min((cw - 32) / L.size.width, (ch - 160) / L.size.height), 0.12, 1.05);
    setView({
      k,
      x: (cw - L.size.width * k) / 2,
      y: Math.max((ch - L.size.height * k) / 2, 72),
    });
  };

  const centerOn = (id) => {
    const L = layoutRef.current;
    const el = wrapRef.current;
    if (!L || !el) return false;
    const node = L.nodes.find((n) => n.id === id);
    if (!node) return false;
    const { width: cw, height: ch } = el.getBoundingClientRect();
    const k = 0.9;
    setView({ k, x: cw / 2 - node.cx * k, y: ch / 2.4 - node.cy * k });
    setSelectedId(id);
    focusPending.current = null;
    return true;
  };

  // Arriving with a focus target (#/tree/:id): unfold their capsule if
  // needed, then centre on them with the card open.
  useEffect(() => {
    if (!focusId || !data) return;
    focusPending.current = focusId;
    const c = clusters.find((cc) => cc.members.has(focusId));
    if (c && !expandedRef.current.has(c.key)) {
      setExpandedCaps(new Set([...expandedRef.current, c.key]));
      return; // the layout change re-triggers centring below
    }
    centerOn(focusId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, data, clusters]);

  // Initial view: whole tree if readable, else centred on you; branches fit.
  // Runs on every layout identity (data edits can change the layout without
  // changing its SIZE, so a size-string key would miss them — that was the
  // "new person invisible until I left and came back" bug). A shape key
  // guards against resetting the user's pan/zoom on irrelevant ticks, while
  // a pending focus target retries until its node exists.
  const lastViewKey = useRef('');
  useLayoutEffect(() => {
    if (!layout || !wrapRef.current) return;
    if (focusPending.current) {
      centerOn(focusPending.current);
      return;
    }
    const key = `${layout.size.width}x${layout.size.height}|${branchRootId || ''}`;
    if (key === lastViewKey.current) return;
    lastViewKey.current = key;
    if (branchRootId) {
      fitAll();
      return;
    }
    const { width: cw, height: ch } = wrapRef.current.getBoundingClientRect();
    const fitK = Math.min((cw - 32) / layout.size.width, (ch - 160) / layout.size.height);
    if (fitK >= 0.45) {
      fitAll();
    } else {
      const focus = layout.nodes.find((n) => n.person.isSelf) || layout.nodes[0];
      const k = 0.8;
      setView({ k, x: cw / 2 - focus.cx * k, y: ch / 2.2 - focus.cy * k });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, branchRootId]);

  // Repaint nudge when the tab/app comes back to the foreground — flushes
  // any stale iOS WebKit raster tiles (glyphs dropped while backgrounded).
  useEffect(() => {
    const nudge = () => setView((v) => ({ ...v, x: v.x + 0.001 }));
    const onVis = () => {
      if (document.visibilityState === 'visible') nudge();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pageshow', nudge);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pageshow', nudge);
    };
  }, []);

  // Wheel zoom (non-passive so we can preventDefault page scroll).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const v = viewRef.current;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const k = clamp(v.k * Math.exp(-e.deltaY * 0.0018), 0.12, 3);
      const f = k / v.k;
      setView({ k, x: mx - (mx - v.x) * f, y: my - (my - v.y) * f });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Capture the pointer only once a drag actually starts — capturing on
  // touch-down steals the click that buttons and node taps need.
  const capture = (pointerId) => {
    try {
      wrapRef.current.setPointerCapture?.(pointerId);
    } catch {
      // synthetic events and some browsers reject capture — gestures still work
    }
  };

  const onPointerDown = (e) => {
    if (e.target.closest?.('button')) return; // buttons keep native click behaviour
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (ptrs.current.size === 1) {
      g.moved = false;
      g.lastX = e.clientX;
      g.lastY = e.clientY;
      g.downPid = e.target.closest?.('[data-pid]')?.getAttribute('data-pid') || null;
      g.downCap = e.target.closest?.('[data-capsule]')?.getAttribute('data-capsule') || null;
    } else if (ptrs.current.size === 2) {
      for (const id of ptrs.current.keys()) capture(id);
      const [a, b] = [...ptrs.current.values()];
      g.lastDist = Math.hypot(a.x - b.x, a.y - b.y);
      g.lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  };

  const onPointerMove = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const v = viewRef.current;
    if (ptrs.current.size === 1) {
      const dx = e.clientX - g.lastX;
      const dy = e.clientY - g.lastY;
      if (!g.moved && Math.abs(dx) + Math.abs(dy) > 3) {
        g.moved = true;
        capture(e.pointerId);
      }
      g.lastX = e.clientX;
      g.lastY = e.clientY;
      if (g.moved) setView({ ...v, x: v.x + dx, y: v.y + dy });
    } else if (ptrs.current.size === 2) {
      g.moved = true;
      const [a, b] = [...ptrs.current.values()];
      const rect = wrapRef.current.getBoundingClientRect();
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
      const pm = { x: g.lastMid.x - rect.left, y: g.lastMid.y - rect.top };
      const k = clamp(v.k * (dist / (g.lastDist || dist)), 0.12, 3);
      const wx = (pm.x - v.x) / v.k;
      const wy = (pm.y - v.y) / v.k;
      setView({ k, x: mid.x - wx * k, y: mid.y - wy * k });
      g.lastDist = dist;
      g.lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  };

  const onPointerUp = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.delete(e.pointerId);
    const g = gesture.current;
    if (ptrs.current.size === 1) {
      const [p] = [...ptrs.current.values()];
      g.lastX = p.x;
      g.lastY = p.y;
    }
    if (ptrs.current.size === 0 && !g.moved) {
      if (g.downCap) {
        setExpandedCaps(new Set([...expandedRef.current, g.downCap]));
      } else {
        setSelectedId(g.downPid && g.downPid !== selectedId ? g.downPid : null);
      }
    }
    if (ptrs.current.size === 0) {
      g.downPid = null;
      g.downCap = null;
    }
  };

  if (!data) return null;
  const selected = selectedId ? data.persons.find((p) => p.id === selectedId) : null;
  const selectedKin = selected && data.classes ? data.classes.get(selected.id) : null;
  const branchPerson = branchRootId ? data.persons.find((p) => p.id === branchRootId) : null;
  const foldedCount = clusters.filter((c) => !expandedCaps.has(c.key)).length;

  const foldFamilyOf = (personId) => {
    const c = clusters.find((cc) => cc.members.has(personId));
    if (!c) return;
    const next = new Set(expandedRef.current);
    next.delete(c.key);
    setExpandedCaps(next);
    setSelectedId(null);
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-dvh touch-none select-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {layout && (
        // textRendering + translateZ(0): hardening against iOS WebKit's
        // tile-rasterizer dropping individual SVG text glyphs under pan/zoom
        // transforms (text invisible until a repaint — seen on iPhone only).
        <svg className="size-full" textRendering="geometricPrecision" style={{ transform: 'translateZ(0)' }}>
          <defs>
            <clipPath id="kutumbakam-av">
              <circle cx="0" cy={AVATAR_Y} r={AV_R} />
            </clipPath>
          </defs>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {layout.busses.map((b) => {
              const pd = busPaths.get(b.famId);
              return (
                <g
                  key={b.famId}
                  stroke="var(--color-thread)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={connOpacity(b.famId)}
                >
                  <path d={pd.solidD} />
                  {pd.dashedD && <path d={pd.dashedD} strokeDasharray="4 4" />}
                  {pd.junctionXs.map((x) => (
                    <circle key={x} cx={x} cy={b.railY} r={DOT_R} fill="var(--color-thread)" stroke="none" />
                  ))}
                </g>
              );
            })}
            {layout.spouseLines.map((l) => (
              <line
                key={l.famId}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="var(--color-thread)"
                strokeWidth="2"
                strokeDasharray={l.dashed ? '5 4' : undefined}
                opacity={connOpacity(l.famId)}
              />
            ))}
            {layout.extraMarriageLines.map((l) => (
              <line
                key={`x-${l.famId}`}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="var(--color-thread)"
                strokeWidth="2"
                strokeDasharray="5 4"
                opacity={connOpacity(l.famId)}
              />
            ))}
            {traced &&
              layout.busses
                .filter((b) => traced.has(b.famId))
                .map((b) => {
                  const pd = busPaths.get(b.famId);
                  return (
                    <g
                      key={`hl-${b.famId}`}
                      stroke="var(--color-accent)"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={pd.solidD} />
                      {pd.dashedD && <path d={pd.dashedD} strokeDasharray="4 4" />}
                      {pd.junctionXs.map((x) => (
                        <circle key={x} cx={x} cy={b.railY} r={DOT_R} fill="var(--color-accent)" stroke="none" />
                      ))}
                    </g>
                  );
                })}
            {traced &&
              layout.spouseLines
                .filter((l) => traced.has(l.famId))
                .map((l) => (
                  <line
                    key={`hls-${l.famId}`}
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke="var(--color-accent)"
                    strokeWidth="2.5"
                    strokeDasharray={l.dashed ? '5 4' : undefined}
                  />
                ))}
            {traced &&
              layout.extraMarriageLines
                .filter((l) => traced.has(l.famId))
                .map((l) => (
                  <line
                    key={`hlx-${l.famId}`}
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke="var(--color-accent)"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                  />
                ))}
            {layout.nodes.map((n) => (
              <TreeNode
                key={n.id}
                n={n}
                kin={data.classes?.get(n.id)}
                selected={n.id === selectedId}
                hint={data.hints?.get(n.id)}
              />
            ))}
            {capsules.map((cap) => (
              <CapsuleNode key={cap.key} cap={cap} />
            ))}
          </g>
        </svg>
      )}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-4 top-4">
          <Pill onClick={() => nav('/')} ariaLabel="Back to list">
            <ListGlyph className="size-4" />
            People
          </Pill>
        </div>
        <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
          {!branchRootId && clusters.length > 0 && (
            <Pill
              active={foldedCount === 0}
              onClick={() =>
                foldedCount > 0
                  ? setExpandedCaps(new Set(clusters.map((c) => c.key)))
                  : setExpandedCaps(new Set())
              }
              ariaLabel="Fold or unfold all in-law families"
            >
              {foldedCount > 0 ? `In-laws · ${foldedCount} folded` : 'In-laws shown'}
            </Pill>
          )}
          <Pill onClick={fitAll} ariaLabel="Fit whole tree">
            <FitGlyph className="size-4" />
            Fit
          </Pill>
        </div>

        {branchPerson && (
          <div className="absolute left-1/2 top-16 -translate-x-1/2">
            <Pill active onClick={() => setBranchRootId(null)} ariaLabel="Exit branch view">
              Branch of {branchPerson.name.split(/\s+/)[0]} ✕
            </Pill>
          </div>
        )}

        {layout?.unplaced.length > 0 && (
          <p className="absolute bottom-4 left-4 rounded-full bg-card/80 px-3 py-1.5 text-[11.5px] text-ink-faint backdrop-blur">
            {layout.unplaced.length} not yet connected — see list
          </p>
        )}

        {selected && (
          <div className="pointer-events-auto absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-card border border-line bg-card/95 p-3 shadow-pop backdrop-blur">
            <Avatar person={selected} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[16px] font-medium leading-tight">
                {selected.name}
                {selected.nickname && (
                  <span className="font-body text-[13px] text-ink-soft"> “{selected.nickname}”</span>
                )}
              </p>
              <p className="tnum truncate text-[12.5px] text-ink-soft">
                {[
                  data.hints?.get(selected.id),
                  lifeSpan(selected),
                  selectedRel || (selectedKin && KIN_LABEL[selectedKin]),
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </p>
            </div>
            {selectedKin === 'extended' ? (
              <button
                type="button"
                onClick={() => foldFamilyOf(selected.id)}
                className="rounded-full border border-line bg-card px-3.5 py-2 text-[13.5px] font-semibold text-ink-soft"
              >
                Fold
              </button>
            ) : (
              !branchRootId && (
                <button
                  type="button"
                  onClick={() => {
                    setBranchRootId(selected.id);
                    setSelectedId(null);
                  }}
                  className="rounded-full border border-line bg-card px-3.5 py-2 text-[13.5px] font-semibold text-ink-soft"
                >
                  Branch
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => nav(`/p/${selected.id}`)}
              className="rounded-full bg-accent px-4 py-2 text-[13.5px] font-semibold text-[#fff8f3] active:bg-accent-deep"
            >
              Open
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
