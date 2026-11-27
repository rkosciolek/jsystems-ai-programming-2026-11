# PoC: Hardware Service Decision Copilot (whole application)

Implements `docs/plans/poc-implementation-plan.md` (revision 5) on `feat/poc-app` → `feat/prd-adr-plan`. Closes the epic's tasks #5–#32; T23 (#33) and this PR (#34) close with it.

## What is in it
- Next.js 16 app in `app/`: case form with validation and photo upload, NDJSON progress, first assessment, streaming chat with decision revision (`revise_decision`), expiry handling, Polish UI, brand theme.
- Decision pipeline: Jev classifier → row-level confidence gate → rules + templates (fast path) or vision + decision LLM (LLM path); modes `auto`, `llm-only`, `fast-only`; JSONL evaluation log with an allowlist.
- Tests: 517 unit/integration tests (model APIs replayed from recorded real calls only), 32 real-stack E2E specs on 8 servers (Chromium + Firefox).

## Checks that actually ran (latest, Q6 run 3)
- `npm run lint`, `npm run typecheck`, `npm run build`: pass.
- `npm test`: 29 files, 517 tests, 0 skipped.
- `npx playwright test`: 31 passed, 1 flaky (`@model` E3, passed on retry), 0 failed.
- TAC-04 fail-fast without the key: verified manually by the owner.

## QA evidence
- Gates: [Q1](../plans/qa/Q1/README.md), [Q2](../plans/qa/Q2/README.md), [Q3](../plans/qa/Q3/README.md), [Q4](../plans/qa/Q4/README.md), [T18](../plans/qa/T18/README.md), [Q5 full manual QA](../plans/qa/Q5/README.md), [Q6 regression](../plans/qa/Q6/README.md).
- Demo video: `docs/plans/qa/final/poc-demo.mp4` ([README](../plans/qa/final/README.md)).
- Execution log and deviations: plan §13.

## Known limitations
- Safari not verified (WebKit cannot launch on the VM); no real photo near 10 MB (AC-13 acceptance at the limit unverified).
- Model-quality findings (MQ3.x–MQ6.x) are recorded in the gate READMEs; `@model` E2E assertions retry up to 2 times.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
