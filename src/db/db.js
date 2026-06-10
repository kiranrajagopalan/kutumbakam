import Dexie from 'dexie';

// Graph model (GEDCOM-shaped, so a standard export stays possible later):
//   persons     — people. Photos live here as small webp Blobs.
//   unions      — a marriage/partnership. partnerIds has 0, 1 or 2 entries:
//                 2 = both partners known, 1 = single known parent,
//                 0 = "unknown parents" container created when a sibling is
//                 added before any parent is recorded.
//   childLinks  — child → union edges. relation distinguishes biological /
//                 adoptive / step, and a child may have multiple links
//                 (e.g. biological + adoptive parents).
export const db = new Dexie('kutumbakam');

db.version(1).stores({
  persons: 'id, name, updatedAt',
  unions: 'id, *partnerIds',
  childLinks: 'id, childId, unionId',
  meta: 'key',
});
