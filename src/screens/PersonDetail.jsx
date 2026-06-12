import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Avatar from '../components/Avatar.jsx';
import PersonRow from '../components/PersonRow.jsx';
import AddRelativeSheet from '../components/AddRelativeSheet.jsx';
import UnionSheet from '../components/UnionSheet.jsx';
import HowRelated from '../components/HowRelated.jsx';
import ConfirmSheet from '../components/ConfirmSheet.jsx';
import { ChevronLeft, Pencil, Plus, Lock, TreeGlyph, ListGlyph } from '../components/icons.jsx';
import { getPerson, getImmediateFamily, getNameHints, removePartnerFromUnion, removeChildLink } from '../db/repo.js';
import { lifeSpan, ageOf, yearLabel } from '../lib/format.js';
import { toast } from '../lib/toast.js';
import { nav, back } from '../lib/router.js';

function Section({ label, action, children }) {
  return (
    <section className="mt-6">
      <div className="mb-1.5 flex items-center justify-between px-1.5">
        <span className="label-caps">{label}</span>
        {action}
      </div>
      <div className="rounded-card border border-line bg-card p-1.5">{children}</div>
    </section>
  );
}

function AddHint({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-[13px] px-2.5 py-2.5 text-[14px] font-medium text-accent-deep transition-colors hover:bg-accent-soft/40"
    >
      <Plus className="size-4" />
      {children}
    </button>
  );
}

const relationChip = (relation) =>
  relation === 'adoptive' ? 'adopted' : relation === 'step' ? 'step' : null;

// The ✕ shown on rows while a section is in manage mode. Unlinks remove
// records, never people.
function UnlinkX({ label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-ink-faint transition-colors hover:bg-accent-soft/40 hover:text-accent-deep"
    >
      ✕
    </button>
  );
}

