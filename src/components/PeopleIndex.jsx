import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import PersonRow from './PersonRow.jsx';
import QuickPersonForm from './QuickPersonForm.jsx';
import Sheet from './Sheet.jsx';
import { Plus } from './icons.jsx';
import { getPeopleWithKinship, createPerson } from '../db/repo.js';
import { toast } from '../lib/toast.js';

// List sections, in order — shared with the mobile PeopleList. "Family" is
// the bloodline plus everyone married into it; "Extended" is the families
// they came from (in-laws' kin); "Not yet connected" is data-entry in progress.
export const GROUPS = [
  { key: 'family', title: 'Family', match: (c) => c === 'blood' || c === 'married' },
  { key: 'extended', title: 'Extended family', match: (c) => c === 'extended' },
  { key: 'unconnected', title: 'Not yet connected', match: (c) => c === 'unconnected' },
];

// The workspace's left pane (desktop only): the index of the ledger. Picking
// a row doesn't navigate — it focuses that person on the canvas beside it.
export default function PeopleIndex({ onPick, activeId }) {
  const data = useLiveQuery(() => getPeopleWithKinship(), []);
  const persons = data?.persons || [];
  const classes = data?.classes || null;
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);

  const filtered = q
    ? persons.filter((p) => `${p.name} ${p.nickname || ''}`.toLowerCase().includes(q.toLowerCase()))
    : persons;

  const sections = classes
    ? GROUPS.map((g) => ({ ...g, people: filtered.filter((p) => g.match(classes.get(p.id))) })).filter(
        (g) => g.people.length > 0,
      )
    : [{ key: 'all', title: null, people: filtered }];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 pb-2.5 pt-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find someone…"
          className="w-full min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2 text-[16px] placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          aria-label="Add person"
          onClick={() => setAdding(true)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink-soft transition-colors hover:border-accent hover:text-accent-deep"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-8">
        {sections.map((g, i) => (
          <div key={g.key}>
            <p className={`flex items-baseline gap-1.5 px-1.5 pb-1.5 ${i === 0 ? 'pt-1' : 'pt-5'}`}>
              {g.title ? (
                <>
                  <span className="label-caps">{g.title}</span>
                  <span className="tnum text-[12px] text-ink-faint">{g.people.length}</span>
                </>
              ) : (
                <span className="tnum text-[13px] text-ink-faint">
                  {g.people.length} {g.people.length === 1 ? 'person' : 'people'}
                </span>
              )}
            </p>
            <div className="flex flex-col gap-0.5">
              {g.people.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  hint={data?.hints?.get(p.id)}
                  active={p.id === activeId}
                  onClick={() => onPick(p.id)}
                />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-10 text-center text-[14px] text-ink-faint">No one called “{q}” yet.</p>
        )}
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a person">
        <QuickPersonForm
          submitLabel="Add to the tree"
          onSubmit={async (fields) => {
            const p = await createPerson(fields);
            toast(`${p.name} added — connect them from their page`);
            setAdding(false);
            onPick(p.id);
          }}
        />
      </Sheet>
    </div>
  );
}
