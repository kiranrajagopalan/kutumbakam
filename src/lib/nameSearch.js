// Transliteration-agnostic name search (12 Jun 2026). Indian names have no
// single correct romanization — श्री alone is Sri/Shri/Shree/Sree — so every
// search surface matches on a folded phonetic key instead of spelling.
// Technique: ordered rewrite rules tuned to Indic romanization conventions
// (a domain-specific take on the customized-Soundex literature), applied
// identically to the query and the names, then substring match.
//
// Convention families encoded (each from real variant groups):
//   sibilants        sh→s        Sri/Shri, Shiva/Siva, Harsha/Harsa
//   retroflex zh     zh→l        Azhagan/Alagan (Malayalam/Tamil ഴ)
//   aspiration       th/dh/bh/kh/gh/ph → t/d/b/k/g/p   Geetha/Gita, Karthik/Kartik
//   ksha             x→ks        Laxmi ≡ Lakshmi (sh→s makes both "laksmi")
//   v/w              w→v         Viswanath/Vishwanath
//   long vowels      ee/aa/oo/ii/uu → i/a/u/i/u        Sree/Sri, Pooja/Puja
//   au glide         ou/ow→au    Gauri/Gouri/Gowri
//   ck               ck→k        Karthick/Kartik, Mallick/Malik
//   final y          y→i (word-final)                  Aswathy/Aswathi, Lakshmy
//   initial hr       hr→r (word-initial)               Hrithik/Rithik
//   gemination       any doubled letter collapses      Pillai/Pillay, Akkamma
//
// Known limits (deliberate — folding these would mangle other names):
// vowel-quality swaps (Mohammed/Muhammad, Krishna/Krushna) stay distinct.

const RULES = [
  ['zh', 'l'],
  ['sh', 's'],
  ['th', 't'],
  ['dh', 'd'],
  ['bh', 'b'],
  ['kh', 'k'],
  ['gh', 'g'],
  ['ph', 'p'],
  ['ck', 'k'],
  ['ch', 'c'],
  ['x', 'ks'],
  ['ou', 'au'], // au-glides fold before w→v, or Gowri becomes "govri"
  ['ow', 'au'],
  ['w', 'v'],
  ['ee', 'i'],
  ['aa', 'a'],
  ['oo', 'u'],
  ['ii', 'i'],
  ['uu', 'u'],
  ['q', 'k'],
];

export function foldName(s) {
  let t = (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // typed diacritics (Śrī) fold too
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  t = t.replace(/\bhr/g, 'r');
  for (const [from, to] of RULES) t = t.split(from).join(to);
  t = t.replace(/y\b/g, 'i');
  t = t.replace(/(.)\1+/g, '$1');
  return t;
}

// The one matcher every search box uses. Raw substring first (mid-typing a
// digraph like "shre" still matches the stored spelling), then folded.
export function nameMatch(person, query) {
  if (!query) return true;
  const raw = `${person.name || ''} ${person.nickname || ''}`.toLowerCase();
  if (raw.includes(query.toLowerCase())) return true;
  const fq = foldName(query);
  return !!fq && foldName(raw).includes(fq);
}