// `variant="panel"` renders the same record as the desktop workspace's
// docked right panel: ✕ instead of back, tree actions instead of nav
// buttons, and the add-relative pill stays inside the panel's own scroll.
export default function PersonDetail({ id, variant = 'page', onClose, treeActions }) {
  const panel = variant === 'panel';
  const person = useLiveQuery(() => getPerson(id), [id]);
  const family = useLiveQuery(() => getImmediateFamily(id), [id]);
  const hints = useLiveQuery(() => getNameHints(), []);
  const [sheet, setSheet] = useState({ open: false, role: null, targetUnionId: null });
  const [unionEdit, setUnionEdit] = useState(null);
  const [manage, setManage] = useState(null); // 'parents' | 'siblings' | 'unions'
  const [confirm, setConfirm] = useState(null);
  const hintOf = (p) => hints?.get(p.id);

  // Moving to another person's page exits manage mode and closes sheets.
  useEffect(() => {
    setManage(null);
    setConfirm(null);
    setSheet({ open: false, role: null, targetUnionId: null });
  }, [id]);

  if (!person || !family) {
    return person === null ? (
      <div className="px-6 py-20 text-center text-ink-faint">
        This person is no longer in the tree.
        <button type="button" className="mt-4 block w-full font-medium text-accent-deep" onClick={() => nav('/')}>
          Back to everyone
        </button>
      </div>
    ) : null;
  }

  const openSheet = (role = null, targetUnionId = null) => setSheet({ open: true, role, targetUnionId });
  // A section's header action: its add-hint plus the manage pencil, or Done
  // while that section is in manage mode.
  const manageAction = (key, hasRows, addHint = null) =>
    manage === key ? (
      <button
        type="button"
        onClick={() => setManage(null)}
        className="px-1 text-[13px] font-semibold text-accent-deep"
      >
        Done
      </button>
    ) : (
      <div className="flex items-center">
        {addHint}
        {hasRows && (
          <button
            type="button"
            aria-label="Fix wrong links"
            onClick={() => setManage(key)}
            className="flex size-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-accent-soft/40 hover:text-accent-deep"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>
    );
  const unlinkToast = (name) => toast(`Unlinked — ${name} is still in the tree`);
  const age = ageOf(person);
  const chips = [
    person.nativePlace && { k: 'from', v: person.nativePlace },
    person.familyHouse && { k: 'house', v: person.familyHouse },
    person.currentCity && { k: 'in', v: person.currentCity },
    person.occupation && { k: '', v: person.occupation },
  ].filter(Boolean);

  const unionMeta = (u) => {
    const bits = [];
    if (u.union.marriageYear) bits.push(`m. ${yearLabel(u.union.marriageYear)}`);
    return bits.join(' · ') || null;
  };

  return (
    <div className={panel ? 'px-4 pb-6 pt-3' : 'px-4 pb-32 pt-4'}>
      <div className="flex items-center justify-between">
        {panel ? (
          <div className="flex items-center gap-1.5">{treeActions}</div>
        ) : (
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            className="-ml-1.5 flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-accent-soft/40"
          >
            <ChevronLeft />
          </button>
        )}
        <div className="flex items-center gap-1">
          {!panel && (
            <button
              type="button"
              aria-label="See on the tree"
              onClick={() => nav(`/tree/${id}`)}
              className="flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-accent-soft/40"
            >
              <TreeGlyph />
            </button>
          )}
          {!panel && (
            <button
              type="button"
              aria-label="All people"
              onClick={() => nav('/')}
              className="flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-accent-soft/40"
            >
              <ListGlyph />
            </button>
          )}
          <button
            type="button"
            onClick={() => nav(`/p/${id}/edit`)}
            className="ml-1 flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-[13.5px] font-semibold text-ink-soft transition-colors hover:border-accent"
          >
            <Pencil className="size-4" />
            Edit
          </button>
          {panel && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-full text-[15px] text-ink-soft transition-colors hover:bg-accent-soft/40"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <header className="mt-3 flex items-start gap-4 px-1">
        <Avatar person={person} size="xl" />
        <div className="min-w-0 pt-1.5">
          <h1 className="font-display text-[27px] font-semibold leading-[1.12]">{person.name}</h1>
          {person.nickname && <div className="mt-0.5 text-[15px] text-ink-soft">“{person.nickname}”</div>}
          <div className="tnum mt-1.5 text-[14px] text-ink-soft">
            {lifeSpan(person, true)}
            {age != null && ` · ${age}`}
          </div>
        </div>
      </header>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 px-1">
          {chips.map((c, i) => (
            <span key={i} className="rounded-full border border-line bg-card px-3 py-1.5 text-[13px] text-ink-soft">
              {c.k && <span className="text-ink-faint">{c.k} </span>}
              {c.v}
            </span>
          ))}
        </div>
      )}

      <HowRelated person={person} />

      <Section
        label="Parents"
        action={manageAction(
          'parents',
          family.parents.length > 0,
          family.parents.length > 0 && family.parents.length < 2 ? (
            <AddHint onClick={() => openSheet(family.parents[0]?.person.gender === 'male' ? 'mother' : 'father')}>
              Add parent
            </AddHint>
          ) : null,
        )}
      >
        {family.parents.map(({ person: p, relation, unionId }) => (
          <div key={p.id} className="flex items-center">
            <div className="min-w-0 flex-1">
              <PersonRow
                person={p}
                chip={relationChip(relation)}
                hint={hintOf(p)}
                onClick={manage === 'parents' ? undefined : () => nav(`/p/${p.id}`)}
              />
            </div>
            {manage === 'parents' && (
              <UnlinkX
                label={`Remove ${p.name} as parent`}
                onClick={() => {
                  const sibs = family.siblings
                    .filter((s) => s.unionId === unionId && s.kind === 'full')
                    .map((s) => s.person.name);
                  setConfirm({
                    title: `Remove ${p.name} as ${person.name}’s parent?`,
                    message: `${p.name} will no longer be recorded as a parent of ${person.name}${
                      sibs.length ? ` or ${sibs.join(', ')}` : ''
                    }. ${p.name} stays in the tree.`,
                    confirmLabel: 'Remove link',
                    danger: true,
                    action: async () => {
                      await removePartnerFromUnion(unionId, p.id);
                      unlinkToast(p.name);
                    },
                  });
                }}
              />
            )}
          </div>
        ))}
        {family.parents.length === 0 && (
          <div className="flex">
            <AddHint onClick={() => openSheet('father')}>Father</AddHint>
            <AddHint onClick={() => openSheet('mother')}>Mother</AddHint>
          </div>
        )}
      </Section>

      <Section
        label="Siblings"
        action={manageAction(
          'siblings',
          family.siblings.some((s) => s.kind === 'full'),
          family.siblings.length > 0 ? <AddHint onClick={() => openSheet('brother')}>Add</AddHint> : null,
        )}
      >
        {family.siblings.map(({ person: p, kind, relation, unionId }) => (
          <div key={p.id} className="flex items-center">
            <div className="min-w-0 flex-1">
              <PersonRow
                person={p}
                chip={relationChip(relation) || (kind === 'half' ? 'half' : null)}
                hint={hintOf(p)}
                onClick={manage === 'siblings' ? undefined : () => nav(`/p/${p.id}`)}
              />
            </div>
            {manage === 'siblings' && kind === 'full' && (
              <UnlinkX
                label={`Remove the sibling link with ${p.name}`}
                onClick={() =>
                  setConfirm({
                    title: `Remove the sibling link with ${p.name}?`,
                    message: `${p.name} will no longer share parents with ${person.name}. ${p.name} stays in the tree.`,
                    confirmLabel: 'Remove link',
                    danger: true,
                    action: async () => {
                      await removeChildLink(p.id, unionId);
                      unlinkToast(p.name);
                    },
                  })
                }
              />
            )}
          </div>
        ))}
        {family.siblings.length === 0 && (
          <div className="flex">
            <AddHint onClick={() => openSheet('brother')}>Brother</AddHint>
            <AddHint onClick={() => openSheet('sister')}>Sister</AddHint>
          </div>
        )}
      </Section>

      <Section
        label={family.unions.length > 1 ? 'Marriages & children' : 'Marriage & children'}
        action={manageAction(
          'unions',
          family.unions.some((u) => u.partner || u.children.length > 0),
          family.unions.length > 0 ? <AddHint onClick={() => openSheet('spouse')}>Add</AddHint> : null,
        )}
      >
        {family.unions.map((u) => (
          <div key={u.union.id} className="not-first:mt-2 not-first:border-t not-first:border-line not-first:pt-2">
            {u.partner ? (
              <div className="flex items-center">
                <div className="min-w-0 flex-1">
                  <PersonRow
                    person={u.partner}
                    chip={u.union.status && u.union.status !== 'married' ? u.union.status : null}
                    meta={unionMeta(u)}
                    hint={hintOf(u.partner)}
                    onClick={manage === 'unions' ? undefined : () => nav(`/p/${u.partner.id}`)}
                  />
                </div>
                {manage === 'unions' ? (
                  <UnlinkX
                    label={`Remove the marriage with ${u.partner.name}`}
                    onClick={() =>
                      setConfirm({
                        title: `Remove the marriage with ${u.partner.name}?`,
                        message: u.children.length
                          ? `${u.children.map((c) => c.person.name).join(', ')} stay${
                              u.children.length === 1 ? 's' : ''
                            } with ${person.name}. ${u.partner.name} stays in the tree.`
                          : `${u.partner.name} stays in the tree — only the marriage record is removed.`,
                        confirmLabel: 'Remove link',
                        danger: true,
                        action: async () => {
                          await removePartnerFromUnion(u.union.id, u.partner.id);
                          unlinkToast(u.partner.name);
                        },
                      })
                    }
                  />
                ) : (
                  <button
                    type="button"
                    aria-label={`Edit marriage with ${u.partner.name}`}
                    onClick={() =>
                      setUnionEdit({ union: u.union, names: `${person.name} & ${u.partner.name}` })
                    }
                    className="mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-accent-soft/40 hover:text-accent-deep"
                  >
                    <Pencil className="size-4" />
                  </button>
                )}
              </div>
            ) : (
              <AddHint onClick={() => openSheet('spouse', u.union.id)}>Add partner</AddHint>
            )}
            {u.children.length > 0 && (
              <div className="ml-5 border-l-2 border-line pl-2">
                {u.children.map(({ person: c, relation }) => (
                  <div key={c.id} className="flex items-center">
                    <div className="min-w-0 flex-1">
                      <PersonRow
                        person={c}
                        chip={relationChip(relation)}
                        hint={hintOf(c)}
                        onClick={manage === 'unions' ? undefined : () => nav(`/p/${c.id}`)}
                      />
                    </div>
                    {manage === 'unions' && (
                      <UnlinkX
                        label={`Remove ${c.name} as a child of this marriage`}
                        onClick={() =>
                          setConfirm({
                            title: `Remove ${c.name} as a child of this marriage?`,
                            message: `${c.name} stays in the tree — only the child link is removed.`,
                            confirmLabel: 'Remove link',
                            danger: true,
                            action: async () => {
                              await removeChildLink(c.id, u.union.id);
                              unlinkToast(c.name);
                            },
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="ml-5 pl-2">
              <AddHint onClick={() => openSheet(person.gender === 'female' ? 'daughter' : 'son')}>Child</AddHint>
            </div>
          </div>
        ))}
        {family.unions.length === 0 && (
          <div className="flex">
            <AddHint onClick={() => openSheet('spouse')}>Spouse</AddHint>
            <AddHint onClick={() => openSheet('son')}>Child</AddHint>
          </div>
        )}
      </Section>

      {person.notes && (
        <Section label="Story">
          <p className="whitespace-pre-wrap px-2.5 py-2 text-[14.5px] leading-relaxed text-ink-soft">{person.notes}</p>
        </Section>
      )}

      {person.privateNotes && (
        <Section
          label="Private note"
          action={<Lock className="size-3.5 text-ink-faint" />}
        >
          <p className="whitespace-pre-wrap px-2.5 py-2 text-[14.5px] leading-relaxed text-ink-soft">
            {person.privateNotes}
          </p>
          <p className="px-2.5 pb-2 text-[11.5px] text-ink-faint">Only on this device — never in a shared export.</p>
        </Section>
      )}

      <button
        type="button"
        onClick={() => openSheet(null)}
        className={
          panel
            ? 'sticky bottom-4 z-10 mx-auto mt-8 flex w-fit items-center gap-1.5 rounded-full bg-accent px-5 py-3 text-[15px] font-semibold text-[#fff8f3] shadow-pop transition-colors hover:bg-accent-deep active:bg-accent-deep'
            : 'fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-5 py-3.5 text-[15px] font-semibold text-[#fff8f3] shadow-pop transition-colors active:bg-accent-deep'
        }
      >
        <Plus className="size-5" />
        Add relative
      </button>

      <AddRelativeSheet
        anchor={person}
        family={family}
        open={sheet.open}
        initialRoleKey={sheet.role}
        targetUnionId={sheet.targetUnionId}
        onClose={() => setSheet({ open: false, role: null, targetUnionId: null })}
      />
      <UnionSheet
        open={!!unionEdit}
        union={unionEdit?.union}
        names={unionEdit?.names}
        onClose={() => setUnionEdit(null)}
      />
      <ConfirmSheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onConfirm={() => confirm?.action()}
      />
    </div>
  );
}
