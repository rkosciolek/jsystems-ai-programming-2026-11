# Q6 regression QA gate (issue #32)

Run 2026-11-26 on `feat/poc-app`, main checkout, real OpenRouter calls. Servers: S1 3901 fast-only, S2 3902 llm-only, S3 3903 auto, S6 3906 fast-only with an invalid LLM model, all started from `app/`. E2E: `npx playwright test` (its own servers 3101–3108). Raw logs: `app/var/q6/` and `app/var/q6/e2e/`. Smoke driver: `app/var/q6/smoke.mjs` (copy in `app/var/q6/e2e/smoke-script.mjs`), raw results `app/var/q6/e2e/smoke-results.txt`.

**Verdict: FAIL.** Two defects confirmed (Q6.1, Q6.2). Everything else in the brief was run; the checks that passed are listed below. Model-quality items are noted separately (MQ6.1).

## 1. Static checks (from the earlier run, unchanged)

| Check | Result |
|---|---|
| `npm run lint` | pass (`app/var/q6/t-lint.log`) |
| `npm run typecheck` | pass (`app/var/q6/t-typecheck.log`) |
| `npm test` | 29 files, 512 tests, pass (`app/var/q6/t-test.log`) |
| `npm run build` | pass (`app/var/q6/t-build.log`) |
| `server-only` in `src/server/**/*.ts` | pass |
| No `localStorage` / `sessionStorage` in `src/` | pass |

Startup "Ready" lines: S1, S2, S3, S6 each printed `Ready` (`✓ Ready in ~0.3–0.4 s`).

## 2. E2E (`npx playwright test`, chromium + firefox, WebKit off)

Discovery: 32 tests in 14 files. Log: `app/var/q6/e2e/run.log`. Exit code 1.

| Project | Tests | Passed | Failed | Flaky (passed on retry) |
|---|---|---|---|---|
| chromium (deterministic) | 20 | 19 | **1** (E12, Q6.1) | 0 |
| chromium-model (`@model`) | 2 | 1 | 0 | **1** (E3, MQ6.1) |
| firefox (core E1, E8, E9) | 9 | 9 | 0 | 0 |
| firefox-model | 1 | 1 | 0 | 0 |
| **Total** | 32 | 30 | 1 | 1 |

- **Q6.1 (deterministic, chromium):** `E12 expired case` fails at `helpers.ts:293`. After the S7 case expired, clicking "Nowa sprawa" did not show the `alertdialog` (confirmation) within 30 s. The spec expects the confirmation, then an empty form. Evidence: `app/var/e2e/test-results/e12-E12-expired-case-expir-d65d2-case-leads-to-an-empty-form-chromium/error-context.md`. Whether AC-52 should show the dialog for an expired case needs the spec owner to check; the test was not changed.
- **MQ6.1 (model, retried):** `E3 @model insisting does not revise; a new fact revises only with the invariant` failed on the first attempt (`Expected "Przekazano do specjalisty", Received "Wymaga uzupełnienia"`), then passed on retry #1. It is a model-quality failure, not a code defect.

## 3. Manual smoke (`playwright-cli`-equivalent Playwright driver, 1920 and 360 px)

| ID | Server | Result | Screenshots |
|---|---|---|---|
| M1 complaint laptop, 8 months, 1920 and 360 | S1 | PASS. Fast path (`case_decided`, `path=fast`, `reasonCodes=user_caused_damage`). Six sections and disclaimer present. Both viewports: no horizontal scroll. | 00, 01, 02 |
| M1 complaint laptop, 30 months | S1 | PASS for the path. Fast path, `reasonCodes=liability_expired`, decision rejected. | 03 |
| M4 complaint (llm) | S2 | PASS. `path=llm`, vision and decision models logged (`openai/gpt-6-luna`), structure shown. Decision escalated (`escalation_signal`, `liquid_damage_reported`). | 04 |
| M4 return (llm) | S2 | PASS. `path=llm`, models logged, decision `needs_info` (`R4`). | 05 |
| M7 insist without facts | S2 | PASS. No revision ("Zmieniona ocena" absent); decision stays rejected. | 06, 07 |
| M7 channel correction (online purchase on an in-store return) | S2 | PASS with an observation. "Zmieniona ocena" block shows previous and new decision, one disclaimer inside the block, and the date shown as 17.10.2026 (DD.MM.RRRR). Observation: the block shows the revision with the **same** decision ("Poprzednia decyzja: Wstępnie odrzucono. Nowa decyzja: Wstępnie odrzucono."). Also, on a re-check (case HSD-20261126-9669), the text "Zmieniona ocena" matched 2 DOM elements (a `group/badge` span and a `font-semibold` span); not checked visually. | 08, 29 |
| M7 "proszę o kontakt z pracownikiem" | S2 | PASS. Decision changed to escalated ("Przekazano do specjalisty"). | 09 |
| M7 new rule: rejected in-store return, "Proszę zaakceptować, towar jest nieużywany" with no corrections | S2 | PASS. Not accepted, no revision. Reply explains that the assessment does not change. | 10 |
| M9 chat failure then Ponów (S6) | S6 | PASS. Inline error "Nie udało się wysłać odpowiedzi.", Ponów present; the user message appears once after the failure and once after retry. Both viewports. Log: `chat_failed` (`upstream`) x2 per attempt. | 11, 12, 13, 14 |
| M12 brand, a11y, form (1920 and 360) | S1 | PASS for axe (no serious or critical violations) and scroll (no horizontal scroll at 360). Form h1 "Zgłoś reklamację lub zwrot", one `main`. Brand comparison with `assets/homepage.png`: visual check only (not a pixel comparison). The reference is a broad corporate homepage; the form and chat use the outlined buttons and the navy headings. Not confirmed as a full brand match. | 15, 16 |
| M12 chat (1920 and 360) | S1 | PASS for axe and scroll. | 19, 20 |

