# T03a report

## Gate results (2026-11-26)
- Key present (T01 OK). Jev `typesafe/jev-1.14` (snapshot `typesafe/jev-1.14-20261014`) answers with an image: OK.
- Luna `openai/gpt-6-luna`: `generateText` + `Output.object` + image file part via `createOpenRouter({apiKey, fetch})`: OK (`{device:"Laptop"}`); injected fetch called. `input_modalities`: file, image, text.
- Runner: Vitest with `scripts/capture/vitest.config.mts` (plain `node --experimental-strip-types` cannot resolve `server-only` or extensionless imports in `src/lib/domain`; tsx is not installed). `npm run capture` = `node --env-file-if-exists=../.env --env-file-if-exists=.env.local ./node_modules/vitest/vitest.mjs run --config scripts/capture/vitest.config.mts`. Use `CAPTURE_ONLY=all|smoke|<name>`.

## Jev request/response shape observed (field names)
- Request: `model`, `state` (array: `{type:"image_url", image_url:{url}}` part + a plain JSON string), `questions` (`{type, instructions, criteria?}`; score `criteria` is an array).
- 200 response: `model` (dated snapshot), `answers`, `usage` (`input_tokens`, `output_tokens`, `cost`, `is_byok`, `cost_details`), `id`, `provider`. Answers: noul `{type, noul}` (no `confidence`); choice `{type, choice, probabilities, confidence}`; score `{type, score (fractional, e.g. 3.98), legend, probabilities, confidence}`.
- Error body: `{error:{message, code}}`.

## Recordings (status)
jev-complaint-laptop-1 200; jev-complaint-laptop-2 200; jev-return-phone-1 200 (empty description, no `description_matches_photo`); jev-return-phone-3 200; jev-error-unknown-model 400; jev-error-401 401; llm-error-unknown-model 400; llm-error-401 401. Four files each; no `sk-or-` in any fixture.

## Contradictions / issues
1. ADR-002 §3.3 (2048 px) is incompatible with Jev limits (1568 px/side, 2.46 Mpx): laptop-1 at 1975x2048 gave `400 Invalid image dimensions`. Recordings shrink the processed JPEG to 1568 px in the capture script; T07 / the pipeline must do the same (ADR-002/001 need updating; ADR-000 TD-04 notes it).
2. A 401 with the invalid key returns "Missing Authentication header" for both endpoints (same as no key).
3. `llm-error-unknown-model/response.body` contains an OpenRouter `user_id` of the key owner (verbatim body). Owner decision needed: keep, or declare a redaction in MUTATIONS.md.
4. Jev noul answers carry no `confidence` field (ADR-001 §2 says `{noul: p}`: consistent); `condition` score is fractional, so normalization must use `probabilities`.
5. Not run (not part of brief): lint/typecheck on whole repo fail due to other workers' files (case-form, rules); my files (`src/server/classifier`, `scripts/capture`) are clean.
6. The ADR-001 "JSON text part" was sent as a plain string; Jev accepted it.
