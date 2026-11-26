# T10 — fast-path first-message templates and finalizer

## Files changed

- `app/src/server/templates/index.ts` — added `renderFirstMessage`, `finalizeFirstMessage` and `validateFirstMessage`.
- `app/tests/unit/templates/templates.test.ts` — added template, disclaimer, citation, heading-order, tone, deadline, damaged-item hint and return-step tests.
- `docs/.agents_brief/poc-implementation-plan-T10-templates.report.md` — this report.

No package install was run. No `.env` or `.playwright-cli` files were opened.

## Red → Green

1. First targeted run after writing tests, before creating the implementation module: import failed with `Cannot find package '@/server/templates'`; 0 tests were discovered. This confirmed the tests could not pass without the missing module.
2. After the first implementation: 25 tests passed and 2 damaged-condition assertions failed because the test expected one Polish inflection (`reklamację`) while the valid hint used another (`reklamacji`). The assertions were broadened to check the shared `reklamac` stem; 27/27 targeted tests passed.
3. Added explicit return refund-timeline coverage. Red result: 27 passed, 1 failed because the first message omitted the policy's payment-return timeline. Added the deadline, possible hold until receipt of the item and return-shipping cost for statutory online-withdrawal cases; 28/28 targeted tests passed.

## Verification

| Check | Result |
|---|---|
| Targeted templates tests | **Passed:** 1 file, 28 tests |
| Full unit/integration test command (`npm test`) | **Passed:** 14 files, 315 tests |
| Lint (`npm run lint`) | **Passed** |
| Typecheck (`npm run typecheck`) | **Passed:** Next route types generated; `tsc --noEmit` completed successfully |
| Build | Not run; the brief requests tests, lint and typecheck |
| App startup / manual flow | Partial evidence only; details below |

Vitest printed the existing Vite configuration warnings about native config loading and the `vite-tsconfig-paths` plugin. Those warnings originate in the existing test configuration and were not changed by T10.

## Reason-code template coverage

Each listed case was rendered and checked for the six ordered headings, case number, decision label, citations, absence of “Pan/Pani” and absence of emoji. Shared reason codes are exercised for the appropriate case types.

| Reason code | Case-type coverage |
|---|---|
| `escalation_signal` | Complaint and return |
| `liability_expired` | Complaint |
| `photo_unusable` | Complaint and return |
| `category_mismatch` | Complaint and return |
| `description_photo_mismatch` | Complaint and return |
| `user_caused_damage` | Complaint |
| `defect_within_period` | Complaint |
| `invisible_defect_inspection` | Complaint |
| `no_rule_matched` | Complaint |
| `llm_inconsistent` | Complaint |
| `return_window_expired` | Return |
| `withdrawal_full` | Return |
| `withdrawal_with_deduction` | Return; condition 4 complaint hint |
| `voluntary_return` | Return |
| `used_item_voluntary` | Return; condition 4 complaint hint |

Additional assertions cover `DD.MM.YYYY` summary formatting, classifier-derived photo findings, the near-deadline purchase-date assumption, exact-once canonical disclaimer finalization, malformed citation and missing-heading rejection, and refund timing / deduction language.

## Runtime check and limits

The existing Next.js 16.4.6 dev server on port 3000 reported ready in the available `/tmp/opencode/t06-dev.log`; an HTTP `HEAD /` returned 200. Playwright CLI screenshot capture completed to `/tmp/opencode/t10-home.png`. A separate attempt to wait for the form selector timed out, and the captured home screen showed only the app header, title, intro and submit button. It did not expose a complete form for submission, so the real submission-to-chat flow and visual comparison of a touched screen could not be completed.

The current checkout contains no production call site for the three template functions (search results are limited to the new module and its tests). Consequently, this checkout provides no end-to-end route through which to exercise the new first-message output. The dev-server evidence is from an already-running shared server, not a server started specifically for this change. No credentials or environment files were inspected.

## Contract discrepancies / observations

- The brief names the outcome type `RulesOutcome`. The checked-in `app/src/server/rules/index.ts` exports `RuleOutcome`, with `templateKey` and optional `notes`; the implementation uses this actual exported contract and its `notes.complaintHint` field.
- No caller of `renderFirstMessage`, `finalizeFirstMessage` or `validateFirstMessage` exists in the current application checkout, so their integration into the pipeline remains outside this file-scoped T10 change.
- The PRD escalation placeholder is example text `Specjalista skontaktuje się w sprawie numeru HSD-…`; templates render the actual case number in that placeholder.
