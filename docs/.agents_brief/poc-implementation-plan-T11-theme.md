# Brief T11 — brand theme and header

- **Task:** T11, issue #7. Concurrent: T04 tests (Haiku, `app/tests/unit/domain/**`) — disjoint files.
- **Worker:** Haiku subagent. Repo: `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Goal
The app shows the brand: tokens mapped to shadcn CSS variables, Noto Sans (latin + latin-ext), outlined-pill buttons, and a header with the text wordmark "Hardware Service Decision Copilot". A temporary home page shows a sample outlined button so Q1 can check it.

## Read (sections only)
- `docs/ADR/003-frontend.md` §3.1 (header paragraph), §3.5 (styling and brand), §3.6.
- `docs/design-guidelines.md` (Colors, Typography, Border radius, Components → Header / Primary button, Logo placement).
- `assets/design-tokens.json`.
- Current `app/src/app/globals.css`, `app/src/app/layout.tsx`, `app/src/components/ui/button.tsx`.

## Editable files
`app/src/app/globals.css`, `app/src/app/layout.tsx`, `app/src/app/page.tsx` (temporary placeholder, T15 replaces it), `app/src/components/app-header/**`, `app/src/components/ui/button.tsx`, `app/tests/unit/app-header.test.tsx`.

## Steps
1. **Test first** (`app/tests/unit/app-header.test.tsx`, jsdom): `AppHeader` renders a `banner` landmark containing the text "Hardware Service Decision Copilot". Run `npm test` → red (module missing). Record it.
2. `components/app-header/app-header.tsx` (+ `index.ts`): white, sticky, 80 px high (smaller on mobile allowed), wordmark left in navy bold, no image logo; max container width 1360 px with padding.
3. `globals.css` light theme only (remove `.dark` block and dark variant usage if unused): `--background #FEFEFE`, `--foreground #003963`? → use body text `#515D6A` per guidelines and headings navy; `--primary #003963`, `--primary-foreground #FFFFFF`, `--ring` and `--accent #0096E0`, `--accent-foreground #003963`, `--border` and `--input #85D2F1`, `--destructive #CC1D56`, `--muted #E9F4FD`, `--muted-foreground #515D6A` (never `#788CAA` for text), `--card #FFFFFF`, `--card-foreground #003963`, `--radius` small (sections square). Also define `--success #208A20`. Font var `--font-sans` from Noto Sans.
4. `layout.tsx`: `lang="pl"`, `Noto_Sans` from `next/font/google` with `subsets: ['latin','latin-ext']`, weights 400/500/700, `variable: '--font-sans'`; metadata title "Hardware Service Decision Copilot", Polish description; render `<AppHeader />` above `children`. Remove Geist.
5. `button.tsx`: default variant = outlined pill: white fill, 1px `#0096E0` border, navy bold text, radius 22px, padding `8px 50px` on default size (smaller sizes allowed for `sm`/`icon`), visible focus ring (`--ring`), disabled state readable. Keep the other variants working; `destructive` must not be filled with text below 4.5:1.
6. `page.tsx` (temporary): `<main>` with an `h1` "Zgłoś reklamację lub zwrot", one Polish intro sentence, and a sample `<Button>` "Wyślij zgłoszenie" (no handler). All text Polish.
7. `npm test` green, `npm run lint`, `npm run typecheck`, `npm run build` pass. Do not start servers; the orchestrator's QA gate does that.

## Tool guidance (plan §4.2)
`--help` → Context7 (`npx ctx7@latest library Next.js "next/font google latin-ext"`) → web last. npm only, never install. No git. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-T11-theme.report.md`: files, red/green test lines, lint/typecheck/build results. Final answer ≤ 10 lines.
