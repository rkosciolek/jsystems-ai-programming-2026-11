# T19 E2E run: report

Scope: real-stack run of `app/tests/e2e/**` against one `npm run build` of `app/` (ports 3101-3108, real OpenRouter calls). WebKit off. No `.env` file was opened. No git, no package install, no application source edits.

## Environment and steps
- `npm run build`: passed (Next.js 16.4.6, TypeScript and static generation clean). Log: `app/var/e2e/build.log`.
- Firefox: `npx playwright install firefox` installed Firefox 159.0 (playwright firefox v1572). Log: `app/var/e2e/install-firefox.log`.
- Discovery: `npx playwright test --list` gave 32 tests in 14 files (chromium 20, chromium-model 2, firefox 9, firefox-model 1).
- Lint: `npx eslint tests/e2e playwright.config.ts` passed after the spec fixes.

## Counts per project
| Project | Run 1 (passed / failed / flaky / skipped) | Final run (passed / failed / flaky / skipped) |
|---|---|---|
| chromium (20 tests) | 17 / 3 / 0 / 0 | 20 / 0 / 0 / 0 |
| firefox (9 tests) | 7 / 2 / 0 / 0 | 9 / 0 / 0 / 0 |
| chromium-model (2 tests) | 2 / 0 / 0 / 0 | 2 / 0 / 0 / 0 |
| firefox-model (1 test, retries 2) | 0 / 1 / 0 / 0 | 1 / 0 / 0 / 0 |
| Total | 26 / 6 / 0 / 0 | 32 / 0 / 0 / 0 |

Run 1 was the full suite as shipped. The final run is the full suite after the spec fixes below.

Output files:
- Run 1 list log: `app/var/e2e/run1.log`. JSON: `app/var/e2e/run1.json`. HTML: `app/var/e2e/html-run1/`.
- Final list log: `app/var/e2e/final.log`. JSON: `app/var/e2e/final.json`. HTML: `app/var/e2e/html-final/`.
- Targeted re-runs: `app/var/e2e/rerun-e8.log`, `app/var/e2e/rerun-e8-2.log`, `app/var/e2e/rerun-e1-firefox-model.log`.
- Per-server decision logs: `app/var/e2e/s1.jsonl` to `s8.jsonl`. Lint: `app/var/e2e/eslint-run2.log`.

## Spec fixes made (spec-side only)
1. `app/tests/e2e/helpers.ts` (console guard): the React-warning regex `/Warning:|was not wrapped/` also matched Firefox's engine notice `JavaScript Warning: "The execution of microtasks on this page was reordered..."`. It now matches `/^Warning: |was not wrapped in act/`. This caused the firefox-model E1 failure (3 attempts, all the same notice). The guard still fails on console errors, uncaught page errors and React dev warnings. Verified: E1 `@model` on firefox-model passed in the targeted re-run.
2. `app/tests/e2e/e8.spec.ts` (generated 413 and 415 payloads): the direct POST sent `category: "Smartfon"` (the visible label). The API validates the enum ID, so it returned 400 with `fields.category = "Wybierz kategorię urządzenia."`. Both payloads now send `category: "smartphone"`. The UI-driven calls keep the label, which the form maps. Verified: all 12 E8 tests pass on chromium and firefox.
3. `app/tests/e2e/e8.spec.ts`: the 413 and 415 status assertions now include the response body in the failure message, and parse the body from text. No assertion was weakened.

## E2E defects (application, left failing by rule)
### E2E.1 Jev failure intermittently ends the case instead of degrading to the LLM path (TD-105)
- Spec: `app/tests/e2e/e13.spec.ts`, S8 (port 3108, `DECISION_MODE=auto`, `JEV_MODEL=invalid/does-not-exist`). Expected per ADR-001 TD-105: a Jev HTTP failure routes to the LLM path and `classifierError` is logged.
- Run 1 actual: `POST /api/cases` returned no `result` event (`caseId` undefined) and the stream ended with an error. Log line in `app/var/e2e/s8.jsonl`, case `HSD-20261126-4WP9`: `event: case_failed`, `failureCode: internal`, `step: analysis`, `models.classifier: invalid/does-not-exist`, `models.decision: null`, `models.chat: null`, `latencyMs.classifier: 599.8`, and no `classifierError` field. The vision model was logged (`openai/gpt-6-luna`).
- Final run actual: case `HSD-20261126-HZ1X`: `event: case_decided`, `classifierError: upstream`, `path: llm`. The E13 test passed (28.7 s).
- Assessment: intermittent, 1 failure in 2 runs. `src/server/pipeline/index.ts` lines 140-146 catch `ClassifierError` and degrade, so the failing run must have thrown a non-classifier error after the classifier step (analysis). The log does not record the error class or message, so the root cause is not confirmed. Suggested owner action: log the error class in `case_failed`, then investigate the analysis-step exception path under a Jev outage.

## ME.n model-quality findings
None. The `@model` tests (E1 and E3 on chromium-model, E1 on firefox-model) passed in both runs after retries were allowed. The only `@model` failure in run 1 was the console guard (spec defect 1 above), not model output.

## Evidence rows (plan §6) proven by this run
Proven by the final run (32/32) unless noted. "Log" means the per-server JSONL field.
| §6 component | Spec(s) | Proof |
|---|---|---|
| `POST /api/cases` validation 400/413/415 | E8 (S1) | HTTP status and `fields.photo` in the response body (E8 generated 413 and 415 tests), Polish messages in the UI |
| NDJSON progress and result | E1, E2, E3, E4, E5, E14 | Step order in DOM (E1); `result` event with case ID |
| Image processing incl. `.png`, JPEG, WebP | E1, E3, E12, E13 | `case_decided` in S1, S2, S7, S8 logs |
| Jev complaint and return sets | E1, E2, E4, E5, E14 | `models.classifier`, `classifierAnswers` |
| Rules tables | E1, E2 (S1) | `path: fast`, `reasonCodes` |
| `auto` routing | E5 (S3) | `gateFailedAt`, `minGatingCertainty`, `reasons` |
| `llm-only` shadow decision | E3, E4 | `shadowFastPathDecision` |
| Templates and finalizer | E1, E2 | 6 headings and disclaimer in DOM |
| Vision LLM, decision LLM, `checkLlmOutcome` | E3, E4, E13, E14 | `models.vision`, `models.decision` |
| Jev failure to LLM fallback | E13 (S8) | `classifierError`, `path: llm` (final run). Intermittent, see E2E.1 |
| Timeout, upstream failure | E6 (S4), E7 (S5) | `case_failed` with `failureCode` timeout and upstream |
| `POST /api/chat` streaming | E1, E4 | Reply content in DOM, `@model` reply check in E1 |
| `revise_decision`, corrections, human request | E3 (`@model`) | `decision_revised`, `corrections` in S2 log |
| Chat failure and Ponów | E11 (S6) | `chat_failed`; one user message in DOM |
| Expired case | E12 (S7) | Expiry text, disabled input, 404 |
| Escalation and injection signals | E14 | Answers in S2 log |
| New case, reload, `beforeunload`, keyboard | E9 | DOM state, dialog event |
| Brand, a11y, responsive | E10 | `scrollWidth <= 360`, axe serious/critical at 360 px |
| `llm_inconsistent`, `revision_order_violation`, network drop | none | Not producible for real, as §6 states |

Not covered by this run: WebKit (off), AC-31/38/40 (manual gate, Q4 M14), and the Q1/Q5 screenshot checks, which remain manual.
