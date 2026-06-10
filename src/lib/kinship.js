// Classifies everyone in the graph relative to a focal person ("you").
// Pure function over a snapshot — the list view groups by it today, and the
// tree view (M2) and relationship explainer (M3) will reuse it.
//
//   blood        you, your ancestors, and every descendant of an ancestor
//                (aunts, cousins…). Adoptive links count as kin links.
//   married      spouses of blood relatives (married into the family)
//   extended     connected to the graph only through a married-in person —
//                their parents, siblings, etc.
//   unconnected  in the database but with no relationship path to you yet
export function classifyByKinship({ persons, unions, childLinks }, selfId) {
  if (!selfId) return null;

  const unionById = new Map(unions.map((u) => [u.id, u]));
  const parentUnionsOf = new Map(); // childId  -> [unionId]
  const childrenOfUnion = new Map(); // unionId -> [childId]
  for (const l of childLinks) {
    parentUnionsOf.set(l.childId, [...(parentUnionsOf.get(l.childId) || []), l.unionId]);
    childrenOfUnion.set(l.unionId, [...(childrenOfUnion.get(l.unionId) || []), l.childId]);
  }
  const unionsOf = new Map(); // personId -> [union]
  for (const u of unions) {
    for (const pid of u.partnerIds) unionsOf.set(pid, [...(unionsOf.get(pid) || []), u]);
  }

  const parentsOf = (pid) =>
    (parentUnionsOf.get(pid) || []).flatMap((uid) => unionById.get(uid)?.partnerIds || []);
  const childrenOf = (pid) =>
    (unionsOf.get(pid) || []).flatMap((u) => childrenOfUnion.get(u.id) || []);
  const spousesOf = (pid) =>
    (unionsOf.get(pid) || []).flatMap((u) => u.partnerIds.filter((x) => x !== pid));

  const grow = (seed, expand) => {
    const seen = new Set(seed);
    let frontier = [...seed];
    while (frontier.length) {
      frontier = frontier.flatMap(expand).filter((p) => !seen.has(p));
      frontier.forEach((p) => seen.add(p));
    }
    return seen;
  };

  const ancestors = grow([selfId], parentsOf);
  const blood = grow([...ancestors], childrenOf);
  const married = new Set();
  for (const pid of blood) {
    for (const s of spousesOf(pid)) if (!blood.has(s)) married.add(s);
  }
  const connected = grow([selfId], (pid) => [...parentsOf(pid), ...childrenOf(pid), ...spousesOf(pid)]);

  const result = new Map();
  for (const p of persons) {
    result.set(
      p.id,
      blood.has(p.id) ? 'blood' : married.has(p.id) ? 'married' : connected.has(p.id) ? 'extended' : 'unconnected',
    );
  }
  return result;
}
