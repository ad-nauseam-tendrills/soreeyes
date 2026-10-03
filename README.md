# Sore Eyes

*Train the eye. The hand will follow.*

A private, single-user deliberate-practice companion for Darren R. Rousar's
**An Accurate Eye** (with its Supplemental Content) and **A Comparative Eye**
(Course Book + Workbook). It's built around attempt → check → record the error → repeat →
proficiency → spaced review, not around ticking things off.

Not affiliated with the author or publisher. It shows the owner's own legally purchased pages,
privately and behind a login. See [`COURSE_AUDIT.md`](COURSE_AUDIT.md) for every page reference
and [`DEPLOY.md`](DEPLOY.md) for hosting.

## Running locally

```bash
npm ci
cp .env.example .env.local
npm run hash-password            # paste the output into .env.local
openssl rand -base64 48          # paste as SESSION_SECRET
npm run extract-assets -- --aae … --sup … --ceb … --cew …   # see "Exercise sheets"
npm run dev                      # http://localhost:3100
```

| Command | What it does |
|---|---|
| `npm test` | Vitest: course data integrity, prerequisites, unlocking, review scheduling, rework and mastery transitions, progress, journal, print plan, export/import, sessions |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | production build (standalone server) |
| `docker compose up -d --build` | on the droplet: test, build and (re)start the container (see DEPLOY.md) |
| `npm run manifest` | regenerate `src/content/asset-manifest.json` after changing page references |
| `npm run audit:roles` | regenerate the Asset roles table in `COURSE_AUDIT.md` |

## How it's put together

- **Next.js 15 (App Router) + TypeScript + Tailwind 4.** No database: a single JSON file
  (`DATA_DIR/state.json`) with atomic writes and 30 rolling backups. For one user this is
  simpler and sturdier than a database server.
- **Course data** — `src/content/course-data.ts`, built from the audit. Each exercise records:
  instruction pages, display source, printable source/target, setup key, hidden check key,
  reused sheets, materials, paraphrased steps, checking steps, rotation, prerequisites,
  target scale (CE) and mastery guidance.
- **Progress engine** — `src/lib/progress/engine.ts`. Every state is *derived* by replaying
  the attempt log, so history and states can never disagree. Tunables live at the top:
  - Proficient = 2 good (Accurate / Mostly Accurate) of the last 3 attempts, latest good.
  - Reviews at 3 → 7 → 14 → 30 days. Accurate extends the interval, Mostly Accurate repeats
    it, Needs Rework sends the exercise back to the rework queue.
  - Mastered = Proficient plus all four reviews passed; after that, a maintenance review every 60 days.
  - A Comparative Eye unlocks when all 31 An Accurate Eye core exercises have been Proficient.
    Minis, supplementals and Review-and-Test checkpoints never block progress.
  - Today suggests the current exercise, at most 2 reviews (setting), anything needing rework,
    and occasionally one older skill from a different, already-learned section.
- **Auth** — one owner password (scrypt hash in an env var) → signed HttpOnly cookie.
  `src/middleware.ts` guards every route, and server actions and route handlers re-check.

## Exercise sheets (private)

`npm run extract-assets` renders **only** the 130 pages the course uses from your PDFs into
`ASSETS_DIR` (default `./private-assets`, gitignored):

- `png/<id>.png` — on-screen display (150 dpi)
- `pdf/<id>.pdf` — the original vector page at its true size, for printing

They're served only through `/api/asset/<id>` and `/api/print`, both owner-only and both
checked against the allow-list. The PDFs and rendered pages are never committed. Print from the
PDF that opens at **100% / Actual Size**.

Keys work exactly as the book intends. A key you need only for checking is never shown,
preloaded or printed until **Finish Attempt → Check My Work**. Keys the book uses during setup
(CE 4c onward and the Finals: mark top and bottom, then put the key away) are included in
*Print Required Sheets* but still never shown on screen early.

## Photos

Optional. A photo is downscaled in the browser to ≤1600 px JPEG and stored in `DATA_DIR/photos`.
It's served only to the owner. Exports reference photos by id; back up `DATA_DIR` to keep the images.
