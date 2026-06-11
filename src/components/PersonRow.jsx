import Avatar from './Avatar.jsx';
import { lifeSpan } from '../lib/format.js';

// One person, one row. `chip` is a tiny status tag ("adopted", "half", …),
// `meta` is appended to the secondary line ("m. 1982"), `hint` is the
// same-name disambiguator ("s/o Achutha") and leads the line when present.
export default function PersonRow({ person, chip, meta, hint, onClick, trailing }) {
  const chips = [chip, person.isSelf && 'You'].filter(Boolean);
  const sub = [hint, person.nickname && `“${person.nickname}”`, lifeSpan(person), meta]
    .filter(Boolean)
    .join('  ·  ');
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[13px] px-2.5 py-2 text-left transition-colors hover:bg-accent-soft/35 active:bg-accent-soft/60"
    >
      <Avatar person={person} size="md" showSelf={false} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-display text-[17px] font-medium leading-snug">
            {person.name || 'Unnamed'}
          </span>
          {chips.map((c) => (
            <span
              key={c}
              className="shrink-0 rounded-chip bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-accent-deep"
            >
              {c}
            </span>
          ))}
        </span>
        {sub && <span className="tnum block truncate text-[13px] leading-snug text-ink-soft">{sub}</span>}
      </span>
      {trailing}
    </button>
  );
}
