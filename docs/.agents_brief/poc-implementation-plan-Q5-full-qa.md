# Brief Q5 (= T20) — full manual QA M1–M14

- **Gate:** Q5 / T20, issue #30. Prerequisites: Q4 passed, T19 E2E run reported. **Worker:** QA subagent (Sonnet). Real OpenRouter calls (owner-approved).
- Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`. Work in an isolated worktree at the branch HEAD (`git worktree add ../hsd-q5 feat/poc-app --detach`; `cp -al app/node_modules ../hsd-q5/app/node_modules`); remove and prune it at the end. Screenshots + README into the **main** checkout `docs/plans/qa/Q5/`; jsonl logs copied to main `app/var/q5/`.

## Read
`docs/plans/poc-implementation-plan.md` §5, §6, §7 (Q5 row, all M1–M14, "Every gate also", known limitation); the previous gate briefs `docs/.agents_brief/poc-implementation-plan-Q3-gate.md` and `…-Q4-gate.md` (exact scenario steps and server env); the previous READMEs `docs/plans/qa/Q2/`, `Q3/`, `Q4/` (open findings to re-check: Q3.1, MQ3.x, Q4.x); `docs/design-guidelines.md`, `assets/homepage.png`, `assets/homepage-hero.png`.

## Do
1. Checks (separately): lint, typecheck, `npm test` counts, build; startup Ready lines for S1–S8 (ports 3301–3308; env per ADR-000 §10 E2E server matrix; `node --env-file=<abs path of repo .env> node_modules/.bin/next start -p <port>`; never open/print/grep `.env`).
2. Run **every** scenario M1–M14 completely, as specified in plan §7, on the listed servers. Every screen touched is captured at **360 px and 1920 px** (form empty, form errors, progress, first message for each decision you get, chat with a reply, revised message, chat error + Ponów, expired case, Nowa sprawa dialog, service banner).
3. M12: compare all screens with `assets/homepage.png` / the guidelines (navy text, outlined pill buttons, light-blue borders, magenta only for errors/signals, Noto Sans, square sections, readable badge and muted disclaimer); run an axe check on form, progress and chat at 360 px (e.g. inject axe-core from `node_modules/axe-core/axe.min.js` with `playwright-cli` evaluate) — 0 serious/critical.
4. Re-check open findings: Q3.1 (in-window return **with a reason** is no longer `needs_info` unless the photo really contradicts it), MQ3.2 (summary uses Polish labels and DD.MM.RRRR, no invented symptoms), MQ3.1 (no `llm_inconsistent` on trivial cases), and every Q4.x.
5. Grep all Q5 logs for `llm_inconsistent`, `revision_order_violation`, `case_failed`, `chat_failed`; explain every hit.
6. README: a table M1–M14 × (server, case numbers, steps done, result, screenshots), the checks, the axe results, the brand comparison, defects `Q5.n` (code, with evidence) and `MQ5.n` (model quality), and the known limitation (no real photo near 10 MB; Safari/WebKit not verified if WebKit cannot launch).

## Rules
Do not edit application files; no git writes except the worktree add/remove/prune. Synthetic data only; no terminal, keys or `.env` in images. Scratch only inside the worktree or main `app/var/`.

## Final answer (≤ 25 lines)
Verdict, checks, M1–M14 pass/fail, axe, defects, README path.