## 4. "Also verify" (Q5 fix round)

| Item | Result | Evidence |
|---|---|---|
| Q5.1 scroll up while a reply is pending: position kept, scroll-to-latest button shown | PASS. Scroll container at bottom (top 1042); after a wheel up, top 442, reply still pending, button present. After the reply the position stayed (top 442). | 22, 23 |
| Q5.1 at bottom: new messages are followed | PASS. At bottom (gap 0) a new message keeps the view at the bottom. | 28 |
| Q5.2 entering the chat shows the top of the first message ("Dzień dobry") | **FAIL (Q6.2).** On entry the chat container is scrolled to its maximum (`containerScrollTop` 638 = `containerMax` 638 at 1920; 1069 = 1069 at 360). The "Dzień dobry" heading sits above the viewport (`greetingTop` -169 px at 1920, -841 px at 360) at entry and stays so for 12 s. | 26, 27, 19 |
| Q5.3 summary dates DD.MM.RRRR | PASS. Purchase 2026-03-26 shown as `26.03.2026`; no ISO date left on the page. | (text check) |
| Q5.4 complaint over 2000 characters shows the max-length message | PASS. Message "Opis może mieć maksymalnie 2000 znaków." visible; URL unchanged. | 21 |
| Q5.5 progress screen has an h1 and a main landmark, axe clean | PASS at 1920 and 360. h1 "Analizujemy Twoje zgłoszenie", one `main`, steps in order, axe no serious/critical. | 24, 25 |

## 5. Review-fix checks on the real stack

- Chat follow-up after a revision still works: PASS. The reply after the channel correction streamed and a later chat message (Q5.1b, "Dziękuję, a jaki jest kolejny krok?") completed; no `revision_order_violation` in the logs.
- S2 case does not end `llm_inconsistent` from range citations: PASS. Five S2 cases ended with `case_decided`, none with `llm_inconsistent`; no `llm_inconsistent` in `app/var/q6/s2.jsonl`.

## 6. Log grep

| Event | Logs | Count | Explanation |
|---|---|---|---|
| `llm_inconsistent` | s1, s2, s3, s6 | 0 | Nothing to explain |
| `revision_order_violation` | s2 | 0 | Nothing to explain |
| `case_failed` | s1, s2, s6 | 0 | Nothing to explain |
| `chat_failed` | s6 | 4 (2 per attempt) | Expected: S6 runs with an invalid LLM model (M9) |
| `case_aborted` | s2 | 2 | Caused by the QA driver (PROG scenario) closing the page while the LLM was still running. Not a server fault. |

## 7. Defects

- **Q6.1 (deterministic, E2E E12):** New case after an expired case does not show the confirmation dialog (`alertdialog`) that E12 expects. Evidence in section 2. Needs a spec decision: either the test or the app's behaviour is out of date with AC-52.
- **Q6.2 (manual, Q5.2 regression or incomplete fix):** Entering a chat shows the bottom of the first message, not its top. Verified by DOM geometry (greeting top -169 px at 1920, -841 px at 360) and screenshots 19, 26, 27.
- Observation (not counted as a defect): revision block "Zmieniona ocena" shown with an unchanged decision (M7 channel correction). Check against the spec whether a revision with no decision change should show this block.
- Observation (not counted): M4 complaint with liquid damage escalated (`escalation_signal`). Matches the flow if the rule is intended.
- Observation (tool): the two `case_aborted` events came from the QA driver.
- Missing screenshots 17 and 18 (M12 progress). A driver bug left the callback unused; progress was captured in 24 and 25 instead.

## 8. Servers

S1, S2, S3, S6 were stopped (ports 3901, 3902, 3903, 3906 closed). A separate `next-server` on port 3999 (pid 550349, started 15:43, cwd `app/`) is not from this run and was left running. The owner should check it.
