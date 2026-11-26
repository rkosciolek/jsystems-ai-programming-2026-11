# T17 — Chat view implementation report

## Files changed

- `app/src/components/chat/chat-view.tsx` — streaming chat, decision badge, case summary, message thread, prompt input, retry and expired-case handling.
- `app/src/components/chat/index.ts` — chat component export.
- `app/src/app/page.tsx` — mounts `ChatView` for the chat state.
- `app/tests/unit/chat/chat-view.test.tsx` — RTL coverage for the new chat behavior.
- Deleted `app/src/components/first-message-view/first-message-view.tsx` and `app/src/components/first-message-view/index.ts`.
- Deleted `app/tests/unit/page-state/first-message-view.test.tsx`; its covered behavior is now exercised in `app/tests/unit/chat/chat-view.test.tsx`.
- `app/tests/unit/page-state/page.test.tsx` has no net changes.

## Red → green

- **Red:** the first targeted Vitest run failed to resolve `@/components/chat`; one suite failed during import and **0 tests executed**. This was the expected failure before creating the component.
- **Green, changed scope:** `npm test -- tests/unit/chat/chat-view.test.tsx tests/unit/page-state/page.test.tsx` — **2 files passed, 32 tests passed, 0 skipped**.
- The chat tests verify `useChat` seeding, `caseId` transport body, data schema, Markdown with raw HTML disabled, badge source precedence and all badge tones, revised-assessment marker, input limits and keyboard behavior, typing state, retry behavior, expired-case 404 handling, responsive summary, no attachment input, new-case confirmation, and the message scroller.

## ADR-003 §8 coverage map

| ADR-003 §8 scenario / requirement | Test evidence |
|---|---|
| Badge source | Initial-message metadata fallback; later metadata; latest `data-decision` overriding metadata. |
| Decision badge styling and accessible name | Each decision has its Polish label, icon, accessible name and specified border color. |
| Chat input | Whitespace-only disabled; 2000-character cap; Enter sends; Shift+Enter does not submit; composing Enter does not submit; counter appears at 1800. |
| Chat retry | Error is rendered after the last user message; Ponów calls `regenerate()` once without calling `sendMessage()` or duplicating the user turn; send remains disabled outside `ready`. |
| Chat stream status | Indicator shown for `submitted` and `streaming` before text, then hidden once assistant text arrives. |
| Expired case (AC-52) | Wrapped transport recognizes HTTP 404 with `{ "error": "case_not_found" }`, shows the expired text and disables input. |
| Summary responsive default | `matchMedia` at 767 px initializes the collapsible summary closed. |
| No chat attachments (AC-38) | No file input or attachment control is rendered. |
| New case (AC-44) | Cancel preserves the current case; confirm invokes the reset callback. |
| beforeunload (AC-43) | Existing `page.test.tsx` verifies the listener is present only in the chat state and is removed after reset. |
| First message and scrolling | Seeded assistant message is visible in the role=log thread; AI Elements message scroller uses auto-scroll and exposes the scroll-to-latest control. |

## Verification

- `npm run lint` — passed with no ESLint findings.
- `npm run typecheck` — final standalone retry passed (`next typegen` and `tsc --noEmit`). One earlier run reported TS2532 in the unchanged `app/src/server/llm/citations.ts:19`; the immediate standalone retry passed.
- `npm run build` — passed; Next.js 16.4.6 compiled the application, typechecked it, generated 4 static pages, and listed `/api/chat` as a dynamic route.
- Full serialized suite (`npm test -- --no-file-parallelism --maxWorkers=1`) — **26 files, 445 passed, 1 failed**. The failure was the existing integration case `logs client disconnect as case_aborted without persisting a case or emitting an error`. Rerunning that test alone passed (**1 passed, 14 skipped**).
- The earlier default-parallel full `npm test` run completed with **26 files, 429 passed, 12 failed**; failures included worker timeouts and existing captured-response expectation mismatches. These failures were outside the T17 files and scope. The serialized run reduced this to the one disconnect failure, which passed in isolation.
- Vite emitted its existing config-loader and `vite-tsconfig-paths` advisories in Vitest runs.
- `git diff --check` — passed. Search found no remaining source imports or references to `FirstMessageView`.
- No application server was started and no Playwright/browser screenshots were taken, as instructed.

## Missing `pl.ts` strings

`app/src/lib/i18n/pl.ts` was left unchanged as required. These newly needed chat labels are not present there:

- `Szczegóły sprawy`
- `Rozmowa ze specjalistą`
- `Asystent przygotowuje odpowiedź`
- `Asystent pisze…`
- `Wiadomość`
- `Napisz wiadomość dotyczącą zgłoszenia`
- `Przewiń do najnowszej wiadomości`

Existing form labels, decision labels, retry/new-case text, errors and disclaimer are reused from `pl.ts`.

## Contradictions and execution limits

- AC-48 / ADR-003 §3.5 say all UI strings must be in `pl.ts`; the T17 brief explicitly says not to add strings there. The missing strings above remain in the chat component for this task and need a later localization-scope decision.
- The brief requested Context7 via `npx ctx7@latest`, but `ctx7` was not installed. It was not fetched or installed because the task forbids installations and writes outside the repository. The installed AI SDK 7.0.183 declarations were inspected locally and confirm `DefaultChatTransport` supports `body`, `fetch`, while `useChat` supports `dataPartSchemas`.
- The full serialized suite remains non-green due to the disconnect integration test's intermittent assertion; the isolated rerun passed. No changes were made to that test or its implementation.
- Runtime startup and visual/manual QA remain unverified because starting servers was prohibited.
