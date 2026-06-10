// The Kutumbakam mark — two elders and a descendant joined by one thread.
// Placeholder until the real brand brief.
export default function Mark({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M20 24 H44 M32 24 V40" stroke="var(--color-accent)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="24" r="7" fill="var(--color-accent)" />
      <circle cx="44" cy="24" r="7" fill="#c4714f" />
      <circle cx="32" cy="44" r="7" fill="var(--color-ink)" />
    </svg>
  );
}
