# Brief Q6.3 — no "Zmieniona ocena" when the decision did not change

- **Task:** Q6.3 (issue #32). **Worker:** Luna (OpenCode). Repo root `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11` (use exactly this path), app in `app/`.

## Problem
`docs/plans/qa/Q6/README.md` "9. Run 2", screenshot `docs/plans/qa/Q6/run2-08-*`: on a return decided "Wymaga uzupełnienia", the message "Pomyliłem się, kupiłem to w sklepie internetowym, nie stacjonarnym." applies a channel correction but the decision stays the same; the reply still shows a "Zmieniona ocena" block ("Wymaga uzupełnienia" → "Wymaga uzupełnienia") and the UI chip. PRD AC-36/AC-37: the label belongs only to a changed decision.

## Fix (orchestrator decision; do not edit prompt files — their hashes pin the recordings)
1. `app/src/server/llm/chat.ts` — `revise_decision` result: when corrections are applied but `newDecision === previous`, return `{ applied: true, decisionChanged: false, previous, note: "Facts corrected; the decision is unchanged. Do not write 'Zmieniona ocena'; explain that the correction was noted and why the decision stays." }`; when the decision changes return `{ applied: true, decisionChanged: true, previous }`. Keep the data part (it carries `corrections` for the summary panel) but include `decisionChanged` in it — extend `DecisionDataSchema` in `app/src/lib/domain/index.ts` with optional `decisionChanged: boolean`.
2. `app/src/components/chat/chat-view.tsx` — show the "Zmieniona ocena" chip only when the data part has `decision !== previous` (or `decisionChanged === true`); the summary panel still applies `corrections`.
3. Tests first: integration (declared mutation of the chat-tool recording where `newDecision` equals the current decision with a channel correction) → tool result `decisionChanged: false`, no server header, data part `decisionChanged: false`; RTL: no chip when decision unchanged, chip when changed. Red → green.
4. `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` (logs under `app/var/q6fix2/`).

## Editable files
`app/src/server/llm/chat.ts`, `app/src/lib/domain/index.ts`, `app/src/components/chat/**`, `app/tests/integration/chat/**`, `app/tests/unit/chat/**`, `app/tests/unit/domain/**`, `app/tests/fixtures/captured/MUTATIONS.md`.

## Rules
No git writes, no installs, no servers, no real API calls, never open `.env`, never read or write outside the repository. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-Q6-fixes-r2.report.md`.
