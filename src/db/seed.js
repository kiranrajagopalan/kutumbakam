// A fictional demo family (no real people). Deliberately exercises the hard
// cases: remarriage after widowhood, a half-sibling, an adopted child, and
// TWO marriages bridging the same two families — which makes some relatives
// related in more than one way (the multi-path case the future "how are we
// related" engine must handle).
import { db } from './db.js';
import { blankPerson } from './repo.js';

const P = (id, fields) => ({ ...blankPerson(), id, createdAt: 1, updatedAt: 1, ...fields });
const U = (id, partnerIds, fields = {}) => ({ id, partnerIds, status: 'married', marriageYear: null, createdAt: 1, ...fields });
const L = (id, childId, unionId, relation = 'biological') => ({ id, childId, unionId, relation });

// The raw demo graph, as pure data — loadDemo() writes it to Dexie, and the
// node-side relationship tests read it directly.
export function demoGraph() {
  const persons = [
    // Paternal grandparents' generation
    P('p-achutha', { name: 'Achutha', gender: 'male', isAlive: false, birthYear: 1921, deathYear: 1988, nativePlace: 'Kudla', occupation: 'Areca trader' }),
    P('p-parvathi', { name: 'Parvathi', gender: 'female', isAlive: false, birthYear: 1924, deathYear: 1950, birthApprox: true }),
    P('p-devaki', { name: 'Devaki', gender: 'female', isAlive: false, birthYear: 1930, deathYear: 2015, nativePlace: 'Karkala' }),
    // Maternal grandparents' generation
    P('p-subbanna', { name: 'Subbanna', gender: 'male', isAlive: false, birthYear: 1925, deathYear: 1999, nativePlace: 'Udupi', occupation: 'School teacher' }),
    P('p-akkamma', { name: 'Akkamma', gender: 'female', birthYear: 1934, nickname: 'Akku', nativePlace: 'Udupi' }),

    // Parents' generation — paternal
    P('p-krishna', { name: 'Krishna', gender: 'male', birthYear: 1948, birthOrder: 1, currentCity: 'Mumbai', occupation: 'Bank officer' }),
    P('p-sundara', { name: 'Sundara', gender: 'male', birthYear: 1952, birthOrder: 1, currentCity: 'Mangaluru' }),
    P('p-vasanthi', { name: 'Vasanthi', gender: 'female', birthYear: 1955, birthOrder: 2 }),
    P('p-shobha', { name: 'Shobha', gender: 'female', birthYear: 1958, birthOrder: 3 }),
    P('p-ramesha', { name: 'Ramesha', gender: 'male', birthYear: 1962, birthOrder: 4, notes: 'Adopted within the family.' }),
    // Parents' generation — maternal
    P('p-jaya', { name: 'Jaya', gender: 'female', birthYear: 1957, birthOrder: 1 }),
    P('p-mohana', { name: 'Mohana', gender: 'male', birthYear: 1960, birthOrder: 2, currentCity: 'Pune' }),
    P('p-leela', { name: 'Leela', gender: 'female', birthYear: 1964, birthOrder: 3 }),
    // Spouses marrying in
    P('p-gopala', { name: 'Gopala', gender: 'male', birthYear: 1950 }),
    P('p-sharada', { name: 'Sharada', gender: 'female', birthYear: 1962 }),

    // Your generation
    P('p-deepak', { name: 'Deepak', gender: 'male', birthYear: 1985, nickname: 'Deepu', isSelf: true, currentCity: 'Bengaluru', occupation: 'Designer' }),
    P('p-divya', { name: 'Divya', gender: 'female', birthYear: 1989, currentCity: 'Mangaluru' }),
    P('p-nithya', { name: 'Nithya', gender: 'female', birthYear: 1988 }),
    P('p-prakash', { name: 'Prakash', gender: 'male', birthYear: 1980 }),
    P('p-asha', { name: 'Asha', gender: 'female', birthYear: 1984 }),

    // Children's generation
    P('p-ira', { name: 'Ira', gender: 'female', birthYear: 2018 }),
    P('p-tanvi', { name: 'Tanvi', gender: 'female', birthYear: 2012 }),
  ];

  const unions = [
    U('u-achutha-parvathi', ['p-achutha', 'p-parvathi'], { status: 'widowed' }),
    U('u-achutha-devaki', ['p-achutha', 'p-devaki'], { marriageYear: 1951, createdAt: 2 }),
    U('u-subbanna-akkamma', ['p-subbanna', 'p-akkamma']),
    U('u-sundara-jaya', ['p-sundara', 'p-jaya'], { marriageYear: 1982 }),
    U('u-vasanthi-gopala', ['p-vasanthi', 'p-gopala']),
    U('u-mohana-sharada', ['p-mohana', 'p-sharada']),
    // Second bridge between the two families → some relatives are related
    // in more than one way.
    U('u-prakash-asha', ['p-prakash', 'p-asha'], { marriageYear: 2008 }),
    U('u-deepak-nithya', ['p-deepak', 'p-nithya'], { marriageYear: 2014 }),
  ];

  const childLinks = [
    L('l-krishna', 'p-krishna', 'u-achutha-parvathi'),
    L('l-sundara', 'p-sundara', 'u-achutha-devaki'),
    L('l-vasanthi', 'p-vasanthi', 'u-achutha-devaki'),
    L('l-shobha', 'p-shobha', 'u-achutha-devaki'),
    L('l-ramesha', 'p-ramesha', 'u-achutha-devaki', 'adoptive'),
    L('l-jaya', 'p-jaya', 'u-subbanna-akkamma'),
    L('l-mohana', 'p-mohana', 'u-subbanna-akkamma'),
    L('l-leela', 'p-leela', 'u-subbanna-akkamma'),
    L('l-deepak', 'p-deepak', 'u-sundara-jaya'),
    L('l-divya', 'p-divya', 'u-sundara-jaya'),
    L('l-prakash', 'p-prakash', 'u-vasanthi-gopala'),
    L('l-asha', 'p-asha', 'u-mohana-sharada'),
    L('l-ira', 'p-ira', 'u-deepak-nithya'),
    L('l-tanvi', 'p-tanvi', 'u-prakash-asha'),
  ];

  return { persons, unions, childLinks };
}

export async function loadDemo() {
  const { persons, unions, childLinks } = demoGraph();
  await db.transaction('rw', db.persons, db.unions, db.childLinks, db.meta, async () => {
    await Promise.all([db.persons.clear(), db.unions.clear(), db.childLinks.clear()]);
    await db.persons.bulkAdd(persons);
    await db.unions.bulkAdd(unions);
    await db.childLinks.bulkAdd(childLinks);
    await db.meta.put({ key: 'demo', value: true });
  });
  return persons.length;
}
