# Kutumbakam — project instructions

Local-first family tree PWA. React 19 + Vite 6 + Tailwind 4 + vite-plugin-pwa +
Dexie (IndexedDB). No backend, no analytics, no accounts — by design. See PRD.md for
decisions, data model and milestones.

## Rules
- **All Dexie access stays inside `src/db/`** — screens/components import from
  `repo.js` / `exportImport.js` / `seed.js`, never `db.js` tables directly.
- **Sensitive field class**: `phone`, `privateNotes`. Never include them in any share,
  publish, or sync surface; only the full backup export carries them. Preserve this in
  every new feature.
- **Design tokens live in `src/index.css` `@theme`** — interim "paper & ink" system.
  Kiran (designer) will brief the final art direction; don't art-direct beyond the
  token system without him. No new fonts/colors outside tokens.
- **Kinship correctness data matters**: `birthOrder`, union order, `relation` on
  childLinks, gender — the future "how are we related" engine (English + Tulu) depends
  on them. Don't drop these fields in forms or migrations.
- Demo seed (`src/db/seed.js`) is fictional — keep it that way; never seed real family
  members.
- Dev server: registered as `kutumbakam` in repo-wide `.claude/launch.json`, port 5180.
  Build with `npm run build` before declaring done.
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
