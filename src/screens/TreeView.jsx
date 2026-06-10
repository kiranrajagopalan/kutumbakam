import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getTreeData } from '../db/repo.js';
import { layoutFamilyTree, busPathData, AVATAR_Y, DOT_R } from '../lib/treeData.js';
import { toneFor, initialsOf } from '../lib/avatar.js';
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

function TreeNode({ n, kin, selected }) {
  const p = n.person;
  const tone = toneFor(p.id);
  const url = photoUrlFor(p);
  const dim = kin === 'extended' || kin === 'unconnected';
  const first = p.name.split(/\s+/)[0] || '·';
  const label = first.length > 11 ? `${first.slice(0, 10)}…` : first;
  return (
    <g
      data-pid={p.id}
      transform={`translate(${n.cx} ${n.y})`}
      opacity={dim ? 0.38 : 1}
      style={{ cursor: 'pointer' }}
    >
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
        <image
          href={url}
          x={-AV_R}
          y={AVATAR_Y - AV_R}
          width={AV_R * 2}
          height={AV_R * 2}
          clipPath="url(#kutumbakam-av)"
          preserveAspectRatio="xMidYMid slice"
          opacity={p.isAlive ? 1 : 0.82}
        />
      ) : (
        <>
          <circle cy={AVATAR_Y} r={AV_R} fill={tone.bg} opacity={p.isAlive ? 1 : 0.8} />
          <text
            y={AVATAR_Y}
            dy="0.36em"
            textAnchor="middle"
            fill={tone.fg}
            style={{ font: '600 15px var(--font-display)' }}
          >
            {initialsOf(p.name)}
          </text>
        </>
      )}
      <text
        y={AVATAR_Y + AV_R + 17}
        textAnchor="middle"
        fill="var(--color-ink)"
        style={{ font: '500 12.5px var(--font-body)' }}
      >
        {label}
      </text>
      {p.birthYear && (
        <text
          y={AVATAR_Y + AV_R + 32}
          textAnchor="middle"
          fill="var(--color-ink-soft)"
          style={{ font: '400 10.5px var(--font-body)', fontVariantNumeric: 'tabular-nums' }}
        >
          {p.birthApprox ? 'c. ' : ''}
          {p.birthYear}
        </text>
      )}
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

export default function TreeView() {
  const data = useLiveQuery(() => getTreeData(), []);
  const [showExtended, setShowExtended] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const wrapRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 0.8 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const ptrs = useRef(new Map());
  const gesture = useRef({ moved: false, lastX: 0, lastY: 0, lastDist: 0, lastMid: null });

  const hasExtended = !!data?.classes && data.persons.some((p) => {
    const c = data.classes.get(p.id);
    return c === 'extended' || c === 'unconnected';
  });

  const layout = useMemo(() => {
    if (!data || !data.persons.length) return null;
    const rootId = data.self?.id || data.persons[0].id;
    let include;
    if (!showExtended && data.classes) {
      include = new Set(
        data.persons
          .filter((p) => ['blood', 'married'].includes(data.classes.get(p.id)))
          .map((p) => p.id),
      );
    }
    return layoutFamilyTree(data, rootId, { include });
  }, [data, showExtended]);

  useEffect(() => {
    if (import.meta.env.DEV && layout) {
      console.debug('[tree] crossings', layout.crossings.length, layout.crossings);
    }
  }, [layout]);

  const busPaths = useMemo(() => {
    if (!layout) return null;
    return new Map(layout.busses.map((b) => [b.famId, busPathData(b)]));
  }, [layout]);

  // Tap-to-trace: the selected person's connector constellation.
  const traced = useMemo(() => {
    if (!selectedId || !layout) return null;
    const e = layout.famIndex.get(selectedId);
    return new Set(e ? [...e.parentFams, ...e.ownFams] : []);
  }, [selectedId, layout]);
  const connOpacity = (famId) => (traced && !traced.has(famId) ? 0.35 : 1);

  const fitAll = () => {
    if (!layout || !wrapRef.current) return;
    const { width: cw, height: ch } = wrapRef.current.getBoundingClientRect();
    const k = clamp(Math.min((cw - 32) / layout.size.width, (ch - 160) / layout.size.height), 0.12, 1.05);
    setView({
      k,
      x: (cw - layout.size.width * k) / 2,
      y: Math.max((ch - layout.size.height * k) / 2, 72),
    });
  };

  // Initial view: whole tree if it's readable, otherwise centred on you.
  const layoutKey = layout ? `${layout.size.width}x${layout.size.height}` : '';
  useLayoutEffect(() => {
    if (!layout || !wrapRef.current) return;
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
  }, [layoutKey]);

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

  // Capture the pointer only once a drag actually starts. Capturing on
  // touch-down retargets the whole pointer stream to the canvas, which
  // swallows the click that buttons (pills, info card) and node taps need —
  // that's exactly the "none of the buttons are clickable" bug.
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
      // remember what the finger landed on — pointer capture during a later
      // drag retargets events, so the up handler can't trust e.target
      g.downPid = e.target.closest?.('[data-pid]')?.getAttribute('data-pid') || null;
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
        capture(e.pointerId); // drag confirmed — now own the pointer
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
      // use the target recorded at touch-down (capture-proof)
      setSelectedId(g.downPid && g.downPid !== selectedId ? g.downPid : null);
    }
    if (ptrs.current.size === 0) g.downPid = null;
  };

  if (!data) return null;
  const selected = selectedId ? data.persons.find((p) => p.id === selectedId) : null;
  const selectedKin = selected && data.classes ? data.classes.get(selected.id) : null;

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
        <svg className="size-full">
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
              />
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
          {hasExtended && (
            <Pill active={showExtended} onClick={() => setShowExtended(!showExtended)}>
              Extended {showExtended ? 'shown' : 'hidden'}
            </Pill>
          )}
          <Pill onClick={fitAll} ariaLabel="Fit whole tree">
            <FitGlyph className="size-4" />
            Fit
          </Pill>
        </div>

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
                {[lifeSpan(selected), selectedKin && KIN_LABEL[selectedKin]]
                  .filter(Boolean)
                  .join('  ·  ')}
              </p>
            </div>
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
