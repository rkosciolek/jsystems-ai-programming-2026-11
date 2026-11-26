# Brief T02 (rest) — finish the scaffold configuration

- **Task:** T02, issue #5. Concurrent tasks: none (T04/T11 wait for this).
- **Worker:** Haiku subagent. Repo root: `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`.

## Goal
The Next.js 16 app in `app/` is already scaffolded (create-next-app 16.4.6, shadcn init with radix + nova preset, components in `app/src/components/ui/`, all npm deps installed). Finish configuration so that lint, typecheck, an empty test run, build and start all work.

## Read first (do not read anything else)
- `docs/ADR/000-main-architecture.md` §3 "Repository structure", §7 "Environment Variables", TD-02 steps 5–8.
- `docs/plans/poc-implementation-plan.md` §3.4 (content of `app/AGENTS.md`), §4.2 (tool guidance), §9 item 6 (opencode safety).
- `app/package.json`, `app/tsconfig.json`, `app/next.config.ts`, `.gitignore`, `.env.example` (root). **Never open any `.env` / `.env.local` file.**

## Editable files (only these)
- `app/package.json` — `scripts` only. Do **not** run `npm install`.
- `app/tsconfig.json`, `app/next.config.ts`
- `app/vitest.config.ts`, `app/tests/setup.ts`, `app/playwright.config.ts` (minimal; T19 extends it)
- `app/AGENTS.md`, `app/README.md`, `app/.env.example`
- `.gitignore` (root), `opencode.json` (repo root)

## Steps
1. **Scripts:** `dev`, `build`, `start`, `lint` (`eslint`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:watch`, `test:e2e` (`playwright test`), `capture` (`node --experimental-strip-types scripts/capture/index.ts` — the file is created later; script may point to a missing file).
2. **tsconfig:** add `"noUncheckedIndexedAccess": true`; keep `strict`. Make sure `vitest/globals` types are not required (use explicit imports in tests).
3. **Vitest:** `vitest.config.ts` with `@vitejs/plugin-react` and `vite-tsconfig-paths`; `test.include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.ts']`; default environment `node`; files under `tests/unit/**/*.test.tsx` use `jsdom` (use `environmentMatchGlobs` if available in the installed vitest, otherwise per-file `// @vitest-environment jsdom` documented in `app/AGENTS.md` — check `npx vitest --help` and the installed version's docs via Context7 `npx ctx7@latest`); `setupFiles: ['tests/setup.ts']` which imports `@testing-library/jest-dom/vitest`; `passWithNoTests: true`. Alias `server-only` to an empty module in tests (it throws outside React Server environment): create the alias to `tests/server-only-stub.ts` (you may create that file).
4. **Env loading (ADR-000 §7 allows pointing Next to the root file):** in `next.config.ts`, call `loadEnvConfig` from `@next/env` on the repo root (`path.resolve(process.cwd(), '..')`) before exporting the config, so the root `.env` is loaded in addition to `app/.env*`. Keep the existing turbopack rule. Add `serverExternalPackages` only if build fails for sharp.
5. **`app/.env.example`:** every variable from ADR-000 §7 with the example values (no secrets; `OPENROUTER_API_KEY=` empty).
6. **Root `.gitignore`:** add `app/var/`.
7. **`app/AGENTS.md`** (short, ≤ 60 lines, English), per plan §3.4: AI SDK 7 APIs only (no `toDataStreamResponse`, no `generateObject`, no v5 `useChat` input helpers); AI Elements from ui.shadcn.com — registry names verified: `@shadcn/message`, `@shadcn/message-scroller`, `@shadcn/input-group` (no legacy `ai-elements` CLI); npm scripts list; every `src/server/**` module starts with `import 'server-only'`; env lives in root `.env` or `app/.env.local`, `OPENROUTER_API_KEY` and `LLM_MODEL` required; real-photos rule from `assets/example-images/README.md` with the owner-approved 413/415 exception (ADR-000 TAC-08); mock provenance rules (point to ADR-000 §10, recordings in `tests/fixtures/captured/`, mutations in `MUTATIONS.md`); docs via `--help` → Context7 (`npx ctx7@latest`) → web; this nested file overrides the root rule "integration tests mock only the LLM API" by also replaying Jev.
8. **`app/README.md`:** keep the existing course checklist text, and add at the top a short "Run" section (npm scripts, env, ports).
9. **`opencode.json`** (repo root): `$schema` `https://opencode.ai/config.json`; permission `bash` deny for `git commit*`, `git push*`, `npm install*`, `npm i *`; leave the rest default. Verify the key names with `opencode --help` / Context7 (`npx ctx7@latest library opencode "permission config"`). Confirm the built-in `plan` agent is read-only (state your evidence in the report).
10. **Checks (run in `app/`, record each separately with its result):** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `npm start -- -p 3000` in the background, `curl -sI http://localhost:3000` must give 200, then stop the server (kill only the process you started). Fix any error caused by your configuration. Do not edit files under `src/` except to fix a lint/type error introduced by the scaffold (report it).

## Tool guidance (plan §4.2, verbatim summary)
`--help` first → Context7 (`npx ctx7@latest library <name> "<q>"` then `docs`) → web search last. npm only; never install packages (ask in the report). No git. Report contradictions instead of resolving them.

## Report
Write `docs/.agents_brief/poc-implementation-plan-T02-scaffold-rest.report.md` with: files changed; each check command with pass/fail and the key count lines (no full logs); open questions. Your final answer to the orchestrator: ≤ 15 lines, same content.
