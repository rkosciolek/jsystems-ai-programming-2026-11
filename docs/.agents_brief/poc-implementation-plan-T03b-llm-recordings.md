# Brief T03b — LLM recordings with the real prompts and schemas

- **Task:** T03b, issue #20. Prerequisites T03a, T09b accepted. Concurrent: T12 (case-form), T06 (rules) — other folders.
- **Worker:** Sonnet subagent (real API calls). Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
- `docs/ADR/000-main-architecture.md` §10 "Mock provenance rules" 1–2, 7 (recording list: vision ×2, decision ×2, chat reply SSE, chat with tool SSE).
- `docs/ADR/001-ai-decision-pipeline.md` §3.5 (vision call), §3.6 (decision call: system = prompt + `<policy>`; user = form JSON, DateFacts, ImageAnalysis, Jev answers with certainty, case number), §3.7 (chat: system = `chat.md` + policy + `<case>` block; tool `revise_decision`; `stopWhen` 2 steps).
- Existing code: `app/scripts/capture/**` (recorder, runner `CAPTURE_ONLY=… npm run capture`), `app/tests/fixtures/captured/README.md`, `app/src/server/prompts/index.ts` (`getPrompt`, `promptHash`), `app/src/server/policies`, `app/src/server/images`, `app/src/lib/domain` (`ImageAnalysisSchema`, `DecisionOutcomeSchema`, `ReviseDecisionInputSchema`). `app/AGENTS.md`.
- AI SDK 7: `npx ctx7@latest docs /vercel/ai/ai_7.0.0 "generateText Output.object file part"` and `"streamText tools stopWhen stepCountIs"`.

## Secrets
Same as T03a: never open/print/grep `.env*`; load via node `--env-file-if-exists`; strip `Authorization`; grep saved files for `sk-or-` and for `user_id` (redact a `user_id` value to `REDACTED` and declare it in `MUTATIONS.md`).

## Recordings to produce (`app/tests/fixtures/captured/<name>/`, 4 files each; streamed bodies verbatim, keep the chunk boundaries in a way the replay fetch can re-emit — document the format in the captured README)
1. `llm-vision-complaint-laptop-1`: `generateText` + `Output.object(ImageAnalysisSchema)`, model `openai/gpt-6-luna`, system `vision-complaint`, user = image file part (processed JPEG ≤ 2048 px) + text with the form fields and Jev answers from `jev-complaint-laptop-1` labelled "unverified hints"; `temperature: 0` if accepted, `maxRetries: 1`.
2. `llm-vision-return-phone-1`: same with `vision-return` and `jev-return-phone-1`.
3. `llm-decision-complaint-laptop-1`: `Output.object(DecisionOutcomeSchema)`, system = `decision-complaint` + `<policy>` complaint policy; user = form JSON, DateFacts (compute with the same rules as ADR-001 §3.3 — if `app/src/server/rules` exists and exports `computeFacts`, use it), the ImageAnalysis from recording 1, Jev answers, case number `HSD-20261126-T3B1`; reasoning effort `medium` via provider options.
4. `llm-decision-return-phone-1`: same for return.
5. `llm-chat-reply`: `streamText` with system `chat` + complaint policy + a `<case>` block built from recordings 1 and 3; messages = the first assistant message from recording 3 + user "Jaką datę zakupu podałem?"; tool `revise_decision` declared (input = `ReviseDecisionInputSchema`) with an `execute` that returns `{applied:false}` (it should not be called here); `stopWhen` 2 steps.
6. `llm-chat-tool`: a **return** case decided `rejected` (in-store, 10 days, signs of use — build the case context by hand from recording 4's form but with channel `store`, decision `rejected`, cited `§3 ust. 1`, `§3 ust. 2`); user message "Pomyliłem się, kupiłem to w sklepie internetowym, nie stacjonarnym." Expect a `revise_decision` call with `corrections.channel = 'online'`; the tool `execute` returns `{applied:true, previous:'rejected'}`. Record **every** HTTP exchange of the turn (step 1 tool call and step 2 text) as `llm-chat-tool` (two exchanges: name the files `…/1-request.json` etc., or two folders `llm-chat-tool-step1`, `llm-chat-tool-step2` — choose one and document it). If the model does not call the tool after 3 attempts, save the best attempt, report it as a model-quality finding, and continue.
7. `capture.json` for each: date, model requested, snapshot returned, `promptHash` of every prompt used, policy file hash, app commit, photo name.

## Editable files
`app/scripts/capture/**`, `app/tests/fixtures/captured/**` (LLM sets, README, `MUTATIONS.md` rows), `app/package.json` (`capture` script only, if needed).

## Steps
1. Implement the capture scripts; run them; at most 3 retries per recording.
2. Validate: files present, no secrets, prompt hashes stored; `npm run lint`, `npm run typecheck` for your files.

## Tool guidance (plan §4.2)
`--help` → Context7 → official docs last. npm only, never install. No git writes. Report contradictions instead of resolving them.

## Report
`docs/.agents_brief/poc-implementation-plan-T03b-llm-recordings.report.md`: per recording status/size/model snapshot; the observed decision values (for information only); whether the chat tool was called; contradictions. Final answer ≤ 15 lines.
