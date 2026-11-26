# Report T09b — policy and prompt loaders

## Files
- `app/src/server/policies/index.ts` (new): `assertPoliciesExist(dir?)`, `getPolicy(caseType)` (cached, reads `POLICIES_DIR` via `getEnv()`).
- `app/src/server/prompts/index.ts` (new loader; `.md` files untouched): `PROMPT_NAMES`, `getPrompt`, `promptHash(name, dir?)`, `assertPromptsExist(dir?)`.
- `app/src/instrumentation.ts` (new): `register()` runs only when `NEXT_RUNTIME === 'nodejs'`, calls `getEnv()`, `assertPoliciesExist()`, `assertPromptsExist()`.
- `app/tests/unit/prompts/prompts.test.ts`, `app/tests/unit/prompts/policies.test.ts` (new).

## TDD
- Red: both suites failed to load (`Cannot find package '@/server/policies'` and `'@/server/prompts'`), 0 tests run.
- Green: `npx vitest run tests/unit/prompts` gives 2 files, 17 tests passed. Covers the 4 Polish labels in all 5 prompts, policy isolation, missing-file errors, and the sha256 hash (stable, changes on content change).

## Checks
- `npx eslint` on my files: clean.
- `npx tsc --noEmit`: zero errors in my files. Remaining errors are in `tests/unit/case-form` and `tests/unit/store-log` (other workers).
- `npm run build`: compiles. Turbopack tracing warnings from dynamic fs paths were fixed with `/*turbopackIgnore: true*/`. The build still fails at "Failed to type check" on `tests/unit/case-form/case-form.test.tsx(329,12)`, which is another folder's file and not mine.
- Not done: a running-server check of `register()`/prompt path under `next start`.

## Contradictions and notes
- The brief says Next `v16.4.5`; `app/package.json` pins `next 16.4.6`. Context7 had no indexed docs for v16.4.6 and served current docs. The `register` contract was taken from those docs.
- Brief contract extended with an optional `dir` parameter on `promptHash` and `assertPromptsExist`/`assertPoliciesExist`, so tests can use temp folders without mutating the real files.
- Accidental side effect: a mistyped redirect created an empty file `/tmp/nope` (from a `npm run build` command). A cleanup `rm` was denied by permissions, so it remains. It is outside the repo and can be deleted.
