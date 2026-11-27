# Brief Q5.x — fixes after the full manual QA

- **Task:** Q5.1–Q5.6 (issue #30). **Worker:** Luna (OpenCode). Repo root `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.
- **State:** a previous worker was stopped mid-task. Its **uncommitted** partial changes are in the working tree (`git diff` and the new files `app/src/components/chat/scroll.ts`, `app/tests/unit/case-form/q5-description.test.ts`, `app/tests/unit/chat/q5-fixes.test.tsx`). Review them first (read-only git commands are allowed: `git diff`, `git status`), keep what is correct, complete the rest.

## Read
Defects section of `docs/plans/qa/Q5/README.md` (evidence, measurements); `docs/ADR/003-frontend.md` §3.3–§3.6; `docs/PRD.md` AC-07, AC-40, §9.2, §9.3; `app/AGENTS.md`.

## Fix
- **Q5.1 (medium, AC-40):** when a reply arrives the list jumps to the bottom although the user scrolled up (scrollTop 538→1408). Auto-scroll only while the user is at (or within a small threshold of) the bottom; otherwise keep the position and show the "scroll to latest" button. Check how `components/ui/message-scroller.tsx` decides to stick and how `chat-view.tsx` uses `scrollAnchor`.
- **Q5.2 (low-medium):** the first message opens scrolled to its end; on entering the chat the view starts at the top of the first message.
- **Q5.3 (low):** the case summary panel shows ISO dates; show DD.MM.RRRR (also in the progress summary if it shows a date).
- **Q5.4 (low):** a complaint description over 2000 characters shows "Opisz problem (min. 20 znaków)." instead of `pl.errors.descriptionTooLong`.
- **Q5.5 (low):** progress screen a11y: an h1 `pl.progress.title` = "Analizujemy Twoje zgłoszenie"; page content inside a `main` landmark on every screen.
- **Q5.6 (low):** integration tests time out at 5 s under load: raise the timeout for `tests/integration/**` (e.g. 30 s) in `vitest.config.ts`; do not change assertions.

## Steps
1. Tests first (RTL/unit) for Q5.2–Q5.5 and the scroll decision; red → green.
2. `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` — redirect outputs to `app/var/q5fix/*.log` and read them there.
3. Real check of Q5.1/Q5.2 on a production build with `playwright-cli` (run `playwright-cli --help` first): start `DECISION_MODE=fast-only node --env-file=/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11/.env node_modules/.bin/next start -p 3801 > var/q5fix/server.log 2>&1 &` (never open/print/grep `.env`), complete a case, send a message, scroll up while the reply is pending, confirm the position is kept and the button appears; then stop **that** server by its PID.

## Editable files
`app/src/components/**`, `app/src/app/page.tsx`, `app/src/app/layout.tsx`, `app/src/lib/i18n/pl.ts`, `app/src/lib/domain/index.ts` (Q5.4 only), `app/vitest.config.ts`, `app/tests/unit/**`.

## Rules
No git writes, no installs, never open `.env`, never read or write outside the repository (no /tmp; logs under `app/var/q5fix/`). Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-Q5-fixes.report.md`: per defect — test, fix, result; check counts; the real-check measurements.
