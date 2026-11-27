# Report Q4.x server (Q4.2, Q4.3, Q4.4 data part)

## Changes
- `app/src/server/llm/chat.ts`: `prepareStep` sets `activeTools: []` once `revise_decision` has run (2-step limit kept: tool, then text). Repeated `tool-input*` chunks from later steps are dropped and the resulting `NoSuchToolError` is not logged as `chat_failed`. When a revision was applied and no non-empty text followed it, the server writes the fallback text (`**Zmieniona ocena**`, previous/new label, reason, one next-steps sentence), then the disclaimer. Fallback and disclaimer are now written with `writer.write` after the model stream is drained and before `finish` (previously they went through `writer.merge` and could arrive after `finish`).
- `data-decision` carries `corrections` (only when non-empty).
- `app/src/lib/domain/index.ts`: `MIN_PURCHASE_DATE = 2000-01-01` enforced in `makeCaseInputSchema` and `makeReviseDecisionInputSchema` (message `pl.errors.purchaseDateInvalid`); `DecisionDataSchema.corrections` added.
- `app/src/lib/i18n/pl.ts`: `pl.chat.revision.{previous,next,reason,nextSteps.*}`.
- Tests: `tests/unit/domain/{schemas,pl}.test.ts`, `tests/integration/chat/chat-revisions.integration.test.ts` (second-tool-call mutation, corrections in data part, no fallback when model wrote text). `MUTATIONS.md` row added.

## Red -> green
Red first: 9 failing tests (date bound x4, corrections schema, pl keys x2, two chat tests). Green after implementation.

## Decisions / contradictions
- `toolChoice: 'none'` is NOT usable: AI SDK 7 throws `AI_ToolChoiceViolationError` when the (mutated) model still returns a tool call. `activeTools: []` is used instead; the in-execute `revision_already_attempted` guard stays as defence.
- ADR §3.7 says the server text part follows the model text; the fallback is a separate text part before the disclaimer part. ADR not edited (not in my file list).
- Frontend: add `min="2000-01-01"` to the date input (`MIN_PURCHASE_DATE` is exported from `@/lib/domain`); read `data-decision.corrections` for the summary panel.
- `sawTextBeforeToolCall` now ignores whitespace-only deltas.

## Verification
- `npm run lint`: pass. `npm run typecheck`: pass. `npm run build`: pass.
- `npm test`: 478 pass, 1 fail: `tests/unit/images.test.ts` "returns JPEG output for every real photo" hit its 5 s timeout under the parallel full run; passes alone (6/6). Pre-existing/load-related, not in my scope.
- No manual QA with the real app run (no real API calls allowed by the brief).
