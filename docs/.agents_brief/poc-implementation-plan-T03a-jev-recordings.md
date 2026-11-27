# Brief T03a — model gate, Jev question sets, Jev and error recordings

- **Task:** T03a, issue #13 (also covers T01 #12: key presence). Concurrent: T05/T06/T08/T12 workers on other files.
- **Worker:** Sonnet subagent (real API calls; careful with secrets). Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Goal
1. Prove the real stack works: Jev `typesafe/jev-1.14` answers with an image; `openai/gpt-6-luna` answers through `@openrouter/ai-sdk-provider` with `generateText` + `Output.object` and an image file part; the provider accepts an injected `fetch`. If Jev fails with images → **stop** and report (fallback F1, owner decides).
2. Produce verbatim recordings for replay tests.

## Read
- `docs/ADR/000-main-architecture.md` TD-04, §10 "Mock provenance rules" 1–2, 7, TAC-05.
- `docs/ADR/001-ai-decision-pipeline.md` §2 "Verified Jev facts", §3.2 (state, question table, normalization).
- `docs/ADR/002-backend-api.md` §3.7. `app/AGENTS.md`. Contracts in `app/src/lib/domain`. `app/src/server/images` exists after T05 — if not yet, re-encode with sharp in the script exactly as ADR-002 §3.3.
- Jev request schema: fetch https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md and https://openrouter.ai/docs/guides/community/multimodal-decisions (official). Provider `fetch` option: `npx ctx7@latest docs /openrouterteam/ai-sdk-provider "createOpenRouter fetch option"`.

## Secrets
- The key is in the repo-root `.env` (or `app/.env.local`). **Never open, print, cat or grep these files.** Load them with `node --env-file-if-exists=../.env --env-file-if-exists=.env.local …` (check `node --help`). If `OPENROUTER_API_KEY` is missing at runtime, stop and report "T01 blocked: key missing" — do not ask for the value.
- Recordings must not contain the key: remove the `Authorization` header from `request.json`; grep every saved file for `sk-or-` before finishing.

## Files you create / edit
- `app/src/server/classifier/questions.ts` (`import 'server-only'`): the complaint and return question sets exactly per ADR-001 §3.2 table (IDs, types `noul`/`choice`/`score`, English self-contained `instructions` and `criteria`; `device_category` options = the 10 category ids + `not_electronics`; `description_matches_photo` for returns only when the description is non-empty), `buildJevRequest(input, jpegBuffer, model)` (state = [image part as JPEG data URL, JSON text part with caseType, Polish category label, model, channel, description — no purchase date]), and `questionSetHash(caseType)` (sha256 of the canonical JSON of the question set). T07 builds the client on top of this file.
- `app/scripts/capture/**` (`index.ts` entry used by `npm run capture`; a recording `fetch` wrapper that saves the four files; per-recording scripts). Use `node --experimental-strip-types` compatible TypeScript (no path aliases at runtime; relative imports with `.ts` extensions) — or, if that is impractical for `server-only` imports, run the scripts with `npx vitest run --config <a capture config>` or `npx tsx` **only if already installed** (do not install). State the choice.
- `app/tests/fixtures/captured/<name>/{request.json,response.meta.json,response.body,capture.json}` for:
  - `jev-complaint-laptop-1`, `jev-complaint-laptop-2` (complaint set; synthetic form: category laptop, online, a 60-char Polish description about a cracked screen — do not describe the photo beyond what a customer would write);
  - `jev-return-phone-1`, `jev-return-phone-3` (return set; smartphone, online, description empty for one and a short reason for the other);
  - `jev-error-unknown-model` (model `invalid/does-not-exist`, real 4xx), `jev-error-401` (key `sk-or-invalid-test`);
  - `llm-error-unknown-model` (Chat Completions via the provider with model `invalid/does-not-exist`), `llm-error-401` (provider with `sk-or-invalid-test`).
  - `capture.json`: date, model ID requested, model snapshot from the response, question-set hash (Jev), app commit (`git rev-parse HEAD` is read-only and allowed), photo file name.
- `app/tests/fixtures/captured/README.md` (how to re-capture), `app/tests/fixtures/captured/MUTATIONS.md` (empty table header).
- `docs/ADR/000-main-architecture.md`: only TD-04 — record the gate results (date, what was verified, the Jev snapshot name, whether `input_modalities` of the Luna model include `image` from `GET /api/v1/models`, the provider `fetch` injection result). Remove the matching items from "Still UNVERIFIED".
- `app/package.json`: only the `capture` script line if your runner differs.

## Steps
1. Smoke: one Jev call with `laptop-1.png` (processed to JPEG ≤ 2048 px) and the complaint set; one Luna `generateText` + `Output.object` call (a tiny Zod schema, e.g. `{device: string}`) with the image file part, through `createOpenRouter({ apiKey, fetch: recordingFetch })`. Do not save the Luna smoke as a recording (T03b records LLM sets with the real prompts).
2. Run all recordings above. Each Jev call costs fractions of a cent; keep the total to these calls plus at most 3 retries.
3. Validate: four files per recording, no `sk-or-` anywhere, bodies verbatim (byte-identical to what `fetch` returned).
4. `npm run lint`, `npm run typecheck` green.

## Tool guidance (plan §4.2)
`--help` → Context7 (`npx ctx7@latest`) → official web docs (OpenRouter pages above) last. npm only, never install. No git writes. Report contradictions (e.g. a Jev request format different from ADR-001 §2) instead of resolving them silently.

## Report
`docs/.agents_brief/poc-implementation-plan-T03a-jev-recordings.report.md`: gate results, the exact Jev request/response shape observed (field names only), each recording with status code, contradictions. Final answer ≤ 15 lines.
