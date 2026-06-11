# Kutumbakam — PRD

A private, local-first family tree PWA. *Vasudhaiva kutumbakam* — the goal is to document
the extended family (two generations up and growing), and eventually explain how any two
people are related, in Tulu and English.

## Use cases (in priority order)
1. **Document** people around Kiran — paternal grandfather had 8 children, maternal had 6;
   capture what's known now, grow progressively.
2. **Explain relationships** — at functions, when someone says "I'm related to you",
   find them and show *how* (path + kinship term).
3. **Share** — let relatives view, and eventually contribute their branches.
4. **Connect trees** — long term, link separately-maintained family trees.

## Decisions (10 Jun 2026)
- **Local-first**: all data in IndexedDB on device; no accounts, no server, ₹0.
  JSON export/import is the backup + sharing mechanism. Multi-user comes later on the
  same data model.
- **Stack**: React 19 + Vite 6 + Tailwind 4 + vite-plugin-pwa (Lekka conventions).
- **Kinship languages**: English chain first ("your father's elder brother"), **Tulu**
  terms layered next — term table must be pluggable. Terms to be sourced from Kiran,
  not invented.
- **Relationship complexity modelled from day 1**: multiple marriages, remarriage,
  adoption (`childLinks.relation`), step-relations (derived), single/unknown parents.
- **Co-parents are assumed married** (decided 10 Jun 2026): when a second parent joins a
  parent union, status defaults to `married`; the rare exception is corrected via the
  union editor (pencil on a partner row → marriage year + married/widowed/divorced).
