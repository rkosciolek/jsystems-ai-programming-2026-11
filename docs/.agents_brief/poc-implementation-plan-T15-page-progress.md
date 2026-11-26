# Brief T15 — page state machine, NDJSON client, progress screen, temporary first-message view

- **Task:** T15, issue #10. Prerequisite T12 (form) accepted. Concurrent: P3 backend workers in `app/src/server/**`.
- **Worker:** Haiku subagent. Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
- `docs/ADR/003-frontend.md` §3.1 (states, transitions incl. `ValidationError`), §3.3, §4, §5 (`submitCase`), §8 rows "NDJSON parser", "Reducer", "beforeunload" (listener only in chat).
- `docs/ADR/002-backend-api.md` §4 (events, validation error body), §5 (status codes).
- `docs/PRD.md` §9.2, AC-16, AC-42, AC-45.
- Contracts: `app/src/lib/domain` (`CaseEventSchema`, `CaseSummary`, `CaseUIMessage`, `DECISION_LABELS`), `app/src/lib/i18n/pl.ts`, `app/src/components/case-form/index.ts` (`Draft`, `CaseForm` props). `app/AGENTS.md`.

## Contracts to produce
- `app/src/lib/client/submit-case.ts`: `class ValidationError extends Error { status: 400|413|415; fields: Record<string,string> }`; `parseNdjson(stream: ReadableStream<Uint8Array>): AsyncIterable<CaseEvent>` (tolerates chunk boundaries mid-line and an empty trailing line; an invalid line yields `{type:'error', code:'internal'}` and stops); `submitCase(draft, signal): AsyncIterable<CaseEvent>` posts `FormData` (fields of ADR-000 §6, `photo` = the File) to `/api/cases`; on 400/413/415 with a JSON `fields` body throws `ValidationError`; on any other non-200 yields `{type:'error', code:'upstream'}`.
- `app/src/app/page-state.ts` (pure): `PageState` union `form | progress | chat` and `pageReducer` with every ADR-003 §3.1 transition; chat state holds `caseId, caseSummary, thumbnailUrl, firstMessage, decision`.
- `app/src/components/progress/`: `AnalysisProgress` with the 3 status lines (pending muted / active spinner / done check icon), `aria-live="polite"`, read-only summary (type, category label, model, thumbnail); no cancel button.
- `app/src/components/first-message-view/`: **temporary** chat-state view (T17 replaces it): header with case number, decision badge (label + lucide icon, accessible name "Decyzja: …", outlined, navy text, border color per ADR-003 §3.5), the first message rendered with Streamdown (raw HTML disabled), a "Nowa sprawa" button that asks the Flow 4.6 confirmation (AlertDialog) and resets.
- `app/src/app/page.tsx` (client component): wires `CaseForm` → progress → first-message view; valid submit dispatches `progress` synchronously before the request (AC-16); 95 s client timeout via `AbortController`; service error → form with draft kept and banner; `ValidationError` → form with `serverFieldErrors`, no banner; banner "Spróbuj ponownie" resubmits the kept draft; `beforeunload` listener only while in chat (AC-43); New case revokes the thumbnail object URL. No `localStorage`.

## Editable files
`app/src/app/page.tsx`, `app/src/app/page-state.ts`, `app/src/components/progress/**`, `app/src/components/first-message-view/**`, `app/src/lib/client/submit-case.ts`, `app/tests/unit/page-state/**`.

## Steps
1. Tests first: NDJSON parser (split chunks, invalid line, trailing newline), `submitCase` status mapping (mock `fetch` with `vi.fn`; this is our own client, not a model API), every reducer transition, beforeunload only in chat, progress component states. Red → record.
2. Implement; `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` green. Check Streamdown's Tailwind `@source` requirement in its docs (Context7 / README) and, if needed, report the exact line for `globals.css` (you may not edit it — the orchestrator adds it).

## Tool guidance (plan §4.2)
`--help` → Context7 (`npx ctx7@latest library streamdown "usage tailwind source"`) → web last. npm only, never install. No git. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-T15-page-progress.report.md`; final answer ≤ 12 lines.
