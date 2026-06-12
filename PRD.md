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
- **Visual direction — ratified 12 Jun 2026**: the "paper & ink" system is final;
  canonical tokens + styleguide live at `../paper-ink/`. Visual changes go through
  the tokens in `src/index.css` `@theme`.
- **Multi-user direction — locked 12 Jun 2026, build deferred**: hosted live tree
  chosen over file-passing packets — contributor friction is the binding constraint
  (the first contributor is a non-technical elder; her first five minutes decide
  adoption). Full locked design in M5 below.
- **Desktop grammar — shipped 12 Jun 2026**: one fork at 1024px. Desktop is one
  workspace — people index | tree canvas | docked record (Kiran's "Airbnb
  list + map" instinct; selecting opens the full record in place, no
  card→page two-step). "Inspect in panels, transact in dialogs": sheets render
  as centred paper dialogs at lg. "You" locate control (the map idiom — ring
  says which one is me, button takes me home). Touch grammar below 1024px is
  untouched; iPad portrait deliberately stays touch. Codified as Paper & Ink
  §10 + README "Desktop grammar". Print + projection-mode ideas parked (below).

## Data model (`src/db/`)
- `persons` — identity, photo (small webp Blob), fuzzy dates (`birthYear` +
  `birthApprox`, plus optional `birthMonth`/`birthDay` and the death
  equivalents — added 12 Jun 2026 for the future birthday/shashtipoorthi
  calendar; nothing mandatory, a birthday can be known without its year).
  Display rule: full dates render on the person page header only; rows,
  pickers and tree sublabels stay year-only. `ageOf` is exact when the
  birthday is known; elder/younger and sibling sort compare only date parts
  BOTH people know ("March 1960" vs "1960" stays undecided),
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
  **Closing sprint (12 Jun 2026)**: relation choice (By birth / Adopted /
  Step) in the add-relative flow for parent/sibling/child roles — adoption
  and step links were modelled and rendered from day 1 but not enterable
  until now (`ensureParentUnion` upgrades the anchor's own link when asked,
  never downgrades to biological).
  **Dates round (12 Jun 2026)**: toggling Living off in the quick-add now
  reveals a "Passed (optional)" year field (it previously required a trip to
  the edit form); the edit form's Born/Passed rows gained optional Day +
  Month (`DateField`); GEDCOM emits full dates ("12 MAR 1934", "MAR 1934")
  when known.
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
  **M2.3 — Desktop workspace (12 Jun 2026)**: at ≥1024px the app is one
  workspace — people index (300px, collapsible, search + add) | full-bleed
  tree canvas | docked record panel (380px; `PersonDetail variant="panel"`
  with ✕, tree actions, in-panel sticky add-relative) under a 56px top bar.
  Canvas taps swap the record in place without re-centring; index picks write
  the URL and centre + trace. **Reflow law (12 Jun 2026, after Kiran's
  real-hardware pass)**: through any system-caused canvas resize — panes
  docking/undocking (including panel close) and window resizes — the world
  point at the centre stays at the centre; a live selection re-centres
  explicitly (post-commit getBoundingClientRect, not rAF; baseline seeded on
  data arrival). User pan/zoom is never touched.
  **Motion (12 Jun 2026, the delight round)**: the camera glides, never
  teleports — every system-caused view change animates (cubic ease-in-out,
  ~420ms; zoom buttons 200ms; pane reflows 320ms) with geometric zoom
  interpolation; selection + trace light instantly while the camera travels;
  glide chosen over fades (spatial continuity — you see where the next
  person lives relative to the last). User gestures stay 1:1 and cancel any
  glide; prefers-reduced-motion jumps; a timer watchdog lands the target
  where rAF is suppressed. Retargets respect the in-flight destination zoom.
  Record panel fades in on swap (animate-fade-in). The record panel stays a
  docked flat peer (inspector pattern), never an overlay — overlay = the
  transact family; elevation marks transience only. `Sheet`
  renders as a centred dialog at lg (one primitive, both grammars; Esc closes
  dialogs first, then selection). Tree gains hover rings (`@media
  (hover:hover)` only), +/− zoom pills (lg-only), a "You" locate pill (all
  sizes — exits branch view if needed), Esc-to-deselect. Edit/settings/
  onboarding stay a centred ~520px column. Mobile and tablet rendering are
  unchanged, except the tree is now full-width on tablets (was capped at
  440px). Fixed along the way: the wheel-zoom listener never attached when
  the first render returned null (`[]`-deps effect captured an empty wrapRef
  — now keyed on data presence).
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
  (`node scripts/test-relationship.mjs`). **Share card shipped (12 Jun
  2026)**: "Share as card" on the Relation section renders a 1080×1080
  paper-&-ink image (names + chain only — contact info can't appear by
  construction; `src/lib/relationCard.js`), shared via `navigator.share`
  files (kept synchronous inside the tap gesture) with a download fallback.
  **Visual snapshot shipped (12 Jun 2026)**: the primary chain also draws as
  a **path schematic** — only the people on the path, vertical = generation,
  in the line grammar (∩ + junction dot = via their parents, heart = married
  / outline = former, dashes = adoptive/step), accent-traced. Chosen on sight
  over a real-tree crop (dense, illegible at card scale) and a breadcrumb
  strip (structure-blind); the canvas itself remains the positional answer.
  The engine exposes `primary.trail` (the route through real people,
  pre-run/term collapse — the diagram shows what the sentence compresses,
  e.g. "mother-in-law" draws as wife → her mother). Geometry in
  `src/lib/relationPath.js`; SVG (photos + tones) under the sentence in the
  Relation section; the same layout painted onto the share card via Path2D —
  tones + initials only, keeping the card synchronous and photo-free.
  **Remaining for M3.1**: Tulu term table — waiting on Kiran's words; the
  `tcy` slot table is ready.
