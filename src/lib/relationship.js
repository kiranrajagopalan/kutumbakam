// "How are we related?" — finds the connection paths between any two people
// and spells each one as a chain you could say aloud at a family function:
// "your mother's younger brother's daughter". Pure functions over a graph
// snapshot { persons, unions, childLinks } — no DOM, no Dexie.
//
// Paths walk a bipartite person↔union graph, so every person-to-person step
// crosses exactly one union and is one of: parent, child, spouse, sibling
// (co-children of that union). Forbidding union revisits canonicalizes the
// walk — "up to a parent and back down to their other child" can't appear as
// a separate path from the sibling step, and "wife" can't be respelled as
// "child's mother".
import { TERMS } from './kinshipTerms.js';
import { compareLifeDates } from './format.js';

const MAX_STEPS = 9; // longest chain worth spelling out
const MAX_PATHS = 60; // DFS safety valve on dense graphs

function indexGraph(graph) {
  const personById = new Map(graph.persons.map((p) => [p.id, p]));
  const unionById = new Map(graph.unions.map((u) => [u.id, u]));
  const partnerUnionsOf = new Map(); // personId -> [union]
  for (const u of graph.unions) {
    for (const pid of u.partnerIds) {
      partnerUnionsOf.set(pid, [...(partnerUnionsOf.get(pid) || []), u]);
    }
  }
  const childLinksOf = new Map(); // childId -> [link]
  const linksOfUnion = new Map(); // unionId -> [link]
  for (const l of graph.childLinks) {
    childLinksOf.set(l.childId, [...(childLinksOf.get(l.childId) || []), l]);
    linksOfUnion.set(l.unionId, [...(linksOfUnion.get(l.unionId) || []), l]);
  }
  return { personById, unionById, partnerUnionsOf, childLinksOf, linksOfUnion };
}

// All simple paths (no repeated person, no repeated union) from one person to
// another, as lists of typed steps.
export function findRelationPaths(graph, fromId, toId, opts = {}) {
  const ix = opts.ix || indexGraph(graph);
  const maxSteps = opts.maxSteps ?? MAX_STEPS;
  const maxPaths = opts.maxPaths ?? MAX_PATHS;
  if (fromId === toId || !ix.personById.has(fromId) || !ix.personById.has(toId)) return [];

  const paths = [];
  const onPath = new Set([fromId]);
  const usedUnions = new Set();
  const steps = [];

  function exitTo(step) {
    if (paths.length >= maxPaths) return;
    steps.push(step);
    if (step.toId === toId) {
      paths.push(steps.slice());
    } else if (steps.length < maxSteps) {
      visit(step.toId);
    }
    steps.pop();
  }

  function crossUnion(pid, u, enterLink) {
    if (usedUnions.has(u.id) || paths.length >= maxPaths) return;
    usedUnions.add(u.id);
    for (const partnerId of u.partnerIds) {
      if (partnerId === pid || onPath.has(partnerId)) continue;
      onPath.add(partnerId);
      exitTo(
        enterLink
          ? { kind: 'parent', fromId: pid, toId: partnerId, rel: enterLink.relation, unionId: u.id }
          : { kind: 'spouse', fromId: pid, toId: partnerId, status: u.status || '', unionId: u.id },
      );
      onPath.delete(partnerId);
    }
    for (const link of ix.linksOfUnion.get(u.id) || []) {
      if (link.childId === pid || onPath.has(link.childId)) continue;
      onPath.add(link.childId);
      exitTo(
        enterLink
          ? {
              kind: 'sibling',
              fromId: pid,
              toId: link.childId,
              enterRel: enterLink.relation,
              exitRel: link.relation,
              unionId: u.id,
            }
          : { kind: 'child', fromId: pid, toId: link.childId, rel: link.relation, unionId: u.id },
      );
      onPath.delete(link.childId);
    }
    usedUnions.delete(u.id);
  }

  function visit(pid) {
    for (const u of ix.partnerUnionsOf.get(pid) || []) crossUnion(pid, u, null);
    for (const link of ix.childLinksOf.get(pid) || []) {
      const u = ix.unionById.get(link.unionId);
      if (u) crossUnion(pid, u, link);
    }
  }

  visit(fromId);
  return paths;
}

