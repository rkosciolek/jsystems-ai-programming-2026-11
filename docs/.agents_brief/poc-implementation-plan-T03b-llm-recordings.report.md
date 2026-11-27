# Report T03b — LLM recordings

All recordings in `app/tests/fixtures/captured/`, model `openai/gpt-6-luna`, snapshot returned `openai/gpt-6-luna` (no dated snapshot), HTTP 200, date 2026-11-26.

| Recording | Size | Notes |
|---|---|---|
| llm-vision-complaint-laptop-1 | ~428 KB (request carries the base64 JPEG) | ok; usable, none, impact-type damage visible |
| llm-vision-return-phone-1 | ~103 KB | ok; model returned `usable:false`, `usabilityProblem:wrong_device`, `matchesModel:no` for phone-1 |
| llm-decision-complaint-laptop-1 | ~25 KB | decision `rejected`, cited `§4 ust. 1`, reason `impact_damage` |
| llm-decision-return-phone-1 | ~28 KB | decision `needs_info`, cited `§6 ust. 1, §1 ust. 2, §3 ust. 1, §2 ust. 6`, reasons `photo_unusable, wrong_device, visible_damage, voluntary_return` |
| llm-chat-reply | ~23 KB, 13 chunks | answered "2026-09-01"; tool not called |
| llm-chat-tool-step1 / step2 | ~28 KB (24 chunks) / ~41 KB (59 chunks) | `revise_decision` CALLED on the final run: `newDecision accepted`, `corrections.channel online`; step 2 text starts with `**Zmieniona ocena**` |

Format: two folders for the tool turn (`llm-chat-tool-step1`, `-step2`). Chunk boundaries are stored as `chunkSizes` in `response.meta.json` (documented in the captured README). `capture.json` holds date, `today`, model requested, snapshot, `promptHashes`, `policyHash`, app commit, photo. temperature 0 was sent for vision and accepted.

Validation: `grep sk-or-` finds only prose in the README/MUTATIONS (no secrets in recordings); no `user_id` in the new recordings (no new redactions, no MUTATIONS rows added). `npx eslint scripts/capture` clean; `tsc --noEmit` has no errors in `scripts/capture`. (`npm run lint` full run exceeded 120 s here; scoped eslint used.)

## Findings and contradictions
- Vision with an image part and `strict: true` json_schema returns HTTP 200 with a body `error.code 502 provider_unavailable "The provided request is not valid"` (model `gpt-6-luna`, our schema; same request without the image, or with `strict:false`, works). Recordings therefore use `structuredOutputs: { strict: false }` on the vision call. The production code must do the same, and should treat a 200 response carrying an `error` body as an upstream error. This is not covered by the T03a error recordings.
- Model quality: for `phone-1.jpg` the vision model reports `wrong_device` / `matchesModel: no` (declared Samsung Galaxy A54), so the return decision is `needs_info`, not the usual return path.
- Brief vs ADR: the brief says "in-store, 10 days" for chat-tool but recording 4's form has purchase date 2026-11-10 (16 days); I set the purchase date to 10 days before capture (2026-11-16) and declared it in the README. The first assistant message of that case is hand-written input (not a response).
- Process slip (corrected): my first `CAPTURE_ONLY=all` run also re-recorded the T03a Jev and error recordings. I restored them with `git checkout -- <those dirs>` (including the manual `user_id` redaction) and re-recorded the six LLM sets against the restored files. The README now warns against `all` for this reason. `MUTATIONS.md` shows rows for `jev-complaint-laptop-1` that I did not add (another worker).
- Recorder changes: `chunkSizes`, SSE snapshot extraction, `recordingSequence` for multi-exchange turns.
- computeFacts from `app/src/server/rules` (concurrently edited by T06) is imported by `scripts/capture/llm.ts`.
