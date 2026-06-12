import { useEffect, useRef, useState } from 'react';
import Mark from '../components/Mark.jsx';
import PeopleIndex from '../components/PeopleIndex.jsx';
import TreeView from './TreeView.jsx';
import { Gear, PanelGlyph } from '../components/icons.jsx';
import { nav } from '../lib/router.js';

// ≥lg the app is one workspace — the marketplace triad: people index (left),
// tree canvas (the family's map, centre), person record (right, on
// selection). The record panel lives inside TreeView, which owns selection;
// the index drives it through focus targets. Deep links (#/p/:id, #/tree/:id)
// land as the initial focus; canvas clicks select without re-centring.
export default function Workspace({ route }) {
  const routeId = route.name === 'person' ? route.id : route.name === 'tree' ? route.focusId : null;
  const [focus, setFocus] = useState(() => (routeId ? { id: routeId, key: 1 } : null));
  const [paneOpen, setPaneOpen] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const lastRouteId = useRef(routeId);

  // External navigation — record-panel row hops, back/forward, deep links —
  // becomes a focus target (centre + select + trace).
  useEffect(() => {
    if (routeId && routeId !== lastRouteId.current) {
      setFocus((f) => ({ id: routeId, key: (f?.key || 0) + 1 }));
    }
    lastRouteId.current = routeId;
  }, [routeId]);

  // Picks write the URL (deep-linkable, back-button walks your picks) and
  // focus directly; lastRouteId is pre-set so the route effect doesn't
  // double-fire. Canvas clicks stay internal — selecting by tap shouldn't
  // re-centre or grow history.
  const pick = (id) => {
    setFocus((f) => ({ id, key: (f?.key || 0) + 1 }));
    lastRouteId.current = id;
    nav(`/p/${id}`);
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-paper px-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={paneOpen ? 'Hide the people list' : 'Show the people list'}
            aria-pressed={paneOpen}
            onClick={() => setPaneOpen((v) => !v)}
            className={`flex size-10 items-center justify-center rounded-full transition-colors hover:bg-accent-soft/40 ${
              paneOpen ? 'text-ink-soft' : 'text-ink-faint'
            }`}
          >
            <PanelGlyph />
          </button>
          <Mark className="size-6" />
          <span className="font-display text-[19px] font-semibold">Kutumbakam</span>
        </div>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => nav('/settings')}
          className="flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-accent-soft/40"
        >
          <Gear />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {paneOpen && (
          <aside className="w-[300px] shrink-0 border-r border-line">
            <PeopleIndex onPick={pick} activeId={selectedId} />
          </aside>
        )}
        <main className="min-w-0 flex-1">
          <TreeView
            workspace
            focusId={focus?.id}
            focusKey={focus?.key}
            onSelectionChange={setSelectedId}
            reflowKey={paneOpen ? 1 : 0}
          />
        </main>
      </div>
    </div>
  );
}
