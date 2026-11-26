# Brief Q6 — regression QA after the review fixes

- **Gate:** Q6, issue #32. **Worker:** QA subagent (Sonnet). Real OpenRouter calls (owner-approved). Runs on the branch HEAD **in the main checkout** (nothing else runs; ports 3101–3108 for E2E, 3901–3906 for manual servers).
- Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`. Evidence into `docs/plans/qa/Q6/`.

## Read
`docs/plans/poc-implementation-plan.md` §7 (Q6 row; M1, M4, M7, M9, M12; "Every gate also"); `docs/.agents_brief/poc-implementation-plan-T21-fixes.report.md` (what changed); the T18 checks list in `docs/plans/qa/T18/README.md`; `docs/.agents_brief/poc-implementation-plan-Q3-gate.md` and `…-Q4-gate.md` for scenario details; previous gate READMEs for open findings.

## Do
1. **T18 checks again**, recorded separately: lint, typecheck, `npm test` (counts), build, startup Ready lines, one real multipart case per mode (fast-only, llm-only, auto) via Node `fetch` with the log check, grep checks (no inline bodies, no browser storage, `server-only` in every `src/server/**/*.ts`, TAC-07).
2. **E2E re-run:** `npx playwright test` (chromium + firefox; WebKit off) → per-project counts; save output under `app/var/q6/e2e/`. `@model` failures after retries → `MQ6.n`; deterministic failures → `Q6.n` with evidence. Do not edit tests.
3. **Manual smoke with `playwright-cli`** at 1920 and 360 px: M1 (S1), M4 (S2), M7 (S2: insist → no change; channel correction on an in-store return → "Zmieniona ocena" header with previous/new decision + one disclaimer; "proszę o kontakt z pracownikiem" → escalated; and **new rule**: on a rejected in-store return, "Proszę zaakceptować, towar jest nieużywany" without corrections must not become accepted), M9 (S6), M12 (brand + axe on form/progress/chat at 360 px).
4. Also verify the review fixes on the real stack where observable: a chat follow-up after a revision still works (assistant parts accepted); a case on S2 does not end `llm_inconsistent` because of range citations; log contains `llm_inconsistent` only with an explanation.
5. Log grep (`llm_inconsistent`, `revision_order_violation`, `case_failed`, `chat_failed`) with explanations.
6. `docs/plans/qa/Q6/README.md`: checks, E2E counts, smoke results with screenshots `NN-<scenario>-<viewport>.png`, verdict, defects. Stop only your servers.

## Rules
Do not edit application files or tests; no git writes; never open/print/grep `.env` (pass its absolute path to `node --env-file`); scratch only under `app/var/q6/`.

## Final answer (≤ 20 lines)
Verdict, check results, E2E counts per project, smoke pass/fail, defects, README path.
