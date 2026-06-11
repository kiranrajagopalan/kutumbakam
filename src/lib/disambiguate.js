// When two people share the exact same name (families recycle names —
// grandsons carry grandfathers' names), every surface that shows names adds a
// differentiator. Style chosen by Kiran: parent reference ("s/o Achutha",
// "d/o Devaki"), falling back to birth year, then place.
export function computeNameHints({ persons, unions, childLinks }) {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const unionById = new Map(unions.map((u) => [u.id, u]));
  const parentLinksOf = new Map();
  for (const l of childLinks) {
    parentLinksOf.set(l.childId, [...(parentLinksOf.get(l.childId) || []), l]);
  }

  const byName = new Map();
  for (const p of persons) {
    const key = p.name.trim().toLowerCase();
    if (!key) continue;
    byName.set(key, [...(byName.get(key) || []), p]);
  }

  const hints = new Map();
  for (const [, clash] of byName) {
    if (clash.length < 2) continue;
    for (const p of clash) {
      const links = parentLinksOf.get(p.id) || [];
      const link = links.find((l) => l.relation !== 'adoptive' && l.relation !== 'step') || links[0];
      const parents = (link ? unionById.get(link.unionId)?.partnerIds || [] : [])
        .map((id) => byId.get(id))
        .filter(Boolean);
      const ref = parents.find((x) => x.gender === 'male') || parents.find((x) => x.gender === 'female') || parents[0];
      // No year fallback — every surface already shows birth years.
      let hint = null;
      if (ref) {
        const prefix = p.gender === 'female' ? 'd/o' : p.gender === 'male' ? 's/o' : 'of';
        hint = `${prefix} ${ref.name.split(/\s+/)[0]}`;
      } else if (p.nativePlace) {
        hint = p.nativePlace;
      } else if (p.currentCity) {
        hint = p.currentCity;
      }
      if (hint) hints.set(p.id, hint);
    }
  }
  return hints;
}