// "father's son (by another union)" → half-sibling. Only when both hops are
// biological — "adoptive father's son" should stay spelled out.
function collapseHalfSiblings(steps) {
  const out = [];
  for (const s of steps) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.kind === 'parent' &&
      s.kind === 'child' &&
      prev.rel === 'biological' &&
      s.rel === 'biological'
    ) {
      out[out.length - 1] = { kind: 'half', fromId: prev.fromId, toId: s.toId, viaId: prev.toId };
      continue;
    }
    out.push(s);
  }
  return out;
}

// 'elder' / 'younger' / '' — only when the data actually says so (date parts
// both sides know, else explicit birth order that differs). Never decided by
// a name fallback, and "March 1960" vs "1960" stays undecided.
function elderFlag(to, from) {
  const c = compareLifeDates(to, from, 'birth');
  if (c) return c < 0 ? 'elder' : 'younger';
  if (to.birthOrder != null && from.birthOrder != null && to.birthOrder !== from.birthOrder) {
    return to.birthOrder < from.birthOrder ? 'elder' : 'younger';
  }
  return '';
}

// One rendered word per step. `plain` marks tokens that collapse rules may
// absorb — anything carrying adopted/step/former must stay spelled out.
function tokenFor(step, ix) {
  const to = ix.personById.get(step.toId);
  const from = ix.personById.get(step.fromId);
  const g = to?.gender;

  if (step.kind === 'parent') {
    const base = g === 'male' ? 'father' : g === 'female' ? 'mother' : 'parent';
    const key = g === 'male' ? 'F' : g === 'female' ? 'M' : 'P';
    if (step.rel === 'adoptive') return { key, word: `adoptive ${base}`, plain: false };
    if (step.rel === 'step') return { key, word: `step${base}`, plain: false };
    return { key, word: base, plain: true };
  }
  if (step.kind === 'child') {
    const base = g === 'male' ? 'son' : g === 'female' ? 'daughter' : 'child';
    const key = g === 'male' ? 'S' : g === 'female' ? 'D' : 'C';
    if (step.rel === 'adoptive') return { key, word: `adopted ${base}`, plain: false };
    if (step.rel === 'step') return { key, word: `step${base}`, plain: false };
    return { key, word: base, plain: true };
  }
  if (step.kind === 'spouse') {
    const base = g === 'male' ? 'husband' : g === 'female' ? 'wife' : 'spouse';
    const key = g === 'male' ? 'H' : g === 'female' ? 'W' : 'X';
    if (step.status === 'divorced') return { key, word: `former ${base}`, plain: false };
    return { key, word: base, plain: true };
  }

  // sibling | half
  const base = g === 'male' ? 'brother' : g === 'female' ? 'sister' : 'sibling';
  const kb = g === 'male' ? 'B' : g === 'female' ? 'Z' : 'G';
  const age = to && from ? elderFlag(to, from) : '';
  const ageWord = age ? `${age} ` : '';
  const ageKey = age ? age[0] : '';
  if (step.kind === 'half') {
    return { key: `h${ageKey}${kb}`, word: `${ageWord}half-${base}`, plain: true };
  }
  const rel =
    step.exitRel !== 'biological' ? step.exitRel : step.enterRel !== 'biological' ? step.enterRel : 'biological';
  if (rel === 'adoptive') return { key: ageKey + kb, word: `adopted ${ageWord}${base}`, plain: false };
  if (rel === 'step') return { key: ageKey + kb, word: `step${base}`, plain: false };
  return { key: ageKey + kb, word: `${ageWord}${base}`, plain: true };
}

const UP = new Set(['F', 'M', 'P']);
const DOWN = new Set(['S', 'D', 'C']);

// Runs of 2+ parent steps become grandparents ("mother's father" → "maternal
// grandfather"), runs of child steps become grandchildren — anywhere in the
// chain ("wife's maternal grandfather").
function collapseRuns(tokens) {
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    const set = t.plain && UP.has(t.key) ? UP : t.plain && DOWN.has(t.key) ? DOWN : null;
    if (set) {
      let j = i + 1;
      while (j < tokens.length && tokens[j].plain && set.has(tokens[j].key)) j++;
      if (j - i >= 2) {
        const run = tokens.slice(i, j);
        const greats = 'great-'.repeat(run.length - 2);
        const last = run[run.length - 1].key;
        const word =
          set === UP
            ? `${run[0].key === 'F' ? 'paternal ' : run[0].key === 'M' ? 'maternal ' : ''}${greats}${
                last === 'F' ? 'grandfather' : last === 'M' ? 'grandmother' : 'grandparent'
              }`
            : `${greats}${last === 'S' ? 'grandson' : last === 'D' ? 'granddaughter' : 'grandchild'}`;
        out.push({ key: run.map((r) => r.key).join('.'), word, plain: false });
        i = j;
        continue;
      }
    }
    out.push(t);
    i++;
  }
  return out;
}