- **M4 — Sharing v1**: the read-only published family view is now the logged-out
  face of M5's server (decided 12 Jun 2026), thin-for-living applied — not a
  separate static snapshot. **GEDCOM export shipped (12 Jun 2026)**: 5.5.1
  LINEAGE-LINKED from `src/lib/gedcom.js` (Settings → "Export for other
  family-tree tools") — NAME/NICK/SEX/BIRT incl. ABT + PLAC/DEAT/OCCU/RESI/
  NOTE with CONT-CONC, FAMC with PEDI adopted (and a deliberately
  non-standard `PEDI step`), FAM with HUSB/WIFE/MARR/DIV/CHIL; the sensitive
  class never appears — the builder doesn't know those fields exist.
  Structural tests: `node scripts/test-gedcom.mjs`.
- **Parked — birthday calendar**: the day/month fields exist to feed it —
  upcoming birthdays, who turns 60 (shashtipoorthi) soon, remembrance days.
  Build when Kiran picks it up.
- **Parked — print & projection (Kiran will pick these up)**: print artifacts
  in rough cost order — (a) person-page print stylesheet ("family record"
  sheet), (b) tree poster view (fit-to-A4-landscape/A3/A2, title block,
  line-grammar legend, print or PDF), (c) generated family-book PDF (tree
  overview + a page per person), (d) blank branch entry forms for elders to
  fill by hand. Printouts default to the shareable (thinned) dataset — a
  printout is the ultimate uncontrolled share surface. Projection mode
  (chrome-hiding toggle) is a micro on top of the desktop canvas.
- **M5 — Multi-user (design locked 12 Jun 2026; build deferred until the real
  family is documented)**: hosted live tree, chosen over file-passing packets.
  - **Architecture**: the app stays an offline-first PWA — Dexie remains the working
    copy on every device; a thin custom sync service (lean: Cloudflare Workers + D1;
    free tier fits family scale and doesn't idle-pause) holds the canonical graph,
    carries changes, and enforces the rules below. Server loss = lost sync, never
    lost data. Field-level latest-wins + append-only audit log + undo. Off-the-shelf
    sync (e.g. Dexie Cloud) rejected: territory/suggestions/thinning are app
    semantics a generic object-sync can't express.
  - **Sensitive class never syncs**: `phone` + `privateNotes` stay only on the
    device of whoever recorded them — the server never sees those fields (day-one
    rule, unchanged).
  - **Identity — node-anchored claim links, no passwords**: an editor must first
    exist as a person in the tree; the invite is issued from their profile. The
    link is a single-use claim: the first device to open it becomes that person,
    then the link dies (credential lives on-device, never in the URL afterwards).
    Unclaimed links expire (~7 days). Claiming confirms gently ("Are you X, Y's
    mother?") to catch mis-sends. Owner revokes/re-issues per device (new phone =
    new link); claimed devices are listed on the profile. Accepted residual: a
    claimed device IS that person — same trust level as their WhatsApp; blast
    radius is bounded by territory; attribution is the tripwire.
  - **Governance (from the family-dynamics analysis, 12 Jun 2026)**: territory =
    the branch hanging off your node (family-lens computation). Direct writes
    inside your branch — an elder's bulk-fill must never show "pending" (approval
    queues are status transactions; approve boundaries, never facts). Suggest-mode
    everywhere else: the branch's steward confirms in a tap. Joining two branches
    is a handshake ratified by the other side's steward — both houses confirm an
    alliance. Stewards delegate within their own branch by sending invites; the
    owner holds global revoke and honors take-me-out requests (DPDP: likely
    personal/domestic exemption — honored regardless). Nothing hard-deletes (links
    removed, never people); every change is attributed — credit is the currency
    kin-keepers are paid in, and receipts de-escalate disputes.
  - **Visibility — thin-for-living on every shared surface**: living people outside
    the viewer's own branch render plain — no divorce/step/"former" qualifiers, on
    nodes AND in the relationship-chain renderer; deceased people render fully.
  - **Build order when un-paused**: sync core + claim links (owner's device first)
    → territory/suggestions/approvals inbox → published logged-out view → onboard
    the first steward (mother-in-law, Niyati's side).

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
Desktop (≥1024px): one workspace — pick in the index → tree centres + record
docks; canvas tap swaps the record without moving the view; Esc/✕/empty-tap
close it; You/Fit/+/− pills; sheets open as centred dialogs. Below 1024px the
touch grammar must be byte-identical to before.
`node scripts/test-relationship.mjs` and `npm run build` must stay clean.
