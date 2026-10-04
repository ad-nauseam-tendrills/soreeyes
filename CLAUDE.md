# Sore Eyes — notes for Claude

A private, single-user Next.js app (repo: ad-nauseam-tendrills/soreeyes; it shares a droplet with ArtBench but nothing else).
Read `README.md`, `COURSE_AUDIT.md` and `DEPLOY.md` first.

## Hard rules

- **Never commit the PDFs or any extracted page images/PDFs.** They live in `ASSETS_DIR`
  (gitignored `private-assets/`) and are served only through the allow-listed `/api/asset` and `/api/print` routes. Don't add
  a `public/` directory with course material, and don't use `next/image` for exercise sheets
  (its optimizer route would bypass the asset allow-list).
- **Hidden keys stay hidden** until Finish Attempt → Check My Work: don't render, preload or
  include them in a print job. Setup keys (CE 4c onward and the Finals) are printed but never displayed early.
- **Don't import `src/content/*` from client components.** It would ship course data in public
  JS bundles. Pass serializable props instead (see `PracticeFlow`, `lib/print-href.ts`).
- Page references come from `COURSE_AUDIT.md`. After changing any sheet reference, run
  `npm run manifest` and `npm run audit:roles`, then `npm test`.
- Progress is always derived from the attempt log (`lib/progress/engine.ts`). Don't store
  derived states.
- **No login**, by the owner's explicit choice. Don't reintroduce authentication unless asked.
- No gamification: no confetti, no "streak lost", no red alarm states. Rework language stays encouraging.

## Before calling a change done

`npm test && npm run typecheck && npm run build`. Bump `APP_VERSION` in `src/lib/version.ts` for
every deploy. The owner deploys on the droplet with `git pull && docker compose up -d --build`; Claude never needs or asks for server credentials.

The droplet also runs other Docker apps (ports 3000, 3001, 3210, 5432, 8000) behind host nginx — keep Sore Eyes on 127.0.0.1:3100 and within its memory cap.
