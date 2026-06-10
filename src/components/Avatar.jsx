import { toneFor, initialsOf } from '../lib/avatar.js';
import { photoUrlFor } from '../lib/photos.js';

const SIZES = {
  sm: 'size-9 text-[13px]',
  md: 'size-11 text-[15px]',
  lg: 'size-16 text-[22px]',
  xl: 'size-24 text-[34px]',
};

export default function Avatar({ person, size = 'md', showSelf = true, className = '' }) {
  const url = photoUrlFor(person);
  const tone = toneFor(person.id);
  const dead = !person.isAlive;
  return (
    <div className={`relative shrink-0 ${SIZES[size]} ${className}`}>
      {url ? (
        <img
          src={url}
          alt={person.name}
          className={`size-full rounded-full object-cover ${dead ? 'grayscale-[0.4] opacity-90' : ''}`}
        />
      ) : (
        <div
          className="flex size-full items-center justify-center rounded-full font-display font-semibold"
          style={{ background: tone.bg, color: tone.fg, opacity: dead ? 0.78 : 1 }}
        >
          {initialsOf(person.name)}
        </div>
      )}
      {showSelf && person.isSelf && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-accent px-1.5 py-px text-[9px] font-bold tracking-wide text-[#fff8f3] ring-2 ring-paper">
          YOU
        </span>
      )}
    </div>
  );
}
