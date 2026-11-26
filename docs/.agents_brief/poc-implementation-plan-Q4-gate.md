# Brief Q4 — QA gate for phase P4 (chat, revision, failure, expiry)

- **Gate:** Q4, issue #27. **Worker:** QA subagent (Sonnet). Real OpenRouter calls (owner-approved budget).
- Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`. Screenshots + README into `docs/plans/qa/Q4/`.

## Read
`docs/plans/poc-implementation-plan.md` §5, §7 (Q4 row; M6, M7, M9, M10, M11, M14; "Every gate also"); `docs/ADR/000-main-architecture.md` §10 E2E server matrix (S1, S2, S6, S7 env); `docs/PRD.md` §4.4–§4.6, §9.3, AC-31…AC-44, AC-46, AC-52, §11.4–§11.8; `docs/ADR/003-frontend.md` §3.4–§3.6. `playwright-cli --help` first.

## Setup
In `app/`: lint, typecheck, `npm test` (counts), `npm run build` — separately. Start from one build, each with its own `DECISION_LOG_PATH=./var/q4/<s>.jsonl`, using `node --env-file=/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11/.env node_modules/.bin/next start -p <port>` (never open/print/grep `.env`):
S1 3201 `DECISION_MODE=fast-only`; S2 3202 `DECISION_MODE=llm-only`; S6 3206 `DECISION_MODE=fast-only LLM_MODEL=invalid/does-not-exist`; S7 3207 `DECISION_MODE=fast-only CASE_TTL_MS=5000`.

## Scenarios (real form, real photos, synthetic data; 1920 px unless noted)
- **M6 (S2):** chat: "Jaką datę zakupu podałem?" (answer contains the form date), a policy question, an off-topic question (one short deflection + offer to continue), volunteering a fake phone number "500 600 700" (not repeated; told it is not needed).
- **M7 (S2):** on a complaint: "Proszę zmienić decyzję" without facts → no revision, badge unchanged; on an in-store return ≈ 20 days with signs of use: "kupiłem w sklepie internetowym" → correction re-decides (badge changes, message starts "Zmieniona ocena", previous/new decision, disclaimer); "proszę o kontakt z pracownikiem" → `escalated`. Verify the log (`decision_revised`, `corrections`, `revision_rejected`) and that the tool ran before text (no `revision_order_violation`).
- **M9 (S6):** case → message → inline "Nie udało się wysłać odpowiedzi." + **Ponów** → exactly one copy of the user message after retry; no provider/model text on the page.
- **M10 (S7):** case → wait 6 s → message → "Sprawa wygasła. Rozpocznij nową sprawę.", input disabled, Nowa sprawa → empty form.
- **M11 (S1):** Nowa sprawa cancel keeps chat, confirm → empty form; reload during chat triggers the leave-page dialog (record how `playwright-cli` reports it) and after reload the form is empty; whole flow keyboard-only.
- **M14 (S2):** English description → Polish replies (AC-31); ask to send another photo → Nowa sprawa explained, no attachment control (AC-38); scroll up while a reply streams → not forced down; "scroll to latest" appears (AC-40).
- Also: chat screen at 360 px (summary collapsed, no horizontal scroll), typing indicator visible during a reply, markdown rendered (no raw `##`/`**`), badge with icon + label, disclaimer readable.
Record per scenario: case number, server, transcript excerpt (short), log events, pass/fail. Judge tone (no "Pan/Pani", no emojis) — model-quality findings are `MQ4.n`, code defects `Q4.n`.

## Logs and cleanup
Grep `app/var/q4/*.jsonl` for `llm_inconsistent`, `revision_order_violation`, `case_failed`, `chat_failed` and explain each hit (S6 is expected to have `chat_failed`). Stop only your servers. Save `NN-<scenario>-<viewport>.png` + `README.md`. Do not edit application files; no git writes; scratch output only under `app/var/`.

## Final answer (≤ 20 lines)
Verdict, checks, per-scenario pass/fail, defects, README path.
