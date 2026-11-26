# Brief Q2.x — fixes for the failed Q2 gate

- **Tasks:** Q2.1–Q2.4 (issue #11). Owner files of T12 and T15. Concurrent: a worker finishing T14 in `app/src/app/api/**`, `app/src/server/pipeline/**` — do not touch those.
- **Worker:** Sonnet subagent. Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
`docs/plans/qa/Q2/README.md` (defects with evidence and screenshots), `docs/ADR/003-frontend.md` §3.2, §3.3, §3.5 (outlined pill buttons), `docs/design-guidelines.md` Components, `app/AGENTS.md`.

## Defects
- **Q2.1 (high):** horizontal overflow (`scrollWidth` 375 at 360 px, 2535 at 1920 px) caused by the hidden photo `<input type=file>` (`sr-only` + `w-full`, absolutely positioned, not clipped). Fix so `document.documentElement.scrollWidth <= innerWidth` on every screen; keep the input accessible (label + keyboard open).
- **Q2.2 (medium):** after typing invalid values in model and description, the first click on "Wyślij zgłoszenie" does nothing because the blur validation message shifts the layout under the pointer; a second click works. Fix so a single click always submits/validates (e.g. reserve space for field messages, or avoid moving the button on blur — whichever keeps AC-15 intact).
- **Q2.3 (low):** "Usuń" and the banner's "Spróbuj ponownie" are square-cornered; all text buttons must be outlined pills (shared `Button` default/outline variants — use the default variant; do not edit `components/ui/button.tsx` unless a variant used here lacks the pill radius, then fix only that variant's radius). The progress-screen thumbnail is offset — align it with the summary.
- **Q2.4 (low, intermittent):** console showed `Unmergable intersection … ["description"]` Zod errors. Find where a client schema uses `.and()`/`z.intersection` with `makeCaseInputSchema` (the case form's client schema) and replace it with a single object schema / `superRefine` so no intersection is merged at parse time. Add a unit test that parses complaint and return drafts and switching type without throwing.

## Editable files
`app/src/components/case-form/**`, `app/src/components/progress/**`, `app/src/components/ui/button.tsx` (radius only, if needed), `app/tests/unit/case-form/**`, `app/tests/unit/page-state/**`.

## Steps
1. Add/extend tests first where testable in jsdom (Q2.4; Q2.3 class/variant assertions; Q2.1 input has the clipping classes). Red → record.
2. Fix; `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` green (build may also include the T14 worker's files; report if a failure is theirs).
3. Visual self-check with `playwright-cli` on a production build **only if port 3000 is free**: start `node --env-file=/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11/.env node_modules/.bin/next start -p 3000` (never open the `.env`), measure `scrollWidth` at 360 and 1920, click submit once after invalid blur, stop your server. Do not commit screenshots (Q2 re-run does).

## Rules
`--help` → Context7 → web last. npm only, never install. No git. Logs only under `app/var/`. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-Q2-fixes.report.md`; final answer ≤ 12 lines.
