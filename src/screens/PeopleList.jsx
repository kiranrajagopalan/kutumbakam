import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Mark from '../components/Mark.jsx';
import PersonRow from '../components/PersonRow.jsx';
import Sheet from '../components/Sheet.jsx';
import QuickPersonForm from '../components/QuickPersonForm.jsx';
import { Gear, Plus, TreeGlyph } from '../components/icons.jsx';
import { getPeopleWithKinship, createPerson } from '../db/repo.js';
import { toast } from '../lib/toast.js';
import { nav } from '../lib/router.js';

// List sections, in order. "Family" is the bloodline plus everyone married
// into it; "Extended" is the families they came from (in-laws' kin);
// "Not yet connected" is data-entry in progress.
const GROUPS = [
  { key: 'family', title: 'Family', match: (c) => c === 'blood' || c === 'married' },
  { key: 'extended', title: 'Extended family', match: (c) => c === 'extended' },
  { key: 'unconnected', title: 'Not yet connected', match: (c) => c === 'unconnected' },
];

export default function PeopleList() {
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
    <div className="px-4 pb-32 pt-5">
      <header className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <Mark className="size-7" />
          <span className="font-display text-[21px] font-semibold">Kutumbakam</span>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Tree view"
            onClick={() => nav('/tree')}
            className="flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-accent-soft/40"
          >
            <TreeGlyph />
          </button>
          <button
            type="button"
            aria-label="Settings"
            onClick={() => nav('/settings')}
            className="flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-accent-soft/40"
          >
            <Gear />
          </button>
        </div>
      </header>

      <div className="sticky top-0 z-10 -mx-4 bg-paper/95 px-4 pb-2 pt-2 backdrop-blur-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find someone…"
          className="w-full rounded-full border border-line bg-card px-4 py-2.5 text-[15px] placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
      </div>

      {sections.map((g, i) => (
        <div key={g.key}>
          <p className={`flex items-baseline gap-1.5 px-1.5 pb-1.5 ${i === 0 ? 'pt-2' : 'pt-6'}`}>
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
              <PersonRow key={p.id} person={p} hint={data?.hints?.get(p.id)} onClick={() => nav(`/p/${p.id}`)} />
            ))}
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <p className="px-2 py-10 text-center text-[14px] text-ink-faint">
          No one called “{q}” yet.
        </p>
      )}

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-5 py-3.5 text-[15px] font-semibold text-[#fff8f3] shadow-pop transition-colors active:bg-accent-deep"
      >
        <Plus className="size-5" />
        Add person
      </button>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a person">
        <QuickPersonForm
          submitLabel="Add to the tree"
          onSubmit={async (fields) => {
            const p = await createPerson(fields);
            toast(`${p.name} added — connect them from their page`);
            setAdding(false);
            nav(`/p/${p.id}`);
          }}
        />
      </Sheet>
    </div>
  );
}
