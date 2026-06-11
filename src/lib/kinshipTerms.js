// Kinship term tables for the relationship explainer.
//
// Keys are chains of step tokens joined with '.':
//   F father · M mother · P parent (gender unknown)
//   S son · D daughter · C child
//   H husband · W wife · X spouse
//   B brother · Z sister · G sibling — prefixed e/y when elder/younger is
//   known ('eB', 'yZ'), and h for half-siblings ('heB', 'hZ')
// So 'M.yB' = mother's younger brother.
//
// en: replaces a run inside a chain with the shorter everyday word.
//     (Grandparent/grandchild runs are collapsed in code, not listed here.)
//     Sibling-in-law chains stay spelled out on purpose — "elder brother's
//     wife" says more at a function than "sister-in-law".
// tcy (Tulu): every entry comes from Kiran — never invent or machine-translate
//     a Tulu kinship term. Same key space; once Tulu is switched on, a
//     whole-chain match here wins over the spelled-out English.
export const TERMS = {
  en: {
    'H.F': 'father-in-law',
    'H.M': 'mother-in-law',
    'W.F': 'father-in-law',
    'W.M': 'mother-in-law',
    'S.W': 'daughter-in-law',
    'D.H': 'son-in-law',
  },
  tcy: {},
};
