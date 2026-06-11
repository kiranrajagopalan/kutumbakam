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

// Builds an undirected neighbour function over the graph (parents, children,
// spouses, siblings-via-union) — shared by the helpers below.
function neighbourFn({ persons, unions, childLinks }) {
  const unionById = new Map(unions.map((u) => [u.id, u]));
  const parentUnionsOf = new Map();
  const childrenOfUnion = new Map();
  for (const l of childLinks) {
    parentUnionsOf.set(l.childId, [...(parentUnionsOf.get(l.childId) || []), l.unionId]);
    childrenOfUnion.set(l.unionId, [...(childrenOfUnion.get(l.unionId) || []), l.childId]);
  }
  const unionsOf = new Map();
  for (const u of unions) {
    for (const pid of u.partnerIds) unionsOf.set(pid, [...(unionsOf.get(pid) || []), u]);
  }
  return {
    neighbours: (pid) => [
      ...(parentUnionsOf.get(pid) || []).flatMap((uid) => unionById.get(uid)?.partnerIds || []),
      ...(unionsOf.get(pid) || []).flatMap((u) => [
        ...u.partnerIds.filter((x) => x !== pid),
        ...(childrenOfUnion.get(u.id) || []),
      ]),
      ...(parentUnionsOf.get(pid) || []).flatMap((uid) =>
        (childrenOfUnion.get(uid) || []).filter((x) => x !== pid),
      ),
    ],
    unionsOf,
    childrenOfUnion,
  };
}

// The "branch" of a person: themselves, all their descendants, and everyone
// married to any of them.
export function branchMembers(graph, rootId) {
  const { unionsOf, childrenOfUnion } = neighbourFn(graph);
  const set = new Set([rootId]);
  let frontier = [rootId];
  while (frontier.length) {
    const next = [];
    for (const id of frontier) {
      for (const u of unionsOf.get(id) || []) {
        for (const kid of childrenOfUnion.get(u.id) || []) {
          if (!set.has(kid)) {
            set.add(kid);
            next.push(kid);
          }
        }
      }
    }
    frontier = next;
  }
  for (const id of [...set]) {
    for (const u of unionsOf.get(id) || []) for (const pid of u.partnerIds) set.add(pid);
  }
  return set;
}

// Groups extended-class people into in-law family clusters, each anchored to
// the married-in person they attach through ("Anupam's family"). The tree
// renders collapsed clusters as capsules.
export function inLawClusters(graph, classes) {
  if (!classes) return [];
  const { neighbours } = neighbourFn(graph);
  const extended = new Set(
    graph.persons.filter((p) => classes.get(p.id) === 'extended').map((p) => p.id),
  );
  const seen = new Set();
  const byAnchor = new Map();
  for (const start of extended) {
    if (seen.has(start)) continue;
    const members = new Set([start]);
    const anchors = new Set();
    seen.add(start);
    let queue = [start];
    while (queue.length) {
      const cur = queue.pop();
      for (const nb of neighbours(cur)) {
        if (extended.has(nb)) {
          if (!seen.has(nb)) {
            seen.add(nb);
            members.add(nb);
            queue.push(nb);
          }
        } else if (classes.get(nb) === 'married') {
          anchors.add(nb);
        }
      }
    }
    const anchorId = [...anchors][0] || start;
    if (!byAnchor.has(anchorId)) byAnchor.set(anchorId, new Set());
    const merged = byAnchor.get(anchorId);
    for (const m of members) merged.add(m);
  }
  return [...byAnchor].map(([anchorId, members]) => ({
    key: `cap-${anchorId}`,
    anchorId,
    members,
  }));
}
