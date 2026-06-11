// GEDCOM 5.5.1 export — the standard family-tree interchange format, so the
// data is never trapped in this app. Pure function over a graph snapshot.
//
// Privacy: the sensitive class (phone, privateNotes) is NEVER emitted — a
// .ged file is a sharing surface, same rules as the shareable JSON. Photos
// are not embedded (not portable in a single text file).
//
// Non-standard note: PEDI accepts adopted/birth/foster in 5.5.1. We emit
// "2 PEDI step" for step-links anyway — readable by humans, ignored by strict
// parsers, and far more honest than mislabelling it.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function gedDate(dateStr, year, approx) {
  if (dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (y && m && d) return `${d} ${MONTHS[m - 1]} ${y}`;
    if (y && m) return `${MONTHS[m - 1]} ${y}`;
    if (y) return String(y);
  }
  if (year) return `${approx ? 'ABT ' : ''}${year}`;
  return null;
}

export function buildGedcom({ persons, unions, childLinks }) {
  const lines = [];
  const push = (level, tag, value) => lines.push(`${level} ${tag}${value ? ` ${value}` : ''}`);

  // Long values split per spec: CONT for newlines, CONC for length.
  const pushText = (level, tag, text) => {
    const parts = String(text).split('\n');
    parts.forEach((part, i) => {
      let rest = part;
      let first = true;
      do {
        const chunk = rest.slice(0, 200);
        rest = rest.slice(200);
        push(i === 0 && first ? level : level + 1, i === 0 && first ? tag : first ? 'CONT' : 'CONC', chunk);
        first = false;
      } while (rest.length);
    });
  };

  const iid = new Map(persons.map((p, i) => [p.id, `@I${i + 1}@`]));
  const fid = new Map(unions.map((u, i) => [u.id, `@F${i + 1}@`]));
  const linksOfChild = new Map();
  const linksOfUnion = new Map();
  for (const l of childLinks) {
    if (!iid.has(l.childId) || !fid.has(l.unionId)) continue;
    linksOfChild.set(l.childId, [...(linksOfChild.get(l.childId) || []), l]);
    linksOfUnion.set(l.unionId, [...(linksOfUnion.get(l.unionId) || []), l]);
  }

  push(0, 'HEAD');
  push(1, 'SOUR', 'KUTUMBAKAM');
  push(2, 'NAME', 'Kutumbakam');
  push(1, 'GEDC');
  push(2, 'VERS', '5.5.1');
  push(2, 'FORM', 'LINEAGE-LINKED');
  push(1, 'CHAR', 'UTF-8');

  for (const p of persons) {
    push(0, `${iid.get(p.id)} INDI`.trim());
    push(1, 'NAME', p.name || 'Unknown');
    if (p.nickname) push(2, 'NICK', p.nickname);
    push(1, 'SEX', p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : 'U');

    const birth = gedDate(p.birthDate, p.birthYear, p.birthApprox);
    if (birth || p.nativePlace) {
      push(1, 'BIRT');
      if (birth) push(2, 'DATE', birth);
      if (p.nativePlace) push(2, 'PLAC', p.nativePlace);
    }
    if (!p.isAlive) {
      const death = gedDate(p.deathDate, p.deathYear, p.deathApprox);
      push(1, 'DEAT', death ? '' : 'Y');
      if (death) push(2, 'DATE', death);
    }
    if (p.occupation) push(1, 'OCCU', p.occupation);
    if (p.currentCity) {
      push(1, 'RESI');
      push(2, 'PLAC', p.currentCity);
    }
    const noteBits = [p.familyHouse ? `Family house: ${p.familyHouse}` : '', p.notes || '']
      .filter(Boolean)
      .join('\n');
    if (noteBits) pushText(1, 'NOTE', noteBits);

    for (const l of linksOfChild.get(p.id) || []) {
      push(1, 'FAMC', fid.get(l.unionId));
      if (l.relation === 'adoptive') push(2, 'PEDI', 'adopted');
      if (l.relation === 'step') push(2, 'PEDI', 'step');
    }
    for (const u of unions) {
      if (u.partnerIds.includes(p.id)) push(1, 'FAMS', fid.get(u.id));
    }
  }

  for (const u of unions) {
    push(0, `${fid.get(u.id)} FAM`.trim());
    const partners = u.partnerIds.map((id) => persons.find((p) => p.id === id)).filter(Boolean);
    const male = partners.find((p) => p.gender === 'male');
    const female = partners.find((p) => p.gender === 'female');
    const rest = partners.filter((p) => p !== male && p !== female);
    const husb = male || rest.shift() || null;
    const wife = female || rest.shift() || null;
    if (husb) push(1, 'HUSB', iid.get(husb.id));
    if (wife) push(1, 'WIFE', iid.get(wife.id));
    if (u.partnerIds.length === 2) {
      push(1, 'MARR');
      if (u.marriageYear) push(2, 'DATE', String(u.marriageYear));
      if (u.status === 'divorced') push(1, 'DIV', 'Y');
    }
    for (const l of linksOfUnion.get(u.id) || []) {
      push(1, 'CHIL', iid.get(l.childId));
    }
  }

  push(0, 'TRLR');
  return lines.join('\n') + '\n';
}
