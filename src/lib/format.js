export function yearLabel(year, approx) {
  if (!year) return null;
  return `${approx ? 'c. ' : ''}${year}`;
}

export function lifeSpan(p) {
  const b = yearLabel(p.birthYear, p.birthApprox);
  const d = !p.isAlive ? yearLabel(p.deathYear, p.deathApprox) : null;
  if (b && d) return `${b} – ${d}`;
  if (!p.isAlive) {
    if (b) return `${b} – ·`;
    if (d) return `· – ${d}`;
    return 'no longer living';
  }
  return b ? `b. ${b}` : '';
}

export function ageOf(p) {
  if (!p.isAlive || !p.birthYear) return null;
  return new Date().getFullYear() - p.birthYear;
}

// Sort siblings/children: known dates first (chronological), then by explicit
// birth order, then by name. Indian kinship needs elder/younger to be right.
export function compareBirth(a, b) {
  const ka = a.birthDate || (a.birthYear ? String(a.birthYear) : null);
  const kb = b.birthDate || (b.birthYear ? String(b.birthYear) : null);
  if (ka && kb && ka !== kb) return ka.localeCompare(kb);
  const oa = a.birthOrder ?? 999;
  const ob = b.birthOrder ?? 999;
  if (oa !== ob) return oa - ob;
  return (a.name || '').localeCompare(b.name || '');
}
