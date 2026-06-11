// Relationship-engine assertions over the fictional demo family.
// Run: node scripts/test-relationship.mjs
import { demoGraph } from '../src/db/seed.js';
import { describeRelationship } from '../src/lib/relationship.js';

const graph = demoGraph();
const ME = 'p-deepak';
let failures = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n      expected: ${expected}\n      actual:   ${actual}`}`);
}

const rel = (a, b) => describeRelationship(graph, a, b);
const primary = (a, b) => {
  const r = rel(a, b);
  return r.kind === 'related' ? r.primary.body : r.kind;
};

// --- single-step and grandparent chains ---
check('Nithya = wife', primary(ME, 'p-nithya'), 'wife');
check('Sundara = father', primary(ME, 'p-sundara'), 'father');
check('Jaya = mother', primary(ME, 'p-jaya'), 'mother');
check('Ira = daughter', primary(ME, 'p-ira'), 'daughter');
check('Divya = younger sister', primary(ME, 'p-divya'), 'younger sister');
check('Subbanna = maternal grandfather', primary(ME, 'p-subbanna'), 'maternal grandfather');
check('Akkamma = maternal grandmother', primary(ME, 'p-akkamma'), 'maternal grandmother');
check('Achutha = paternal grandfather', primary(ME, 'p-achutha'), 'paternal grandfather');
check('Devaki = paternal grandmother', primary(ME, 'p-devaki'), 'paternal grandmother');

// --- aunts, uncles, their spouses, cousins ---
check('Vasanthi', primary(ME, 'p-vasanthi'), 'father’s younger sister');
check('Shobha', primary(ME, 'p-shobha'), 'father’s younger sister');
check('Mohana', primary(ME, 'p-mohana'), 'mother’s younger brother');
check('Leela', primary(ME, 'p-leela'), 'mother’s younger sister');
check('Gopala', primary(ME, 'p-gopala'), 'father’s younger sister’s husband');
check('Sharada', primary(ME, 'p-sharada'), 'mother’s younger brother’s wife');
check('Prakash', primary(ME, 'p-prakash'), 'father’s younger sister’s son');

// --- the hard cases ---
check('Krishna = elder half-uncle', primary(ME, 'p-krishna'), 'father’s elder half-brother');
check('Krishna has a single spelling', rel(ME, 'p-krishna').also.length, 0);
check('Ramesha = adopted uncle', primary(ME, 'p-ramesha'), 'father’s adopted younger brother');
check('Parvathi = grandfather’s wife', primary(ME, 'p-parvathi'), 'paternal grandfather’s wife');

// Asha: blood route first, the marriage route as an "also".
const asha = rel(ME, 'p-asha');
check('Asha primary = blood route', asha.primary.body, 'mother’s younger brother’s daughter');
check(
  'Asha also includes the marriage route',
  asha.also.some((r) => r.body === 'father’s younger sister’s daughter-in-law'),
  true,
);
check('Asha head is "your"', asha.head, 'your');

// Tanvi: related by blood two ways — both rendered, no junk third route.
const tanvi = rel(ME, 'p-tanvi');
check('Tanvi primary', tanvi.primary.body, 'father’s younger sister’s granddaughter');
check('Tanvi alternate', tanvi.also[0]?.body, 'mother’s younger brother’s granddaughter');
check('Tanvi has exactly two routes', tanvi.also.length === 1 && tanvi.more === 0, true);

// --- any-two-people anchoring ---
const flipped = rel('p-sharada', 'p-nithya');
check('Sharada → Nithya', flipped.primary.body, 'husband’s elder sister’s daughter-in-law');
check('non-self head uses the name', flipped.head, 'Sharada’s');

// --- in-law families (extended lens) ---
check('Janardhana = father-in-law', primary(ME, 'p-janardhana'), 'father-in-law');
check('Sarojini = mother-in-law', primary(ME, 'p-sarojini'), 'mother-in-law');
check('Kishore', primary(ME, 'p-kishore'), 'wife’s younger brother');
check('Megha', primary(ME, 'p-megha'), 'wife’s younger brother’s wife');
check('Lalitha (partnerless sibling container)', primary(ME, 'p-lalitha'), 'father’s younger sister’s husband’s elder sister');

// --- divorce + single parent ---
check('Rukmini = former wife of half-uncle', primary(ME, 'p-rukmini'), 'father’s elder half-brother’s former wife');
check('Dinesha = half-uncle’s son', primary(ME, 'p-dinesha'), 'father’s elder half-brother’s son');
check('Santosha (single recorded parent)', primary(ME, 'p-santosha'), 'mother’s younger sister’s son');

// --- edges ---
check('self', rel(ME, ME).kind, 'self');
check('unknown person', rel(ME, 'p-nobody').kind, 'none');
check('Raghava is unconnected', rel(ME, 'p-raghava').kind, 'none');
check('Bhavani is unconnected', rel(ME, 'p-bhavani').kind, 'none');

console.log(failures ? `\n${failures} failing` : '\nall green');
process.exit(failures ? 1 : 0);