// Adjacent plain tokens matching a term-table n-gram collapse to the term
// ("wife's mother" → "mother-in-law"). Longest match first, left to right.
function collapseTerms(tokens, lang) {
  const table = TERMS[lang] || {};
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = null;
    for (let n = Math.min(3, tokens.length - i); n >= 2; n--) {
      const slice = tokens.slice(i, i + n);
      if (!slice.every((t) => t.plain)) continue;
      const key = slice.map((t) => t.key).join('.');
      if (table[key]) {
        matched = { n, word: table[key], key };
        break;
      }
    }
    if (matched) {
      out.push({ key: matched.key, word: matched.word, plain: false });
      i += matched.n;
    } else {
      out.push(tokens[i]);
      i += 1;
    }
  }
  return out;
}

function renderBody(steps, ix, lang) {
  let tokens = steps.map((s) => tokenFor(s, ix));
  if (tokens.every((t) => t.plain)) {
    const whole = (TERMS[lang] || {})[tokens.map((t) => t.key).join('.')];
    if (whole) return whole;
  }
  tokens = collapseRuns(tokens);
  tokens = collapseTerms(tokens, lang);
  return tokens.map((t) => t.word).join('’s ');
}

// The one call screens use.
//   { kind: 'self' }                          anchor and target are the same
//   { kind: 'none' }                          no recorded connection
//   { kind: 'related', head, primary, also, more }
//     head     "your" or "Asha’s" — prepend to any body
//     primary  { body, steps }                the closest chain
//     also     [{ body, steps }]              other genuinely different routes
//     more     count of further routes not listed
export function describeRelationship(graph, anchorId, targetId, opts = {}) {
  const ix = opts.ix || indexGraph(graph);
  const lang = opts.lang || 'en';
  const anchor = ix.personById.get(anchorId);
  const target = ix.personById.get(targetId);
  if (!anchor || !target) return { kind: 'none' };
  if (anchorId === targetId) return { kind: 'self' };

  const raw = findRelationPaths(graph, anchorId, targetId, { ...opts, ix });
  if (!raw.length) return { kind: 'none' };

  const seen = new Set();
  const rendered = [];
  for (const path of raw) {
    const collapsed = collapseHalfSiblings(path);
    const body = renderBody(collapsed, ix, lang);
    if (seen.has(body)) continue;
    seen.add(body);
    rendered.push({
      body,
      collapsed,
      steps: collapsed.length,
      rawSteps: path.length,
      spouses: collapsed.filter((s) => s.kind === 'spouse').length,
    });
  }
  rendered.sort(
    (a, b) => a.steps - b.steps || a.rawSteps - b.rawSteps || a.spouses - b.spouses || a.body.localeCompare(b.body),
  );

  const primary = rendered[0];
  const also = rendered.slice(1).filter((r) => r.steps <= primary.steps + 3).slice(0, 3);

  // The primary path as drawable nodes — the route through real people,
  // pre-run/term collapse (the diagram shows the structure the sentence
  // compresses). First entry is the anchor; each later entry arrives via its
  // step word ("mother", "younger brother", …).
  const trail = [
    { id: anchorId },
    ...primary.collapsed.map((s) => ({
      id: s.toId,
      kind: s.kind === 'half' ? 'sibling' : s.kind,
      word: tokenFor(s, ix).word,
      dashed:
        s.kind === 'parent' || s.kind === 'child'
          ? s.rel !== 'biological'
          : s.kind === 'sibling'
            ? s.enterRel !== 'biological' || s.exitRel !== 'biological'
            : false,
      former: s.kind === 'spouse' && s.status === 'divorced',
    })),
  ];

  return {
    kind: 'related',
    head: anchor.isSelf ? 'your' : `${(anchor.name || '').split(/\s+/)[0]}’s`,
    primary: { body: primary.body, steps: primary.steps, trail },
    also: also.map((r) => ({ body: r.body, steps: r.steps })),
    more: Math.max(0, rendered.length - 1 - also.length),
  };
}
