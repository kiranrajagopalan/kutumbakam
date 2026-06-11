// GEDCOM builder assertions over the demo family.
// Run: node scripts/test-gedcom.mjs
import { demoGraph } from '../src/db/seed.js';
import { buildGedcom } from '../src/lib/gedcom.js';

const graph = demoGraph();
const ged = buildGedcom(graph);
const lines = ged.trim().split('\n');
let failures = 0;

function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  — ${detail}`}`);
}

check('starts with HEAD', lines[0] === '0 HEAD');
check('ends with TRLR', lines[lines.length - 1] === '0 TRLR');
check('every line is "level tag…"', lines.every((l) => /^\d+ \S/.test(l)), lines.find((l) => !/^\d+ \S/.test(l)));
check('one INDI per person', (ged.match(/ INDI$/gm) || []).length === graph.persons.length);
check('one FAM per union', (ged.match(/ FAM$/gm) || []).length === graph.unions.length);
check('one CHIL per child link', (ged.match(/^1 CHIL /gm) || []).length === graph.childLinks.length);
check('Ramesha’s adoption → PEDI adopted', /2 PEDI adopted/.test(ged));
check('Krishna–Rukmini divorce → DIV Y', /1 DIV Y/.test(ged));
check('Parvathi’s approximate birth → ABT', /2 DATE ABT 1924/.test(ged));
check('nickname carried (NICK Akku)', /2 NICK Akku/.test(ged));
check('native place carried (PLAC Kudla)', /2 PLAC Kudla/.test(ged));
check('marriage year carried (DATE 1951)', /2 DATE 1951/.test(ged));
check('UTF-8 declared', /1 CHAR UTF-8/.test(ged));
check('no PHON tag ever', !/PHON/.test(ged));
check('no privateNotes leak marker', !/private/i.test(ged));

console.log(failures ? `\n${failures} failing` : '\nall green');
process.exit(failures ? 1 : 0);
