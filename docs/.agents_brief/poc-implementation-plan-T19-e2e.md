# Brief T19 — E2E real-stack suite

- **Task:** T19, issue #29. Prerequisite Q4 passed. **Worker:** Haiku subagent writes the specs; the run is done by a separate runner subagent.
- Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
`docs/ADR/000-main-architecture.md` §10 "E2E server matrix" (S1–S8, ports 3101–3108, env, `@model` tag with `retries: 2`, Firefox runs E1/E8/E9, WebKit only if it launches), the E1–E14 spec table, TAC-003-02/03/05; `docs/ADR/003-frontend.md` TAC-003-01…05; `docs/plans/poc-implementation-plan.md` §6 (evidence column); `assets/example-images/README.md` (never assert which decision the model makes; assert structure, invariants and the logged path); current `app/playwright.config.ts`; the UI strings in `app/src/lib/i18n/pl.ts`. Playwright docs: `npx ctx7@latest library playwright "webServer array projects grep retries"`.

## Contract
- `app/playwright.config.ts`: `webServer` array starting the 8 servers from one existing build: `node --env-file-if-exists=../.env node_modules/.bin/next start -p <port>` with the env overrides and `DECISION_LOG_PATH=./var/e2e/s<N>.jsonl`; `reuseExistingServer: false`; projects `chromium` (all specs), `firefox` (E1, E8, E9 via `grep`), `webkit` only when an env flag `E2E_WEBKIT=1` is set; default `retries: 0`, and `@model`-tagged tests get `retries: 2` (separate project or `test.describe.configure`). Timeouts sized for real LLM calls (case ≤ 95 s).
- `app/tests/e2e/helpers.ts`: fill the form with real photos (`setInputFiles` on the hidden input), read a server log for a `caseId`, collect console errors and fail on any error/React warning (TAC-003-05) except expected network errors on S4/S5/S6.
- `app/tests/e2e/e1…e14.spec.ts` per the ADR table. E8 uses generated payloads only for 413/415 (owner exception). E10 runs `@axe-core/playwright` on form, progress and chat at 360 px (0 serious/critical) and checks `scrollWidth <= 360`. E9 checks `beforeunload` via `page.on('dialog')`.
- `package.json` script `test:e2e` stays `playwright test` (build must exist first; document `npm run build && npm run test:e2e`).

## Editable files
`app/tests/e2e/**`, `app/playwright.config.ts`.

## Steps
1. Write the config, helpers and 14 specs. Do **not** run the full suite (real calls; the runner does that). Do run `npx playwright test --list` to show discovery (expected counts per project) and `npx tsc --noEmit` / `npm run lint` for your files.

## Rules
`--help` → Context7 → web last. npm only, never install. No git. Never open `.env`. Scratch output only under `app/var/`.

## Report
`docs/.agents_brief/poc-implementation-plan-T19-e2e.report.md`: files, `--list` counts per project, spec → ADR row table. Final answer ≤ 10 lines.
