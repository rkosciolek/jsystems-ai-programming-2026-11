# E2E.1 fix report

## Root cause (reproduced on the real stack)
Not the Jev client. Jev failure degrades correctly (`ClassifierError` caught, `classifier = null`). The failure comes from the **vision step** that runs next on the LLM path: `analyzeImage` intermittently throws `LlmError{kind:"invalid_output"}` (AI SDK `NoObjectGeneratedError`, the model's structured output fails `ImageAnalysisSchema`). `invalid_output` is not mapped in the pipeline's catch, so `failureCode=internal`; `step` is still `analysis` (it only becomes `decision` after vision), `models.vision` is set and `models.decision` is null, which matches the E2E.1 log. `classifierError` was missing only because `case_failed` never logged it.
Evidence: with stderr logging added, 1 of 20 runs on S8 logged `case_failed internal dt LlmError invalid_output analysis` (case HSD-20261126-CM3M); the other 19 were `case_decided`, `path=llm`, `classifierError=upstream`. Run-1 evidence is consistent (vision model logged, decision model null).

## Test (written first, failed first)
`app/tests/integration/cases/api-cases.integration.test.ts`:
- Jev 400 (`jev-error-unknown-model`) + first vision reply invalid + recorded vision/decision: must end `result`, `classifierError":"upstream"`, `path":"llm"`.
- Persistently invalid vision: stays `internal`, `case_failed` carries `classifierError`, stderr contains `LlmError`.
Declared mutation added to `tests/fixtures/captured/MUTATIONS.md`.

## Fix (`src/server/pipeline/index.ts`)
- Vision call retried once on `LlmError invalid_output` when the signal is not aborted.
- `case_failed` log now includes `classifierError`.
- Unexpected (`internal`) errors log class name, name, kind and step to stderr.

## Real stack
`npm run build`, S8 env (`DECISION_MODE=auto`, `JEV_MODEL=invalid/does-not-exist`), 8 multipart cases with `laptop-1.png` via node fetch: 8/8 `case_decided`, `path=llm`, `classifierError=upstream`, 0 `case_failed` (`app/var/e2e1/s8b.jsonl`). Deviation: port 3409 instead of 3408 because the first server on 3408 (pre-fix build, used for reproduction) could not be killed by name and I rebuilt over it; both servers were stopped afterwards. The playwright e13 spec was not run (fetch variant used).
Note: a retry only reduces the rate; a second consecutive invalid output still gives `internal` (kept per ADR).

## Checks
`npm test` 462/462, `npm run typecheck` ok, `npm run build` ok. `npm run lint` reports 133 errors, all from generated Playwright report files under `app/var/e2e/html-*` (scratch); eslint on `src/server/pipeline`, `tests/integration/cases`, `tests/unit/classifier` is clean.
