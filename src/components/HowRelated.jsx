import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Sheet from './Sheet.jsx';
import PersonRow from './PersonRow.jsx';
import RelationPathSvg from './RelationPathSvg.jsx';
import { getRelationship, getSelf, listPersons, getNameHints } from '../db/repo.js';
import { renderRelationCard, dataUrlToFile } from '../lib/relationCard.js';
import { layoutRelationPath } from '../lib/relationPath.js';
import { toneFor, initialsOf } from '../lib/avatar.js';
import { toast } from '../lib/toast.js';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// "How are we related?" on a person's page. Reads from "you" by default; the
// chip re-anchors the chain to anyone — for when the question at the function
// is "and how is she related to Sharada?".
export default function HowRelated({ person }) {
  const self = useLiveQuery(() => getSelf(), []);
  const [anchorId, setAnchorId] = useState(null); // null → you
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    setAnchorId(null);
    setPicking(false);
  }, [person.id]);

  const effAnchorId = anchorId || self?.id || null;
  const data = useLiveQuery(
    () => (effAnchorId ? getRelationship(effAnchorId, person.id) : null),
    [effAnchorId, person.id],
  );
  const everyone = useLiveQuery(() => listPersons(), []) || [];
  const hints = useLiveQuery(() => getNameHints(), []);
  const byId = useMemo(() => new Map(everyone.map((p) => [p.id, p])), [everyone]);

  const anchor = data?.anchor;
  const result = data?.result;
  const anchorLabel = anchor ? (anchor.isSelf ? 'You' : anchor.name.split(/\s+/)[0]) : 'Pick';

  const candidates = everyone.filter(
    (p) =>
      p.id !== person.id &&
      (!q || `${p.name} ${p.nickname || ''}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <section className="mt-6">
      <div className="mb-1.5 flex items-center justify-between px-1.5">
        <span className="label-caps">Relation</span>
        <button
          type="button"
          onClick={() => {
            setQ('');
            setPicking(true);
          }}
          className="rounded-full border border-line bg-card px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:border-accent"
        >
          from {anchorLabel} ▾
        </button>
      </div>
      <div className="rounded-card border border-line bg-card p-1.5">
        {!effAnchorId ? (
          <p className="px-2.5 py-2 text-[13.5px] italic text-ink-faint">
            Pick whose side to read the relation from.
          </p>
        ) : !result ? (
          <p className="px-2.5 py-2 text-[13.5px] text-ink-faint">…</p>
        ) : result.kind === 'self' ? (
          <>
            <p className="px-2.5 pt-2 pb-1 text-[15px] leading-snug">This is you.</p>
            <p className="px-2.5 pb-2 text-[12px] leading-snug text-ink-faint">
              Switch “from” to someone else to read how you relate to them.
            </p>
          </>
        ) : result.kind === 'none' ? (
          <p className="px-2.5 py-2 text-[13.5px] italic text-ink-faint">
            No recorded connection {anchor?.isSelf ? 'to you' : `to ${anchorLabel}`} yet.
          </p>
        ) : (
          <>
            <p className="px-2.5 pt-2 pb-1 text-[15px] font-medium leading-snug">
              {cap(`${result.head} ${result.primary.body}`)}.
            </p>
            {result.primary.trail && byId.size > 0 && (
              <div className="px-2.5 pb-1 pt-2">
                <RelationPathSvg trail={result.primary.trail} personsById={byId} />
              </div>
            )}
            {result.also.map((r) => (
              <p key={r.body} className="px-2.5 pb-1 text-[13px] leading-snug text-ink-soft">
                also {result.head} {r.body}
              </p>
            ))}
            {result.more > 0 && (
              <p className="px-2.5 pb-1 text-[12px] text-ink-faint">
                +{result.more} more {result.more === 1 ? 'way' : 'ways'}
              </p>
            )}
            <div className="flex justify-end pb-0.5 pr-0.5">
              <button
                type="button"
                onClick={() => {
                  // Synchronous end-to-end so navigator.share stays inside
                  // the tap gesture (Safari drops late share sheets). The
                  // schematic ships as pure data: tones + initials only
                  // (photos would need async loads — and stay private).
                  const trailLayout = result.primary.trail ? layoutRelationPath(result.primary.trail) : null;
                  const trailMeta = trailLayout
                    ? result.primary.trail.map((t) => {
                        const p = byId.get(t.id);
                        const tone = p ? toneFor(p.id) : { bg: '#e9dfd2', fg: '#5c4a33' };
                        return {
                          initials: p ? initialsOf(p.name) : '·',
                          bg: tone.bg,
                          fg: tone.fg,
                          isSelf: !!p?.isSelf,
                          name: (p?.name || '·').split(/\s+/)[0],
                          word: t.word || (p?.isSelf ? 'you' : null),
                        };
                      })
                    : null;
                  const url = renderRelationCard({
                    targetName: person.name,
                    anchorFirst: (anchor?.name || '').split(/\s+/)[0],
                    primaryBody: result.primary.body,
                    alsoBodies: result.also.map((r) => r.body),
                    trailLayout,
                    trailMeta,
                  });
                  const file = dataUrlToFile(url, `kutumbakam-${person.name.split(/\s+/)[0]}.png`);
                  if (navigator.share) {
                    navigator.share({ files: [file] }).catch(() => {});
                  } else {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name;
                    a.click();
                    toast('Card saved as an image');
                  }
                }}
                className="rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold text-accent-deep transition-colors hover:bg-accent-soft/40"
              >
                Share as card
              </button>
            </div>
          </>
        )}
      </div>

      <Sheet open={picking} onClose={() => setPicking(false)} title={`Relate ${person.name} to…`}>
        <div className="flex flex-col gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the tree…"
            className="w-full rounded-[13px] border border-line bg-card px-3.5 py-2.5 text-[16px] placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          <div className="max-h-72 overflow-y-auto">
            {candidates.length === 0 && (
              <p className="px-2 py-6 text-center text-[13.5px] text-ink-faint">No one else in the tree matches.</p>
            )}
            {candidates.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                hint={hints?.get(p.id)}
                onClick={() => {
                  setAnchorId(p.id);
                  setPicking(false);
                }}
              />
            ))}
          </div>
        </div>
      </Sheet>
    </section>
  );
}
