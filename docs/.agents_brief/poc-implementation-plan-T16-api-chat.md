# Brief T16 — `POST /api/chat` with revision

- **Task:** T16, issue #25. Prerequisites T08, T09b, T13, T14 accepted. Concurrent: T17 starts after you (it needs your contract).
- **Worker:** Luna (OpenCode). Repo root `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
- `docs/ADR/001-ai-decision-pipeline.md` §3.7 entirely (system prompt + `<case>` block, index-0 rule, `revise_decision` with `corrections`, execution steps 1–4, asking for a human, tool-first ordering and the server guard, stream assembly), §3.6 hard constraints, TD-104, §8 rows "Revision with corrections", "Chat system context", "Revision tool".
- `docs/ADR/002-backend-api.md` §3.2, §4 (chat body, `data-decision` part), §5 (chat rows), §8 chat rows.
- `docs/ADR/000-main-architecture.md` §5 (`CaseRecord.revisions`, log events `decision_revised`, `revision_rejected`, `revision_order_violation`, `chat_failed`), §6 `/api/chat`.
- Recordings `app/tests/fixtures/captured/llm-chat-reply`, `llm-chat-tool-step1`, `llm-chat-tool-step2`, `llm-error-*`, and how they were made: `app/scripts/capture/llm.ts`, the captured README.
- Code: `app/src/server/{llm,rules,case-store,decision-log,prompts,policies,env}`, `app/src/lib/domain` (`ReviseDecisionInputSchema`, `makeReviseDecisionInputSchema`, `DecisionDataSchema`, `CaseUIMessage`), `app/src/lib/i18n/pl.ts` (`disclaimer`, `errors` chat texts), `app/tests/helpers/replay-fetch.ts`, `app/src/server/pipeline` (how `CaseRecord` and `firstMessage` are stored). `app/AGENTS.md`.
- AI SDK 7: `npx ctx7@latest docs /vercel/ai/ai_7.0.0 "createUIMessageStream writer.merge toUIMessageStream onError"`, `"streamText tools stopWhen stepCountIs"`, `"convertToModelMessages"`, `"createUIMessageStreamResponse consumeSseStream"`.

## Contract
- `app/src/server/llm/chat.ts` (+ `chat-context.ts` if useful): `buildChatSystem(record)`; `chatStream(record, messages, signal, deps?: { fetch?: typeof fetch })` returning a UI message stream per ADR-001 §3.7: `start`/`finish` metadata `{decision: currentDecision}`; tool `revise_decision` executing steps 1–4 against the store (corrections → recomputed facts, `checkLlmOutcome`, reject same-decision-without-corrections, log events); on `applied: true` write a `data-decision` part `{decision, previous, reason}` and, after the model text ends, a text part with `pl.disclaimer`; server guard: text deltas before the tool call in the same turn → no `data-decision`, log `revision_order_violation`, store **not** updated (so evaluate the guard before applying — or revert); `sendReasoning: false`; `onError` → `pl.errors` chat failure text "Nie udało się wysłać odpowiedzi." and log `chat_failed {failureCode, step:'chat'}`; `stopWhen` 2 steps.
- `app/src/app/api/chat/route.ts`: `runtime='nodejs'`, `dynamic='force-dynamic'`, `maxDuration=60`; body validated with Zod (`{id, caseId, messages}`; 1–60 messages; last message from the user with one text part 1–2000 chars after trim; user messages text parts only — file parts → 400 `{error:'invalid_request'}`); index 0 must be the assistant message with `id === record.firstMessage.id`, replaced by the stored copy (else 400); unknown/expired case → 404 `{error:'case_not_found'}` (TTL refreshed on access); response `createUIMessageStreamResponse({ stream, consumeSseStream: consumeStream })`.

## Editable files
`app/src/app/api/chat/**`, `app/src/server/llm/chat*.ts`, `app/tests/integration/chat/**`, `app/tests/unit/chat-server/**`, `app/tests/fixtures/captured/MUTATIONS.md` (append rows only).

## Steps
1. Tests first. Integration (replay fetch through the real provider): chat reply streams text + `metadata.decision`; the request sent upstream contains the form data and the right policy only; tampered first message in client history → 400; unknown case → 404; 2001-char message, file part, 61 messages, whitespace-only → 400; chat-with-tool (step1+step2 recordings) on a stored rejected in-store return → applied, facts recomputed, store updated, `data-decision` part, disclaimer appended, `decision_revised` logged; same-decision mutation → `applied:false`, no part, `revision_rejected`; `escalated` on an expired case → applied; `accepted` on an expired complaint → `applied:false`; text-before-tool mutation → guard, `revision_order_violation`, badge unchanged; recorded 4xx → masked Polish error and `chat_failed`. Unit: system context contains date facts, decision, analysis; the first message comes from the store. Declare mutations in `MUTATIONS.md`; no inline bodies. Red → record.
2. Implement; `npm test` (whole suite), lint, typecheck, build green.

## Tool guidance (plan §4.2)
1. `--help` → Context7 (queries above) → official docs last. Research via `opencode run -m opencode/deepseek-v4.1-flash-free --agent plan "<q>; answer with sources"`.
2. npm only, never install. No git. Never open `.env`; replay only, no real calls. Edit only the listed files. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-T16-api-chat.report.md`: files, red/green with counts, test → ADR row table, mutations, contradictions, and the exact stream contract T17 relies on (part types, metadata, 404 body).
