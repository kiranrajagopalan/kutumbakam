import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Sheet from './Sheet.jsx';
import QuickPersonForm from './QuickPersonForm.jsx';
import PersonRow from './PersonRow.jsx';
import { addRelative, listPersons, getNameHints } from '../db/repo.js';
import { toast } from '../lib/toast.js';

const ROLES = [
  { key: 'father', label: 'Father', role: 'father', gender: 'male' },
  { key: 'mother', label: 'Mother', role: 'mother', gender: 'female' },
  { key: 'brother', label: 'Brother', role: 'sibling', gender: 'male' },
  { key: 'sister', label: 'Sister', role: 'sibling', gender: 'female' },
  { key: 'spouse', label: 'Spouse', role: 'spouse', gender: '' },
  { key: 'son', label: 'Son', role: 'child', gender: 'male' },
  { key: 'daughter', label: 'Daughter', role: 'child', gender: 'female' },
];

// targetUnionId: aim the spouse role at an existing union ("+ Add partner"
// on a "Partner not recorded" row) — fills that union instead of creating
// a new marriage, which also makes the person a parent of its children.
export default function AddRelativeSheet({ anchor, family, open, onClose, initialRoleKey = null, targetUnionId = null }) {
  const [picked, setPicked] = useState(null);
  const [tab, setTab] = useState('new');
  const [unionId, setUnionId] = useState(null);
  const [relation, setRelation] = useState('biological');
  const [q, setQ] = useState('');
  const everyone = useLiveQuery(() => listPersons(), []) || [];
  const hints = useLiveQuery(() => getNameHints(), []);

  useEffect(() => {
    if (open) {
      setPicked(ROLES.find((r) => r.key === initialRoleKey) || null);
      setTab('new');
      setUnionId(null);
      setRelation('biological');
      setQ('');
    }
  }, [open, initialRoleKey]);

  const parentSlotsFull = family.parents.length >= 2;
  const needsUnionChoice = picked?.role === 'child' && family.unions.length > 1;
  // childLink-creating roles can record how the link is made.
  const relationChoice = ['father', 'mother', 'sibling', 'child'].includes(picked?.role);

  const directIds = useMemo(() => {
    const ids = new Set([anchor.id]);
    family.parents.forEach((p) => ids.add(p.person.id));
    family.siblings.forEach((s) => ids.add(s.person.id));
    family.unions.forEach((u) => {
      if (u.partner) ids.add(u.partner.id);
      u.children.forEach((c) => ids.add(c.person.id));
    });
    return ids;
  }, [anchor, family]);

  const candidates = everyone.filter(
    (p) =>
      !directIds.has(p.id) &&
      (!q || `${p.name} ${p.nickname || ''}`.toLowerCase().includes(q.toLowerCase())),
  );

  const targetUnion = targetUnionId ? family.unions.find((u) => u.union.id === targetUnionId) : null;

  async function submit(subject) {
    if (needsUnionChoice && !unionId) {
      toast('Pick which partner this child belongs with', 'error');
      return;
    }
    try {
      const person = await addRelative(anchor.id, picked.role, subject, {
        unionId: (picked.role === 'spouse' ? targetUnionId : unionId) || undefined,
        relation: relationChoice ? relation : undefined,
      });
      if (targetUnion && targetUnion.children.length > 0) {
        toast(
          `${person.name} added as partner of ${anchor.name} — and as parent of ${targetUnion.children
            .map((c) => c.person.name)
            .join(', ')}`,
        );
      } else {
        toast(`${person.name} added as ${picked.label.toLowerCase()} of ${anchor.name}`);
      }
      onClose();
    } catch (e) {
      toast(e.message === 'CHOOSE_UNION' ? 'Pick which partner this child belongs with' : e.message, 'error');
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        targetUnion
          ? `Add partner of ${anchor.name}`
          : picked
            ? `Add ${picked.label.toLowerCase()} of ${anchor.name}`
            : `Add a relative of ${anchor.name}`
      }
    >
      {!picked ? (
        <div className="grid grid-cols-2 gap-2 pb-2">
          {ROLES.map((r) => {
            const disabled = (r.role === 'father' || r.role === 'mother') && parentSlotsFull;
            return (
              <button
                key={r.key}
                type="button"
                disabled={disabled}
                onClick={() => setPicked(r)}
                className="rounded-card border border-line bg-paper px-4 py-3.5 text-left text-[15px] font-medium transition-colors hover:border-accent disabled:opacity-35"
              >
                {r.label}
                {disabled && (
                  <span className="block text-[11px] font-normal text-ink-faint">both parents recorded</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          {targetUnion && targetUnion.children.length > 0 && (
            <p className="mb-3 rounded-[13px] bg-accent-soft/50 px-3 py-2 text-[13px] leading-snug text-accent-deep">
              Will also be recorded as {targetUnion.children.map((c) => c.person.name).join(', ')}’s parent.
            </p>
          )}
          <div className="mb-4 flex gap-1 rounded-[13px] border border-line bg-paper p-1">
            {[
              ['new', 'New person'],
              ['existing', 'Already in the tree'],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`flex-1 rounded-[10px] px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  tab === k ? 'bg-card shadow-pop' : 'text-ink-soft'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {relationChoice && (
            <div className="mb-4">
              <span className="label-caps mb-1.5 block">Connection</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ['biological', 'By birth'],
                  ['adoptive', 'Adopted'],
                  ['step', 'Step'],
                ].map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRelation(v)}
                    className={`rounded-full border px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
                      relation === v
                        ? 'border-accent bg-accent-soft text-accent-deep'
                        : 'border-line bg-card text-ink-soft'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {relation !== 'biological' && (
                <p className="mt-1.5 text-[12px] leading-snug text-ink-faint">
                  {picked.role === 'father' || picked.role === 'mother'
                    ? `Records ${anchor.name} as their ${relation === 'adoptive' ? 'adopted' : 'step'} child.`
                    : `Shown with an “${relation === 'adoptive' ? 'adopted' : 'step'}” chip wherever they appear.`}
                </p>
              )}
            </div>
          )}

          {needsUnionChoice && (
            <div className="mb-4">
              <span className="label-caps mb-1.5 block">Child with</span>
              <div className="flex flex-wrap gap-1.5">
                {family.unions.map((u) => (
                  <button
                    key={u.union.id}
                    type="button"
                    onClick={() => setUnionId(u.union.id)}
                    className={`rounded-full border px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
                      unionId === u.union.id
                        ? 'border-accent bg-accent-soft text-accent-deep'
                        : 'border-line bg-card text-ink-soft'
                    }`}
                  >
                    {u.partner ? u.partner.name : 'Partner not recorded'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'new' ? (
            <QuickPersonForm
              key={picked.key}
              presetGender={picked.gender}
              submitLabel={`Add ${picked.label.toLowerCase()}`}
              onSubmit={(fields) => submit(fields)}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search the tree…"
                className="w-full rounded-[13px] border border-line bg-card px-3.5 py-2.5 text-[16px] placeholder:text-ink-faint focus:border-accent focus:outline-none"
              />
              <div className="max-h-72 overflow-y-auto">
                {candidates.length === 0 && (
                  <p className="px-2 py-6 text-center text-[13.5px] text-ink-faint">
                    No one else in the tree matches.
                  </p>
                )}
                {candidates.map((p) => (
                  <PersonRow key={p.id} person={p} hint={hints?.get(p.id)} onClick={() => submit({ existingId: p.id })} />
                ))}
              </div>
              <p className="text-center text-[12px] leading-snug text-ink-faint">
                Linking someone already here is how marriages within the family are recorded.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setPicked(null)}
            className="mt-4 w-full text-center text-[13.5px] font-medium text-ink-soft"
          >
            ← Different relation
          </button>
        </div>
      )}
    </Sheet>
  );
}
