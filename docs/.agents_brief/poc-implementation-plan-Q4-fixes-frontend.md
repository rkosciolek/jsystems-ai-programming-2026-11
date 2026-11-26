# Brief Q4.x (frontend) — chat layout, scroll button, summary after correction

- **Tasks:** Q4.1, AC-40, Q4.4 (UI), Q4.5, Q4.3 (input attribute) — issue #27. Concurrent: Q4.x server worker (`app/src/server/llm/chat*`, `app/src/lib/domain`, `pl.ts`) and the E2E.1 worker (`app/src/server/pipeline/**`). Do not touch their files.
- **Worker:** Sonnet subagent. Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
`docs/plans/qa/Q4/README.md` (Q4.1, Q4.4, Q4.5, AC-40 with measurements and screenshots), `docs/ADR/003-frontend.md` §3.4, §3.5, `docs/PRD.md` §9.3, AC-40, `app/src/components/chat/**`, `app/src/components/ui/message-scroller.tsx` and `message.tsx` (shadcn AI Elements patterns — check their intended usage/props in the file and via `npx shadcn@latest docs message-scroller` or `view`), `app/src/app/page.tsx`.

## Fix
1. **Q4.1 (high):** the last child of `[role=log]` grows to millions of px after the first reply. Find the cause (unbounded scroller height, two `scrollAnchor` items, a resize feedback loop) and fix it: the chat column has a bounded message area (e.g. flex column filling the viewport under the header, the list scrolls inside), document height stays reasonable (< 3× viewport) after several replies at 360 and 1920 px.
2. **AC-40:** the "scroll to latest" button (`pl.chat.ui.scrollToLatest`) becomes visible when the user scrolls up and the list does not force-scroll while a reply streams; it stays hidden at the bottom.
3. **Q4.4 UI:** the case summary panel shows the corrected `purchaseDate`/`channel` after a revision: read `corrections` from the latest `data-decision` part (`DecisionDataSchema` gains optional `corrections: {purchaseDate?, channel?}` — the server worker adds it; code against that shape). On an **expired** case, "Nowa sprawa" resets without the confirmation dialog (nothing is left to lose).
4. **Q4.5:** no empty bordered assistant bubble above the typing indicator (do not render an assistant message with no visible text).
5. **Q4.3 input:** the purchase-date input gets `min="2000-01-01"` (the shared schema enforces the same; done by the server worker).
6. Tests first (RTL): summary uses corrections; expired → Nowa sprawa without dialog; empty assistant message not rendered; scroll button visibility logic if it is unit-testable; date input `min`. Red → record.
7. `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
8. Real check with `playwright-cli` on a production build: start `DECISION_MODE=fast-only node --env-file=/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11/.env node_modules/.bin/next start -p 3501` (never open/print/grep `.env`), complete a case, send 3 chat messages, measure `document.documentElement.scrollHeight` and `scrollWidth` at 360 and 1920, scroll up during a reply and confirm the button appears. Stop your server. Screenshots are not committed by you.

## Editable files
`app/src/components/chat/**`, `app/src/components/case-form/**` (date `min` only), `app/src/app/page.tsx`, `app/tests/unit/chat/**`, `app/tests/unit/case-form/**`.

## Rules
No git, no installs, never open `.env`, scratch only under `app/var/`. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-Q4-fixes-frontend.report.md` with the measured heights; final answer ≤ 10 lines.
