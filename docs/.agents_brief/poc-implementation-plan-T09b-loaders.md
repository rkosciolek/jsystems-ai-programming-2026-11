# Brief T09b — policy and prompt loaders

- **Task:** T09b, issue #19 (with T09a #18, prompts already written by the orchestrator in `app/src/server/prompts/*.md` — do not edit them). Concurrent workers on other folders.
- **Worker:** Haiku subagent. Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
`docs/ADR/001-ai-decision-pipeline.md` §3.8, §8 row "Policy isolation", TAC-001-04; `docs/ADR/000-main-architecture.md` §10 "Mock provenance rules" item 7 (hashes), TAC-04; `docs/ADR/002-backend-api.md` §3.6 (instrumentation); `app/src/server/env/index.ts`; `app/AGENTS.md`.

## Contract (each file starts with `import 'server-only'`)
- `app/src/server/policies/index.ts`: `getPolicy(caseType: CaseType): string` reads `complaint-policy.md` / `return-policy.md` from `path.resolve(process.cwd(), getEnv().POLICIES_DIR)` once and caches; `assertPoliciesExist(dir?)` throws an error naming the missing file(s).
- `app/src/server/prompts/index.ts`: `PROMPT_NAMES = ['vision-complaint','vision-return','decision-complaint','decision-return','chat'] as const`; `getPrompt(name)` reads the `.md` next to the module — resolve the folder as `path.resolve(process.cwd(), 'src/server/prompts')` so it works in `next start` (verify with `npm run build` + reading during a test) — and caches; `promptHash(name)` = sha256 hex of the file content; `assertPromptsExist()`.
- `app/src/instrumentation.ts`: `export async function register()` that, when `process.env.NEXT_RUNTIME === 'nodejs'`, imports env (`getEnv()`), `assertPoliciesExist()` and `assertPromptsExist()` so the server fails at startup (TAC-04). Check the Next 16 instrumentation docs (Context7 `/vercel/next.js/v16.4.5 "instrumentation register"`).

## Editable files
`app/src/server/policies/**`, `app/src/server/prompts/index.ts`, `app/src/instrumentation.ts`, `app/tests/unit/prompts/**`.

## Steps
1. Tests first: each of the 5 prompts exists and contains the four Polish labels "Wstępnie zaakceptowano", "Wstępnie odrzucono", "Wymaga uzupełnienia", "Przekazano do specjalisty" (TAC-001-04); policy isolation (complaint text ≠ return text; each contains its own title); missing policy dir → error names the file; `promptHash` stable and changes when content differs (use a temp copy). Red → record.
2. Implement; your tests, lint, typecheck, `npm run build` green.

## Tool guidance (plan §4.2)
`--help` → Context7 → web last. npm only, never install. No git. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-T09b-loaders.report.md`; final answer ≤ 10 lines.
