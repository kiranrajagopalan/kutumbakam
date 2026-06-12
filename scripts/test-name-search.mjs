// Transliteration-agnostic search: variant groups must fold to one key,
// distinct names must stay apart, and partial queries must keep working.
import { foldName, nameMatch } from '../src/lib/nameSearch.js';

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  — ${detail}`}`);
}

function converge(label, variants) {
  const keys = variants.map(foldName);
  const ok = keys.every((k) => k === keys[0]);
  check(`${label} → "${keys[0]}"`, ok, keys.join(' / '));
}

converge('Srihari group', ['Srihari', 'Shrihari', 'Shreehari', 'Sreehari']);
converge('Lakshmi group', ['Lakshmi', 'Laxmi', 'Lakshmy', 'Lakshmee']);
converge('Geetha group', ['Geetha', 'Gita', 'Geeta', 'Githa']);
converge('Gowri group', ['Gowri', 'Gauri', 'Gouri']);
converge('Vishwanath group', ['Vishwanath', 'Viswanath', 'Vishvanath', 'Visvanath']);
converge('Karthik group', ['Karthik', 'Kartik', 'Karthick']);
converge('Pooja group', ['Pooja', 'Puja']);
converge('Deepak group', ['Deepak', 'Dipak']);
converge('Aswathy group', ['Aswathy', 'Ashwathi', 'Aswathi']);
converge('Pillai group', ['Pillai', 'Pillay', 'Pilai']);
converge('Hrithik group', ['Hrithik', 'Rithik', 'Ritik']);
converge('Azhagan group', ['Azhagan', 'Alagan']);
converge('Fathima group', ['Fathima', 'Fatima']);
converge('Akkamma group', ['Akkamma', 'Akama', 'Akkama']);
converge('Santosha group', ['Santosha', 'Santosa', 'Shantosha']);
converge('Sridevi group', ['Sridevi', 'Shreedevi', 'Sreedevi', 'Shridevi']);

check('distinct names stay apart (Mohana vs Mohini)', foldName('Mohana') !== foldName('Mohini'));
check('distinct names stay apart (Asha vs Usha)', foldName('Asha') !== foldName('Usha'));
check('diacritics fold (Śrīhari)', foldName('Śrīhari') === foldName('Srihari'));

const srihari = { name: 'Srihari', nickname: '' };
check('query Shreehari finds Srihari', nameMatch(srihari, 'Shreehari'));
check('query shree finds Srihari (partial)', nameMatch(srihari, 'shree'));
check('query sri finds Srihari (partial)', nameMatch(srihari, 'sri'));
check('query Laxmi finds Lakshmi', nameMatch({ name: 'Lakshmi', nickname: '' }, 'Laxmi'));
check('query Dipak finds Deepak', nameMatch({ name: 'Deepak', nickname: 'Deepu' }, 'Dipak'));
check('nickname still searchable (Deepu)', nameMatch({ name: 'Deepak', nickname: 'Deepu' }, 'deepu'));
check('mid-digraph raw fallback (shre on Shreehari)', nameMatch({ name: 'Shreehari', nickname: '' }, 'shre'));
check('no false hit (sri on Mohana)', !nameMatch({ name: 'Mohana', nickname: '' }, 'sri'));
check('empty query matches all', nameMatch({ name: 'Anyone', nickname: '' }, ''));

console.log(failures ? `\n${failures} failing` : '\nall green');
process.exit(failures ? 1 : 0);
