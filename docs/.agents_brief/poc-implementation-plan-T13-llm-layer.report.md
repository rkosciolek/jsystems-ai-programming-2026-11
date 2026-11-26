# T13 report — LLM layer

## Implemented

- `app/src/server/llm/provider.ts`: OpenRouter provider construction with injectable `fetch`/API key and HTTP-200 error-object detection.
- `app/src/server/llm/errors.ts`: typed `LlmError` and error mapping for upstream, timeout, and invalid structured output.
- `app/src/server/llm/analyze-image.ts`: case-specific vision prompt, JPEG file part, form/classifier hints, structured output, temperature 0, one SDK retry, and abort signal.
- `app/src/server/llm/decide.ts`: case-specific decision prompt and isolated policy, form/date/image/Jev/case context, reasoning effort, forced `path: 'llm'`, rule/message validation, one violation retry, `llm_inconsistent` escalation template, and template finalizer delegation.
- `app/src/server/llm/index.ts`: public exports.
- `app/tests/integration/llm/llm.integration.test.ts`: real OpenRouter provider exercised with captured-fetch replay for complaint/return vision and decisions, request-body parity, policy isolation, retry/fallback, recorded HTTP errors, HTTP-200 error objects, network errors, and timeout.
- `app/tests/unit/llm/llm.test.ts`: prompt assembly tested with `MockLanguageModelV4` whose content comes from named recordings.
- `app/tests/fixtures/captured/MUTATIONS.md`: appended the hard-rule decision mutation and recorded-error status mutation.

No capture files were edited. Integration requests use the captured HTTP exchanges and were compared with the corresponding captured request bodies. No live OpenRouter/model API requests were made.

## TDD and mutations

- **Red:** `npm test -- tests/unit/llm/llm.test.ts tests/integration/llm/llm.integration.test.ts` initially failed both suites while importing the not-yet-implemented `@/server/llm/analyze-image`; zero tests were discovered. This was the expected missing-module failure before implementation.
- **Green, scoped:** both suites passed: **2 test files, 14 tests**.
- Decision retry mutation: the recorded complaint response's `decision` changes from `rejected` to `accepted`. The first replay response is mutated and the next is unmodified for the recovery assertion; both responses are mutated for the `llm_inconsistent` assertion.
- HTTP-200 error-body mutation: the real captured unknown-model error body is replayed with status changed from 400 to 200; the error body remains verbatim.

## Verification

- `npm run lint` — passed, zero errors and warnings.
- `npm exec --no -- tsc --noEmit` — passed.
- `npm test -- --testTimeout=15000` — **21 test files, 395 tests passed**.
- The full suite's initial run at the default 5-second timeout had two unrelated timeouts in `tests/unit/images.test.ts` and `tests/unit/case-form/case-form.test.tsx`; rerunning at 15 seconds passed all tests. Vitest emitted existing config notices about native config loading and `vite-tsconfig-paths`.
- The final scoped rerun after the last source/test edits again passed **14/14** tests; lint and direct TypeScript check passed.

## Constraints and outstanding verification

- `npm run typecheck` includes `next typegen`; `app/next.config.ts` calls `loadEnvConfig`, which can read `.env` files. To honor the instruction not to open `.env` files, that script was not run; direct `tsc --noEmit` passed instead.
- The repository requires starting and manually testing the running application. That was not done because this path requires Next.js configuration that loads `.env`, and live LLM calls are expressly prohibited. Consequently there is no running-app startup evidence or screenshot/manual QA evidence for T13.
- `opencode run` was not invoked because it would make a model request. Its built-in help was checked; Context7 documentation was queried for the AI SDK and OpenRouter provider as specified.
- An initial read-only `git status`/diff inspection identified unrelated pre-existing work. No Git changes, staging, commits, or pushes were made; changes were confined to the T13 implementation/test paths, `MUTATIONS.md`, and this requested report.
