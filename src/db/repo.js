// All graph reads/writes go through this module — no other file touches Dexie
// tables directly. Keeps union/childLink invariants in one place.
import { db } from './db.js';
import { compareBirth } from '../lib/format.js';
import { classifyByKinship } from '../lib/kinship.js';
import { computeNameHints } from '../lib/disambiguate.js';
import { describeRelationship } from '../lib/relationship.js';

const now = () => Date.now();
const uid = () => crypto.randomUUID();

export function blankPerson(fields = {}) {
  return {
    id: uid(),
    name: '',
    nickname: '',
    gender: '', // 'female' | 'male' | ''
    photo: null,
    isAlive: true,
    birthYear: null,
    birthDate: '',
    birthApprox: false,
    deathYear: null,
    deathDate: '',
    deathApprox: false,
    birthOrder: null, // 1 = eldest among siblings; used when dates are unknown
    nativePlace: '',
    familyHouse: '',
    currentCity: '',
    phone: '', // sensitive: never leaves the device in shareable exports
    occupation: '',
    notes: '',
    privateNotes: '', // sensitive: never leaves the device in shareable exports
    isSelf: false,
    createdAt: now(),
    updatedAt: now(),
    ...fields,
  };
}

// ---------- persons ----------

export async function createPerson(fields) {
  const p = blankPerson(fields);
  await db.persons.add(p);
  return p;
}

export async function updatePerson(id, patch) {
  await db.persons.update(id, { ...patch, updatedAt: now() });
}

export const getPerson = (id) => db.persons.get(id);
export const countPersons = () => db.persons.count();

