# Brief Q4.x (server/domain) — revision text, date bound, corrections in the data part

- **Tasks:** Q4.2, Q4.3, Q4.4 (data part) — issue #27. Concurrent: Q4.x frontend worker (`app/src/components/**`, `app/tests/unit/chat/**`) and the E2E.1 worker (`app/src/server/pipeline/**`, `app/src/server/classifier/index.ts`, `app/tests/integration/cases/**`). Do not touch their files.
- **Worker:** Sonnet subagent. Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
`docs/plans/qa/Q4/README.md` (Q4.2–Q4.4 evidence, transcripts), `app/var/q4/s2.jsonl`, `docs/ADR/001-ai-decision-pipeline.md` §3.7, `docs/PRD.md` AC-36, AC-05, `app/src/server/llm/chat.ts`, `app/src/lib/domain/index.ts`, `app/src/lib/i18n/pl.ts`, `app/tests/integration/chat/**`, AI SDK 7 docs for `prepareStep` / `activeTools` / `toolChoice` (`npx ctx7@latest docs /vercel/ai/ai_7.0.0 "prepareStep activeTools toolChoice"` or the installed package's `dist` d.ts).

## Fix
1. **Q4.2:** after `revise_decision` has executed once in a turn (applied or not), the model must not call it again in that turn: use `prepareStep` to drop the tool / set `toolChoice: 'none'` for later steps, keeping the 2-step limit (or 3 if needed for tool → text, state why). If a revision was **applied** and the model produced no text after the tool result, the server writes a fallback text part built in code: `**Zmieniona ocena**`, then "Poprzednia ocena: <label>. Nowa ocena: <label>.", "Powód: <reason>", one next-steps sentence per new decision, then the disclaimer (already appended). All texts in `pl.ts` (add `pl.chat.revision.*`).
2. **Q4.3:** `makeCaseInputSchema` and `makeReviseDecisionInputSchema` reject purchase dates before `2000-01-01` with `pl.errors.purchaseDateInvalid`; the client form gets the same rule through the shared schema (add `min` on the date input only if the form file is not in the frontend worker's set — it is, so leave the input attribute to them and report it).
3. **Q4.4 (data part):** extend `DecisionDataSchema` with optional `corrections: { purchaseDate?: string; channel?: 'online'|'store' }` and include the applied corrections in the `data-decision` part. The frontend worker reads it to update the summary panel.
4. Tests first: integration on the recorded chat-with-tool exchanges — a declared mutation where step 2 is a second tool call instead of text → exactly one tool execution, fallback text present and starting with "**Zmieniona ocena**", disclaimer once; data part carries `corrections`; unit tests for the date bound. Update domain tests. Red → record.
5. `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` (report failures that come from the other workers' folders).

## Editable files
`app/src/server/llm/chat*.ts`, `app/src/app/api/chat/**`, `app/src/lib/domain/index.ts`, `app/src/lib/i18n/pl.ts`, `app/tests/integration/chat/**`, `app/tests/unit/chat-server/**`, `app/tests/unit/domain/**`, `app/tests/fixtures/captured/MUTATIONS.md`.

## Rules
No git, no installs, never open `.env`, no real API calls, scratch only under `app/var/`. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-Q4-fixes-server.report.md`; final answer ≤ 10 lines.
