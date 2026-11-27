# T16 — `POST /api/chat` implementation report

## Files changed

- `app/src/app/api/chat/route.ts` — request parsing and validation, stored-case lookup, first-message substitution, and AI SDK UI-message SSE response.
- `app/src/server/llm/chat.ts` — server-built case/policy prompt, two-step chat stream, guarded `revise_decision` execution, fact recomputation, audit events, decision data part, masked errors, and disclaimer footer.
- `app/tests/integration/chat/api-chat.integration.test.ts` — route contract, bounds, TTL, stored first message, stream metadata, policy isolation, and masked 4xx coverage.
- `app/tests/integration/chat/chat-revisions.integration.test.ts` — captured provider replays for applied/rejected revisions, correction facts, expired-case escalation, and text-before-tool guard.
- `app/tests/unit/chat-server/chat-context.test.ts` — server-owned context coverage.
- `app/tests/fixtures/captured/MUTATIONS.md` — appended the three chat SSE mutation declarations used by revision tests.

## Red → green

- Initial test-first run: 3 suites failed to import the not-yet-created chat route/module; 0 tests executed.
- First executable focused run: 3 files, 15 tests; 10 passed and 5 failed. The failures exposed test setup/mutation issues (policy text extraction, fake-clock ordering, and rewriting captured tool-argument SSE frames). The test helpers/assertions were corrected without changing capture files.
- Final focused chat run: **3 files, 16 tests passed**. A later statutory-exclusion edge test was first run red (1 failed, 5 skipped), then passed after the tool check was changed to use the current stored citations.
- Full verification: **26 files, 432 tests passed** using `npm test -- --no-file-parallelism --maxWorkers=1`.
- The default parallel `npm test` run hit test-timeout failures in unrelated existing case/LLM/UI tests while 26 workers ran. A second default run had similar timeout failures; the disconnect scenario passed when rerun alone. The serialized full suite completed green.
- `npm run lint` — passed with no warnings.
- `npm run typecheck` — passed (`next typegen` and `tsc --noEmit`).
- `npm run build` — passed; Next.js compiled the app and listed `/api/chat` as a dynamic route.

## Test coverage mapped to ADR rows

| ADR scenario / row | Evidence |
|---|---|
| Chat system context | Unit test checks policy, date facts, decision, and image analysis in the server-built context. Route replay checks form context and verifies only the complaint policy is sent. |
| First message from the store | Route replay tampers with the client first-message text while retaining its id; the upstream request contains the stored server copy. A mismatched first-message id returns 400 without an upstream request. |
| Chat stream | Captured reply replay verifies text deltas and `start`/`finish` decision metadata. |
| Revision with corrections | Captured two-step replay changes an in-store return to online; corrected input and recomputed date facts are stored, with a decision part, disclaimer, and `decision_revised` event. |
| Revision tool | Captured-derived mutations cover same-decision/no-correction rejection, escalation on an expired return, acceptance rejected for an expired complaint, and text-before-tool ordering with unchanged stored decision. |
| Revision hard-rule citations | A captured-derived tool call attempts an online-withdrawal rejection; `checkLlmOutcome` uses the stored statutory-exclusion citation from the current outcome. |
| Chat 404 and input limits | Unknown and expired cases; TTL refresh; 2001-character text, file part, 61 messages, whitespace-only text, and non-user final message return 400/404 as specified. |
| Recorded provider error | Captured 401 response becomes the masked Polish stream error and logs `chat_failed` with `failureCode=upstream`, `step=chat`. |

## Mutations

Appended four declarations for `llm-chat-tool-step1`:

1. Captured accepted decision with channel correction → rejected decision without corrections (same-decision no-op).
2. Captured accepted decision → escalated, retaining the channel correction (expired-return escalation).
3. Insert a captured-format assistant text-delta event before the tool-call event (ordering guard).
4. Captured accepted decision → rejected with the channel correction retained (stored statutory-exclusion citation).

The captured recordings themselves remain unchanged. The no-op mutation intentionally reuses the authentic recorded second-step response for the original applied tool result; its assertions concern store state, emitted decision data, disclaimer behavior, and audit event.

## Stream contract for T17

- Valid `POST /api/chat` requests return status **200** with the AI SDK UI-message SSE stream produced by `createUIMessageStreamResponse` and `consumeSseStream: consumeStream`.
- `start` and `finish` chunks carry `messageMetadata: { decision }`. The start value is the stored decision at turn start; the finish value is the latest stored decision after any tool execution.
- Model output is forwarded as UI text chunks. Reasoning is disabled (`sendReasoning: false`).
- An accepted revision emits a non-transient **`data-decision`** part with exactly the meaningful payload `{ decision, previous, reason }` before the model's post-tool text. After that model text ends, a separate text part contains `pl.disclaimer`.
- Rejected revisions emit no `data-decision` and do not append the revision disclaimer. A text delta observed before the tool prevents store mutation and decision-part emission and logs `revision_order_violation`.
- Provider/model stream errors are masked as **`Nie udało się wysłać odpowiedzi.`** and log `chat_failed` with `step: "chat"` and the classified failure code.
- Unknown or expired `caseId` returns **404** with the exact JSON body `{ "error": "case_not_found" }`. Invalid requests return **400** with `{ "error": "invalid_request" }`.

## Contradictions and execution limits

- The installed AI SDK is 7.0.183. Its local v7 documentation uses **`isStepCount(2)`**; the ADR brief's `stepCountIs` name is from the pre-v7 API. The implementation follows the installed v7 API and preserves the two-step limit.
- The requested Context7 CLI was not installed. It was not invoked because acquiring it with `npx` would install/download tooling and write outside the repository. The installed AI SDK's bundled v7 docs/types and the installed Next.js route-handler guide were used instead.
- No real provider API calls were made; integration exchanges use the checked-in recordings and `createReplayFetch`.
- No application server was started, no browser flow or screenshots were run, as explicitly prohibited by the task. Manual UI QA therefore remains unverified.
- `.env` files were not opened or displayed directly. `next build`/`next typegen` execute the existing `next.config.ts`, which calls Next.js `loadEnvConfig`; no environment values appeared in the captured command output.