- **One graph, family as a lens** (decided 10 Jun 2026): in-law branches (e.g. a
  married-in spouse's parents/siblings) are recorded in the same graph, never walled off.
  "Whose family" is computed relative to a focal person: **blood** (ancestors + their
  descendants), **married-in** (spouses of blood), **their family** (blood kin of
  married-in, not otherwise connected). Views de-emphasize, filter, or collapse the
  outer classes — they never block recording. Entry convention: document married-in
  spouses fully, their relatives shallowly (name/year/place).
- **Sensitive field class**: `phone` and `privateNotes` never leave the device in a
  shareable export ("Export a shareable copy" strips them; only the full backup has them).
  Any future sharing/sync feature must gate contact info behind explicit permission.
- **Tree rendering — fully custom** (decided 10 Jun 2026): `relatives-tree` was
  evaluated and rejected — it lays out an hourglass around one root (11 of 24 demo
  people) and drops collateral branches. `src/lib/treeData.js` is our own
  generation-layered layout (BFS generations → couple-chain units → barycenter
  sweeps → bus connectors); handles remarriage chains, marriage cycles, adoption
  (dashed risers), divorce (dashed spouse lines).
- **Visual direction**: interim "paper & ink" token system (Fraunces + Albert Sans,
  henna accent). Kiran will brief the real art direction; re-skin = token swap in
  `src/index.css` `@theme`.

## Data model (`src/db/`)
- `persons` — identity, photo (small webp Blob), fuzzy years (`birthYear` + `birthApprox`),
  `birthOrder` (1 = eldest; kinship terms need elder/younger), roots (native place,
  family house, current city), contact (sensitive), stories, `privateNotes` (sensitive),
  `isSelf` anchor.
- `unions` — marriage/partnership; `partnerIds` of length 0–2 (0 = unknown-parents
  container, 1 = single known parent), `status` (married/widowed/divorced), `marriageYear`.
- `childLinks` — child→union edges with `relation` (biological/adoptive/step); a child can
  have several (e.g. biological + adoptive). GEDCOM-shaped so a standard export stays possible.
- All graph writes go through `repo.js` (`addRelative`, `deletePerson` keep invariants).

## Milestones
- **M1 — Documenting core** ✅ (this build): onboarding, people list + search, person
  detail with derived immediate family (full/half siblings, adoption chips, unions in
  order), add-relative sheet (new or link-existing, union picker for children),
  edit form, photo→webp, export/import, demo family, installable PWA.
  **Repair kit (12 Jun 2026)**: "+ Add partner" on a "Partner not recorded"
  union fills that union (and parents its children — co-parents rule applies);
  per-section manage mode on the person page (pencil → ✕ per row, Done to
  exit) unlinks wrong parent/marriage/sibling/child records with
  consequence-specific confirms. Unlinks remove links, never people
  (`removePartnerFromUnion` / `removeChildLink`; emptied container unions
  swept). Half-sibling rows are not unlinkable from a sibling's page — remove
  them as the shared parent's child, where the meaning is unambiguous.
- **M2 — Tree view** (core shipped 10 Jun 2026): whole-family zoomable/pannable SVG
  tree at `#/tree` — custom layout (see above), pinch/wheel/drag, fit button,
  tap-select with info card, self-ring, extended-family nodes dimmed + hideable
  toggle, adoption/divorce line language, deceased muting. The two-bridge marriage
  cycle renders with all couples adjacent. **Connector line grammar** (10 Jun 2026,
  after Kiran's crossing-legibility complaint; research confirmed no library owns
  this — technique adopted from JointJS/draw.io jump-style prior art): rounded
  elbow = turns, dot = junction, **crossing = hop arc on the vertical** (Kiran
  compared both styles on sight 10 Jun 2026 and chose hops; gap-style code path
  removed). Tap-to-trace: selecting a person redraws their connector
  constellation in accent on top, rest dimmed to 35%. Crossing regression
  baseline on demo+2: 7.
  **M2.1 shipped (11 Jun 2026)**: single-branch view (tree card → Branch →
  descendants + married-in spouses, exit chip), in-law collapse capsules
  ("Anupam's family ▸ N", folded by default, tap to unfold, fold/unfold-all
  pill, Fold action on extended cards), same-name disambiguation (s/o-d/o
  parent reference, fallback place — on list rows, tree node sublabels,
  pickers, person-page rows), navigation jumps (person page → one-tap home +
  see-on-tree; `#/tree/:id` centres with card open and auto-unfolds the
  target's capsule). **Tree polish round (11 Jun 2026, Kiran's improvement
  list)**: capsule tap now also selects + centres the family's anchor
  (the tap visibly lands); the selection card body is tappable → profile
  (CTAs keep their actions) and shows the relationship chain fully wrapped
  on its own line; fold/unfold (pill, card Fold) preserves the current
  pan/zoom; **heart mark** at every partner-line midpoint (paper-disc halo
  breaks the line; filled = married/widowed, outline = divorced-dashed;
  follows accent in tap-to-trace). **M2.2 closed (12 Jun 2026)**: Kiran ratified
  the paper &amp; ink direction as final, and the system was extracted into a
  reusable package at `../paper-ink/` (tokens.css + styleguide.html + README
  with the non-token laws). Future visual changes go through those tokens.
- **M3 — "How are we related"** (English engine shipped 11 Jun 2026): pure-graph
  path engine in `src/lib/relationship.js` — walks a bipartite person↔union graph
  (each step crosses exactly one union; forbidding union revisits canonicalizes
  paths, so "wife" can never be respelled "child's mother"), collapses
  parent-then-child into half-siblings, renders flowing chains ("your mother's
  younger brother's daughter") with elder/younger from dates or `birthOrder`,
  adopted/step/former qualifiers, and term collapses (grandparent runs in code;
  in-law n-grams in `src/lib/kinshipTerms.js`, whose key space is the Tulu slot
  table Kiran will fill — sibling-in-law chains deliberately stay spelled out).
  Decisions (11 Jun 2026): **any two people from day one** (person page defaults
  to "from You", a chip re-anchors to anyone), **closest chain first + "also"
  alternates** (distant rewordings counted, not listed), **flowing phrasing**
  (chosen over stepping-stones on preview). Surfaces: Relation section on the
  person page; tree selection card's kin label upgraded to the chain. 30 node
  assertions over the demo in `scripts/test-relationship.mjs`
  (`node scripts/test-relationship.mjs`). **Remaining for M3.1**: Tulu term
  table (terms from Kiran), shareable explanation card.
- **M4 — Sharing v1**: read-only published snapshot (sensitive class stripped) behind an
  unguessable URL; GEDCOM export.
- **M5 — Multi-user (only if needed)**: hosted backend, tree-level roles
  (Owner/Editor/Viewer), suggest-mode edits with approval, audit log, living-people
  privacy defaults, relationship-distance field visibility. DPDP applies here — consent
  and delete/export are mandatory.

## Privacy stance (Indian context — why local-first)
A relationship graph + contact info is caste-inference, matrimonial-vetting and
social-engineering material if leaked. Tree data can be dragged into property disputes.
Defaults therefore: data never leaves the device; exports leak-safe by default; private
notes are a separate class from shared facts; deceased ≠ living in future visibility rules.

## Verify
`npm run dev` (port 5180, registered in repo `.claude/launch.json` as `kutumbakam`) →
onboarding → "Explore a demo family" → 32 fictional people covering remarriage,
half-siblings, adoption, divorce (dashed line + outline heart), two in-law
families (capsules), a single recorded parent ("+ Add partner" rehearsal), an
in-family second-marriage bridge, and two not-yet-connected people.
`node scripts/test-relationship.mjs` and `npm run build` must stay clean.
