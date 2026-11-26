# T11 report: brand theme and header

Status: implemented. Test and lint pass. Typecheck and build are blocked by the concurrent T04 files in `app/tests/unit/domain/` (missing modules `src/server/env`, `src/lib/i18n/pl`, `src/lib/domain`). My own code has zero type errors. Server not started (QA gate is the orchestrator's).

## Files changed
- `app/tests/unit/app-header.test.tsx` (new): jsdom test, `AppHeader` renders a `banner` containing "Hardware Service Decision Copilot".
- `app/src/components/app-header/app-header.tsx` (new): sticky white `<header>`, `h-16` mobile / `md:h-20` (80px), border-bottom, navy bold wordmark, container `max-w-[1360px]`. No image logo.
- `app/src/components/app-header/index.ts` (new): re-export.
- `app/src/app/globals.css`: light theme only. `.dark` block and `dark:` variant removed. Tokens from `assets/design-tokens.json` mapped to shadcn variables: background #FEFEFE, foreground #515D6A, primary and card-foreground #003963, primary-foreground #FFFFFF, accent and ring #0096E0, border and input #85D2F1, destructive #CC1D56, muted and secondary #E9F4FD, muted-foreground #515D6A (not #788CAA), success #208A20, radius 0px. `--font-sans` now reads `--font-noto-sans` (the old self-reference was circular). Geist and chart/sidebar variables removed.
- `app/src/app/layout.tsx`: `lang="pl"`, `Noto_Sans` (subsets latin and latin-ext, weights 400/500/700, variable `--font-noto-sans`), Polish metadata, `<AppHeader />` above children. Geist removed.
- `app/src/components/ui/button.tsx`: default variant is an outlined pill (white fill, 1px #0096E0 border, navy bold, radius 22px, `h-[47px]`, `px-[50px]`, 18px). Disabled state uses muted text and border instead of an opacity fade. `sm` is `h-[41px]`, 14.4px, `px-8`. `destructive` is a tinted outline, not filled; its text on the tint is about 5.1:1 (hover about 4.8:1), both above 4.5:1. Other variants kept, dark classes removed.
- `app/src/app/page.tsx`: temporary placeholder. `<main>`, `h1` "Zgłoś reklamację lub zwrot", one Polish intro sentence, sample `<Button>` "Wyślij zgłoszenie" with no handler.

## Test evidence
- Step 1 (red), before the component existed: `Failed to resolve import "@/components/app-header" from "tests/unit/app-header.test.tsx"`. Suite failed, 0 tests run.
- After the component: `npx vitest run tests/unit/app-header.test.tsx` gives `Test Files 1 passed (1)`, `Tests 1 passed (1)`.
- `npm test`: exit 0, `Test Files 1 passed (1)`, `Tests 1 passed (1)`.

## Checks
- `npm run lint`: PASS, exit 0.
- `npm run typecheck`: FAIL, exit 2. All 4 errors are in `tests/unit/domain/` (env.test.ts x2, pl.test.ts, schemas.test.ts, all TS2307 missing modules). `npx tsc --noEmit` outside that folder: 0 errors. Not caused by T11; should pass once the T04 source modules exist.
- `npm run build`: compile step PASS ("Compiled successfully"), then the TypeScript step FAILS on the same 4 `tests/unit/domain/` errors. Build not verified; re-run after T04 lands.

## Notes and contradictions
- Font: `next/font/google` used per ADR-003 §3.5 and the rights notice; no local font files added.
- `button.tsx` imports `cn` from the npm package `cn`, while `components.json` aliases utils to `@/lib/utils`. Pre-existing; left unchanged.
- Context7 (`/vercel/next.js/v16.4.5`, `next/font/google`) confirmed the `subsets`, `weight` array and `variable` options.
- Brief step 3 had `--foreground #003963?`. Resolved as #515D6A per the guidelines (body text slate; headings navy via classes).
- Housekeeping: my lint and typecheck logs were written to `/tmp`; the cleanup command was denied, so they remain there (`/tmp/t11-*.log`). Harmless, can be deleted.
