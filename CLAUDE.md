# Kutumbakam — project instructions

Local-first family tree PWA. React 19 + Vite 6 + Tailwind 4 + vite-plugin-pwa +
Dexie (IndexedDB). No backend, no analytics, no accounts today — by design. The
M5 multi-user direction is locked but unbuilt (12 Jun 2026: thin hosted sync
service + node-anchored claim links; the app stays offline-first) — read PRD.md
M5 before touching anything sharing-related. PRD.md holds decisions, data model
and milestones.

## Rules
- **All Dexie access stays inside `src/db/`** — screens/components import from
  `repo.js` / `exportImport.js` / `seed.js`, never `db.js` tables directly.
- **Sensitive field class**: `phone`, `privateNotes`. Never include them in any share,
  publish, or sync surface; only the full backup export carries them. Preserve this in
  every new feature.
- **Design tokens live in `src/index.css` `@theme`** — the "paper & ink" system,
  **ratified by Kiran as the visual direction (12 Jun 2026)**. The canonical,
  reusable system (tokens + visual style guide + adoption rules) lives at
  `../paper-ink/` — keep the two token sets in sync. No new fonts/colors/sizes
  outside tokens; known token debt (hardcoded #fff8f3, #d9b6ae, 13px/22px radii)
  is listed in `../paper-ink/README.md` — adopt the named tokens at next touch.
- **Kinship correctness data matters**: `birthOrder`, union order, `relation` on
  childLinks, gender — the "how are we related" engine (`src/lib/relationship.js`,
  English live; Tulu pending Kiran's words in `src/lib/kinshipTerms.js`) depends on
  them. Don't drop these fields in forms or migrations.
- Demo seed (`src/db/seed.js`) is fictional — keep it that way; never seed real family
  members.
- Dev server: registered as `kutumbakam` in repo-wide `.claude/launch.json`, port 5180.
  Build with `npm run build` before declaring done.
- **One responsive fork: 1024px** (`useIsDesktop` for behaviour, `lg:` for
  styling). Desktop = the workspace (index | canvas | record) + dialogs;
  below it the touch grammar. The desktop laws live in `../paper-ink/`
  (README "Desktop grammar", styleguide §10).
- **Embedded-preview quirk** (verified 12 Jun 2026): the in-app preview
  browser delivers NO matchMedia change events, NO ResizeObserver callbacks
  and NO requestAnimationFrame ticks — CSS animations freeze at their
  from-frame (a `dialog-in` dialog measures 480×0.985 ≈ 473px and can sit at
  opacity 0 in screenshots) — and setTimeout fires ~300–600ms LATE. Verify
  breakpoint crossings by reloading at the target size; never gate app
  behaviour on rAF/RO alone (pair with deterministic effects and timer
  watchdogs); after animated view changes, wait ≥1.5s before measuring.
- **Deploy**: GitHub Pages via `.github/workflows/deploy.yml` on push to main
  (repo `kiranrajagopalan/kutumbakam`, gh-pages branch, served at
  **https://karnatricks.com/kutumbakam/** — the account's user-site custom
  domain hosts all project pages, same as Lekka at /lekka/ —
  with `VITE_BASE=/kutumbakam/`).
  Kiran uses the deployed PWA (installed on phone/Mac); localhost is for
  development only. IndexedDB is per-origin — moving between localhost and the
  deployed URL requires export → import.
- This is a family/home-world app (like Lekka). It is unrelated to Karnatricks/Raga Rush
  conventions despite the shared folder.
