# Brief Q6.x — fixes after the regression gate

- **Task:** Q6.1, Q6.2 and one observation (issue #32). **Worker:** Luna (OpenCode). Repo root `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11` — use exactly this path; app in `app/`.

## Read
`docs/plans/qa/Q6/README.md` (defects, measurements, screenshots), `docs/PRD.md` AC-40, AC-44, AC-52, Flow 4.6, `docs/ADR/003-frontend.md` §3.4, `app/src/components/chat/chat-view.tsx`, `app/src/components/chat/scroll.ts`, `app/src/components/ui/message-scroller.tsx`, `app/src/server/llm/chat.ts` (revision header), `app/tests/e2e/e12.spec.ts`, `app/AGENTS.md`.

## Fix
1. **Q6.1:** PRD AC-44 requires the confirmation dialog for **every** "Nowa sprawa" click. The orchestrator reverses its earlier Q4.4 decision: on an expired case "Nowa sprawa" must also open the confirmation dialog (Flow 4.6 text); confirm → empty form. Update the unit tests that asserted the no-dialog behaviour. Do not change `e12.spec.ts` (it already expects the dialog).
2. **Q6.2:** the chat still opens scrolled to the bottom ("Dzień dobry" is −169 px at 1920, −841 px at 360 for 12 s). On entering the chat (only the first message present) the scroll position must be at the top of the first message; stick-to-bottom starts only after the user sends a message. Find why the earlier Q5.2 change did not take effect in the real browser (e.g. the scroller's own auto-scroll on mount or ResizeObserver, `scrollAnchor` on the first message) and fix it.
3. **Observation:** "revision block shown with an unchanged decision": check `chat.ts` — the server-built "Zmieniona ocena" header must be written **only** when a revision was applied (`applied: true` and the decision changed); add/adjust an integration test if missing.

## Steps
Tests first where testable; red → green. Then `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` with outputs under `app/var/q6fix/*.log`. Real check (needed for item 2): run from `app/` `DECISION_MODE=fast-only node --env-file=/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11/.env node_modules/.bin/next start -p 3811 > var/q6fix/server.log 2>&1 &` (never open/print/grep `.env`); with `playwright-cli` (`playwright-cli --help`) complete a fast-path complaint with `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11/assets/example-images/laptop-1.png` and measure the position of the "Dzień dobry" heading relative to the scroller at 1920×1080 and 360×740 for ~10 s; check the expired-case dialog is not needed live (unit test is enough). Stop that server by PID.

## Editable files
`app/src/components/chat/**`, `app/src/components/ui/message-scroller.tsx`, `app/src/server/llm/chat.ts`, `app/tests/unit/chat/**`, `app/tests/integration/chat/**`.

## Rules
No git writes, no installs, never open `.env`, never read or write outside the repository (no /tmp; logs under `app/var/q6fix/`). Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-Q6-fixes.report.md`: per item — cause, test, fix, measurement; check counts.