export async function listPersons() {
  const all = await db.persons.toArray();
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export const getSelf = () => db.persons.filter((p) => p.isSelf).first();

// Full graph snapshot for the tree view, plus kinship classes and
// same-name disambiguation hints.
export async function getTreeData() {
  const [persons, unions, childLinks, self] = await Promise.all([
    db.persons.toArray(),
    db.unions.toArray(),
    db.childLinks.toArray(),
    getSelf(),
  ]);
  const classes = self ? classifyByKinship({ persons, unions, childLinks }, self.id) : null;
  const hints = computeNameHints({ persons, unions, childLinks });
  return { persons, unions, childLinks, self, classes, hints };
}

// "How are these two related?" — spelled chains from the anchor's point of
// view, plus the anchor person for labelling.
export async function getRelationship(anchorId, targetId) {
  const [persons, unions, childLinks] = await Promise.all([
    db.persons.toArray(),
    db.unions.toArray(),
    db.childLinks.toArray(),
  ]);
  const anchor = persons.find((p) => p.id === anchorId) || null;
  return { anchor, result: describeRelationship({ persons, unions, childLinks }, anchorId, targetId) };
}

// Just the same-name hints (for screens that don't need the whole graph).
export async function getNameHints() {
  const [persons, unions, childLinks] = await Promise.all([
    db.persons.toArray(),
    db.unions.toArray(),
    db.childLinks.toArray(),
  ]);
  return computeNameHints({ persons, unions, childLinks });
}

// Everyone, sorted by name, plus each person's kinship class relative to
// "you" (null classes when no self person exists — list falls back to flat).
export async function getPeopleWithKinship() {
  const [persons, unions, childLinks, self] = await Promise.all([
    db.persons.toArray(),
    db.unions.toArray(),
    db.childLinks.toArray(),
    getSelf(),
  ]);
  persons.sort((a, b) => a.name.localeCompare(b.name));
  const classes = self ? classifyByKinship({ persons, unions, childLinks }, self.id) : null;
  const hints = computeNameHints({ persons, unions, childLinks });
  return { persons, classes, hints };
}

// ---------- unions / links ----------

const unionsOf = (personId) => db.unions.where('partnerIds').equals(personId).toArray();
const parentLinksOf = (childId) => db.childLinks.where('childId').equals(childId).toArray();
const childLinksOfUnion = (unionId) => db.childLinks.where('unionId').equals(unionId).toArray();

export async function getParentUnion(personId) {
  const links = await parentLinksOf(personId);
  if (!links.length) return null;
  // The biological link wins when several exist (adoption adds a second).
  const link = links.find((l) => l.relation !== 'adoptive' && l.relation !== 'step') || links[0];
  const union = await db.unions.get(link.unionId);
  return union ? { union, link } : null;
}

async function ensureParentUnion(personId) {
  const existing = await getParentUnion(personId);
  if (existing) return existing.union;
  const union = { id: uid(), partnerIds: [], status: '', marriageYear: null, createdAt: now() };
  await db.unions.add(union);
  await db.childLinks.add({ id: uid(), childId: personId, unionId: union.id, relation: 'biological' });
  return union;
}

export const getUnionsOf = unionsOf;

export async function updateUnion(id, patch) {
  await db.unions.update(id, patch);
}

// ---------- the one write path for relationships ----------
// role: 'father' | 'mother' | 'spouse' | 'child' | 'sibling'
// subject: { existingId } to link someone already in the tree, otherwise
//          person fields for a brand-new person.
// opts: { unionId } — which union a child belongs to when the anchor has
//       several; { relation } — 'biological' (default) | 'adoptive' | 'step'.
export async function addRelative(anchorId, role, subject, opts = {}) {
  return db.transaction('rw', db.persons, db.unions, db.childLinks, async () => {
    const person = subject.existingId
      ? await db.persons.get(subject.existingId)
      : await createPerson(subject);
    if (!person) throw new Error('Person not found');
    if (person.id === anchorId) throw new Error('Cannot relate a person to themselves');

    if (role === 'father' || role === 'mother') {
      const union = await ensureParentUnion(anchorId);
      if (!union.partnerIds.includes(person.id)) {
        if (union.partnerIds.length >= 2) throw new Error('Both parents are already recorded');
        const patch = { partnerIds: [...union.partnerIds, person.id] };
        // Two co-parents are assumed married (the overwhelmingly common case);
        // the rare exception is corrected via the union editor.
        if (patch.partnerIds.length === 2 && !union.status) patch.status = 'married';
        await db.unions.update(union.id, patch);
      }
    } else if (role === 'spouse') {
      const mine = await unionsOf(anchorId);
      if (!mine.some((u) => u.partnerIds.includes(person.id))) {
        await db.unions.add({
          id: uid(),
          partnerIds: [anchorId, person.id],
          status: 'married',
          marriageYear: null,
          createdAt: now(),
        });
      }
    } else if (role === 'child') {
      let unionId = opts.unionId;
      if (!unionId) {
        const mine = await unionsOf(anchorId);
        if (mine.length === 1) {
          unionId = mine[0].id;
        } else if (mine.length === 0) {
          const u = { id: uid(), partnerIds: [anchorId], status: '', marriageYear: null, createdAt: now() };
          await db.unions.add(u);
          unionId = u.id;
        } else {
          // UI should have asked which spouse this child belongs with.
          throw new Error('CHOOSE_UNION');
        }
      }
      const links = await parentLinksOf(person.id);
      if (!links.some((l) => l.unionId === unionId)) {
        await db.childLinks.add({
          id: uid(),
          childId: person.id,
          unionId,
          relation: opts.relation || 'biological',
        });
      }
    } else if (role === 'sibling') {
      const union = await ensureParentUnion(anchorId);
      const links = await parentLinksOf(person.id);
      if (!links.some((l) => l.unionId === union.id)) {
        await db.childLinks.add({
          id: uid(),
          childId: person.id,
          unionId: union.id,
          relation: opts.relation || 'biological',
        });
      }
    } else {
      throw new Error(`Unknown role: ${role}`);
    }
    return person;
  });
}

// ---------- derived: everything one screen needs about a person ----------

export async function getImmediateFamily(personId) {
  const parentLinks = await parentLinksOf(personId);
  const parentUnions = [];
  for (const link of parentLinks) {
    const union = await db.unions.get(link.unionId);
    if (union) parentUnions.push({ union, link });
  }

  const parents = [];
  for (const { union, link } of parentUnions) {
    for (const pid of union.partnerIds) {
      const p = await db.persons.get(pid);
      if (p) parents.push({ person: p, relation: link.relation });
    }
  }

  // Full siblings share a parent union; half siblings come from a parent's
  // other unions.
  const siblingMap = new Map();
  for (const { union } of parentUnions) {
    for (const link of await childLinksOfUnion(union.id)) {
      if (link.childId !== personId) siblingMap.set(link.childId, { kind: 'full', relation: link.relation });
    }
  }
  for (const { person: parent } of parents) {
    for (const u of await unionsOf(parent.id)) {
      if (parentUnions.some((pu) => pu.union.id === u.id)) continue;
      for (const link of await childLinksOfUnion(u.id)) {
        if (link.childId === personId || siblingMap.has(link.childId)) continue;
        siblingMap.set(link.childId, { kind: 'half', relation: link.relation });
      }
    }
  }
  const siblings = [];
  for (const [id, info] of siblingMap) {
    const p = await db.persons.get(id);
    if (p) siblings.push({ person: p, ...info });
  }
  siblings.sort((a, b) => compareBirth(a.person, b.person));

  // The person's own unions, each with partner + children.
  const unions = [];
  for (const u of await unionsOf(personId)) {
    const partnerId = u.partnerIds.find((id) => id !== personId);
    const partner = partnerId ? await db.persons.get(partnerId) : null;
    const children = [];
    for (const link of await childLinksOfUnion(u.id)) {
      const c = await db.persons.get(link.childId);
      if (c) children.push({ person: c, relation: link.relation });
    }
    children.sort((a, b) => compareBirth(a.person, b.person));
    unions.push({ union: u, partner, children });
  }
  unions.sort((a, b) => (a.union.createdAt || 0) - (b.union.createdAt || 0));

  return { parents, siblings, unions, hasParents: parents.length > 0 };
}

// ---------- delete ----------

export async function deletePerson(id) {
  return db.transaction('rw', db.persons, db.unions, db.childLinks, async () => {
    await db.persons.delete(id);
    await db.childLinks.where('childId').equals(id).delete();
    for (const u of await unionsOf(id)) {
      const rest = u.partnerIds.filter((p) => p !== id);
      await db.unions.update(u.id, { partnerIds: rest });
    }
    // Sweep unions that no longer connect anyone: childless with at most one
    // partner left. (Single parent WITH children, and unknown-parents
    // containers WITH children, both stay.)
    for (const u of await db.unions.toArray()) {
      const kids = await childLinksOfUnion(u.id);
      if (kids.length === 0 && u.partnerIds.length <= 1) await db.unions.delete(u.id);
    }
  });
}
