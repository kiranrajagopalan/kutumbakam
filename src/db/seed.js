// A fictional demo family (no real people). Deliberately exercises the hard
// cases: remarriage after widowhood, a half-sibling, an adopted child, a
// divorce, TWO marriages bridging the same two families (relatives related in
// more than one way), two in-law families (the extended lens + capsules), a
// single recorded parent ("Partner not recorded" → the + Add partner repair),
// and two people not yet connected to anyone.
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
    P('p-devaki', { name: 'Devaki', gender: 'female', isAlive: false, birthYear: 1930, deathYear: 2015, deathMonth: 6, deathDay: 4, nativePlace: 'Karkala' }),
    // Maternal grandparents' generation
    P('p-subbanna', { name: 'Subbanna', gender: 'male', isAlive: false, birthYear: 1925, deathYear: 1999, nativePlace: 'Udupi', occupation: 'School teacher' }),
    P('p-akkamma', { name: 'Akkamma', gender: 'female', birthYear: 1934, birthMonth: 3, birthDay: 12, nickname: 'Akku', nativePlace: 'Udupi' }),

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
    P('p-deepak', { name: 'Deepak', gender: 'male', birthYear: 1985, birthMonth: 8, birthDay: 14, nickname: 'Deepu', isSelf: true, currentCity: 'Bengaluru', occupation: 'Designer' }),
    P('p-divya', { name: 'Divya', gender: 'female', birthYear: 1989, currentCity: 'Mangaluru' }),
    P('p-nithya', { name: 'Nithya', gender: 'female', birthYear: 1988 }),
    P('p-prakash', { name: 'Prakash', gender: 'male', birthYear: 1980 }),
    P('p-asha', { name: 'Asha', gender: 'female', birthYear: 1984 }),

    // Children's generation
    P('p-ira', { name: 'Ira', gender: 'female', birthYear: 2018 }),
    P('p-tanvi', { name: 'Tanvi', gender: 'female', birthYear: 2012, birthMonth: 11, birthDay: 2 }),

    // Nithya's side — an in-law family (extended lens, folds into a capsule)
    P('p-janardhana', { name: 'Janardhana', gender: 'male', birthYear: 1958, nativePlace: 'Moodabidri', occupation: 'Rice miller' }),
    P('p-sarojini', { name: 'Sarojini', gender: 'female', birthYear: 1963 }),
    P('p-kishore', { name: 'Kishore', gender: 'male', birthYear: 1991, currentCity: 'Hyderabad' }),
    P('p-megha', { name: 'Megha', gender: 'female', birthYear: 1993 }),
    // Gopala's side — a one-person in-law family via a partnerless sibling
    // container (parents never recorded)
    P('p-lalitha', { name: 'Lalitha', gender: 'female', birthYear: 1947 }),
    // Krishna's divorce — dashed spouse line, outline heart, "former wife"
    P('p-rukmini', { name: 'Rukmini', gender: 'female', birthYear: 1950, nativePlace: 'Karkala' }),
    P('p-dinesha', { name: 'Dinesha', gender: 'male', birthYear: 1975, currentCity: 'Mumbai' }),
    // Leela's son — father deliberately not recorded ("Partner not recorded"
    // → try the + Add partner repair here)
    P('p-santosha', { name: 'Santosha', gender: 'male', birthYear: 1990 }),
    // Not yet connected to anyone — show up in the list's last group and the
    // tree's "not yet placed" note
    P('p-raghava', { name: 'Raghava', gender: 'male', birthYear: 1968, notes: 'Met at a temple function in Udupi — how he is related is still unknown.' }),
    P('p-bhavani', { name: 'Bhavani', gender: 'female', birthYear: 1990 }),
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
    // In-law families
    U('u-janardhana-sarojini', ['p-janardhana', 'p-sarojini'], { marriageYear: 1986 }),
    U('u-kishore-megha', ['p-kishore', 'p-megha'], { marriageYear: 2019 }),
    U('u-gopala-sibs', [], { status: '' }), // Gopala & Lalitha's unrecorded parents
    // Divorce
    U('u-krishna-rukmini', ['p-krishna', 'p-rukmini'], { status: 'divorced', marriageYear: 1972 }),
    // Single recorded parent
    U('u-leela-solo', ['p-leela'], { status: '' }),
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
    L('l-nithya', 'p-nithya', 'u-janardhana-sarojini'),
    L('l-kishore', 'p-kishore', 'u-janardhana-sarojini'),
    L('l-gopala-sib', 'p-gopala', 'u-gopala-sibs'),
    L('l-lalitha', 'p-lalitha', 'u-gopala-sibs'),
    L('l-dinesha', 'p-dinesha', 'u-krishna-rukmini'),
    L('l-santosha', 'p-santosha', 'u-leela-solo'),
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
