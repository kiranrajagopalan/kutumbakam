const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function yearLabel(year, approx) {
  if (!year) return null;
  return `${approx ? 'c. ' : ''}${year}`;
}

// Full-precision label: "12 Mar 1934" / "Mar 1934" / "c. 1934" / "12 Mar"
// (birthday known, year unknown — common for elders). Day is only shown with
// its month; circa only qualifies a year.
function fullLabel(year, approx, month, day) {
  const md = month ? `${day ? `${day} ` : ''}${MONTHS[month - 1]}` : '';
  const y = yearLabel(year, approx);
  if (md && y) return `${md} ${y}`;
  return y || md || null;
}

// `full` (person-page header only — decided 12 Jun 2026): show day + month
// when known. Everywhere dense (rows, pickers, tree) stays year-only.
export function lifeSpan(p, full = false) {
  const b = full ? fullLabel(p.birthYear, p.birthApprox, p.birthMonth, p.birthDay) : yearLabel(p.birthYear, p.birthApprox);
  const d = !p.isAlive
    ? full
      ? fullLabel(p.deathYear, p.deathApprox, p.deathMonth, p.deathDay)
      : yearLabel(p.deathYear, p.deathApprox)
    : null;
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
  const now = new Date();
  let age = now.getFullYear() - p.birthYear;
  // Exact when the birthday is known: not yet celebrated this year → one less.
  if (p.birthMonth) {
    const m = now.getMonth() + 1;
    if (m < p.birthMonth || (m === p.birthMonth && p.birthDay && now.getDate() < p.birthDay)) age -= 1;
  }
  return age;
}

// "YYYY-MM-DD" / "YYYY-MM" when year + month are known (GEDCOM wants a year).
export function isoDateOf(p, kind = 'birth') {
  const y = p[`${kind}Year`];
  const m = p[`${kind}Month`];
  if (!y || !m) return '';
  const d = p[`${kind}Day`];
  return d ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : `${y}-${String(m).padStart(2, '0')}`;
}

// Precision-aware comparison: only decides on a part BOTH sides know —
// "March 1960" vs "1960" must stay undecided, not let the longer key win.
// Returns -1 / 0 / 1 with 0 meaning "the dates can't say".
export function compareLifeDates(a, b, kind = 'birth') {
  const ya = a[`${kind}Year`];
  const yb = b[`${kind}Year`];
  if (!ya || !yb) return 0;
  if (ya !== yb) return ya < yb ? -1 : 1;
  const ma = a[`${kind}Month`];
  const mb = b[`${kind}Month`];
  if (!ma || !mb) return 0;
  if (ma !== mb) return ma < mb ? -1 : 1;
  const da = a[`${kind}Day`];
  const db = b[`${kind}Day`];
  if (!da || !db) return 0;
  return da === db ? 0 : da < db ? -1 : 1;
}

// Sort siblings/children: known dates first (chronological), then by explicit
// birth order, then by name. Indian kinship needs elder/younger to be right.
export function compareBirth(a, b) {
  const c = compareLifeDates(a, b, 'birth');
  if (c) return c;
  const oa = a.birthOrder ?? 999;
  const ob = b.birthOrder ?? 999;
  if (oa !== ob) return oa - ob;
  return (a.name || '').localeCompare(b.name || '');
}
