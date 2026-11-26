# Q5 QA gate: full manual QA M1-M14 (issue #30)

Run 2026-11-26 on `feat/poc-app` HEAD 92ca9e4 (detached worktree `../hsd-q5`, removed afterwards), one `npm run build`, eight `next start` servers S1-S8 on ports 3301-3308 (env per ADR-000 §10), real OpenRouter calls, real photos only, synthetic data. Driver: Playwright library scripts (headless Chromium; the same approach as Q4 run 2), not `playwright-cli`. Every screen is captured at 1920 and 360 px (`NN-<scenario>-<server>-<viewport>.png`; the page is resized between the two shots). Logs and scripts: `app/var/q5/` (`s1..s8.jsonl`, `*.server.log`, `results.jsonl`, `*.mjs`; gitignored).

**Verdict: PASS with findings.** All M1-M14 behave as specified; Q3.1, MQ3.1, MQ3.2 and Q4.1-Q4.7 are fixed or hold. Open: Q5.1 (AC-40 view jumps to the bottom when a reply arrives, medium), Q5.2 (first message opens scrolled to its end, low-medium), and four low items.

## Checks

| Check | Result |
|---|---|
| `npm run lint` | pass, no output |
| `npm run typecheck` | pass |
| `npm test` | **481 tests, 27 files, all pass** on an idle machine. Three earlier runs under load (parallel tsc, load average 9-12) failed 14, 2 and 1 tests with 5 s timeouts in `api-cases.integration.test.ts` (see Q5.6) |
| `npm run build` | pass (`/`, `/_not-found`, `/api/cases`, `/api/chat`) |
| Startup | all 8 "Ready" in 1.3-1.7 s (S1..S8) |
| Console | 0 errors in every flow, except the expected network errors: 415/413 on the direct-fetch rejection tests (M2) and one 404 `/api/chat` on the expired case (M10) |
| Polish UI | Polish throughout, no "Pan/Pani", no emoji, no provider/model/stack text on S4, S5, S6 pages |
| Browsers | Chromium for everything; Firefox 159 launches and the form has `scrollWidth` 360 at 360 px (smoke only). **WebKit/Safari: launch fails on this VM, not verified** |

## Scenarios

| ID | Server | Cases | Steps done | Result | Shots |
|---|---|---|---|---|---|
| M1 | S1 | PJQR (laptop-1, 8 mo), MD5B (laptop-2.webp, 8 mo), D1SP (laptop-1, 30 mo) | form filled, progress (3 steps), first message | **pass.** `path=fast`, 6 headings + disclaimer + case number. PJQR rejected (`user_caused_damage`), MD5B needs_info (`description_photo_mismatch`), D1SP rejected `liability_expired` (C4, §2 ust. 1/4; next steps "płatna naprawa", no escalation text). Fast total 0.9-4.6 s | 08-12 |
| M2 | S1 | none created | empty submit, wrong values, year 0326, 2001 chars, .txt, 10 MB+1 file (UI), photo preview/Usuń, type switch, direct fetch 415/413 | **pass.** Exact Polish messages; `lang=pl`, Noto Sans; fetch 415 "Dozwolone formaty: JPG, PNG, WEBP.", 413 "Plik przekracza limit 10 MB." on `photo`; first radio focused on empty submit. See Q5.5 | 01-07 |
| M3 | S1 | C5CN, A47W, HGSJ, SVNY, D6IJ, N32I, 1Y8D (phone-1/2/3; online 5/20/40 d, store 20/40 d) | all | **pass.** Online 5 d accepted `withdrawal_with_deduction` (deduction note §2 ust. 4); online 20 d and store 20 d accepted `voluntary_return`; 40 d rejected `return_window_expired` (store and online); with reason "Zmieniłem zdanie..." no `needs_info` (Q3.1 fixed). N32I (reason says "used", photo near new) `description_photo_mismatch` is a real contradiction | 13-19 |
| M4 | S2 | OUT0 (complaint), VXN8 (return) | progress, first message | **pass.** `path=llm`, vision + decision `openai/gpt-6-luna`, structure ok; shadow `null` for OUT0 (gate C3b, by design), `accepted` for VXN8 while the LLM says needs_info (wrong-device photo). 38-54 s | 20, 24, 25, 32 |
| M5 | S3 | XNHS, XNM9, WRWG, JRV7, MB50 (all 5 photos) | first message each | **pass.** laptop-1 llm `gate_failed:C3b` (min 0.55); laptop-2 llm `C1` (0.78); phone-1 fast (min 0.91); phone-2 llm `R1` (0.74); phone-3 llm `R4` (0.72). Every route is explained by `gateFailedAt`/`minGatingCertainty` | 41, 43, 44, 46, 48 |
| M6 | S2 | O0K0 | date, policy, off-topic, fake phone | **pass.** "Podałeś datę zakupu: 26.03.2026."; policy answered (replacement vs repair) and tied to the case; weather: one short deflection; "500 600 700" not repeated, "numer telefonu nie jest potrzebny w tym kanale". Typing indicator shown | 33, 36, 39 |
| M7 | S2 | 2GP5 (complaint), 24KH (return, store, 20 d, used) | insist; "kupiłem w sklepie internetowym"; "proszę o kontakt z pracownikiem" | **pass (logic), see MQ5.1.** Insist: no revision, badge unchanged, no log event. Correction: `decision_revised {channel: online}`, badge rejected -> accepted, "Zmieniona ocena" + previous/new + disclaimer, summary shows "Sklep internetowy". Human request: `decision_revised` -> escalated, badge changes. Log order: no `revision_order_violation`, no `revision_rejected` | 42, 45, 47, 49 |
| M8 | S4, S5, S8 | S4 GAJ5 (`timeout`), S5 FQKG (`upstream`), S8 QR5B | submit, banner, first message | **pass.** S4/S5: banner "Nie udało się przeanalizować zgłoszenia. Spróbuj ponownie za chwilę." + Spróbuj ponownie; model, description, photo kept; no leak. S8: `classifierError=upstream`, `path=llm`, decision rejected, first message shown | 29, 31, 34, 37, 40 |
| M9 | S6 | K9BS | message, error, Ponów | **pass.** Inline "Nie udało się wysłać odpowiedzi." + Ponów; after retry 1 user message, 1 error; no provider/model text; log 2 x `chat_failed upstream` | 27, 30 |
| M10 | S7 | 2AG6 | wait 6.5 s, message | **pass.** "Sprawa wygasła. Rozpocznij nową sprawę.", input and Wyślij disabled, **no** "Nie udało się wysłać" and no Ponów (Q4.7 fixed, also at 360 px); Nowa sprawa -> empty form, no confirm dialog | 35, 38 |
| M11 | S1 | P5TW and 2 more | dialog cancel/confirm, reload, keyboard only | **pass.** Dialog text "Rozpocząć nową sprawę? Bieżąca rozmowa zostanie utracona."; Anuluj keeps the chat, confirm empties the form. Reload: `beforeunload` fires; dismiss keeps the chat, accept gives an empty form. Keyboard only: radio, category (Enter + arrows), model, date, channel, description, photo (Enter opens chooser), submit, chat input (Enter sends), Nowa sprawa, dialog (focus on Anuluj), confirm | 28, 54, 56, 57 |
| M12 | S1 | all screens | styles, axe, comparison | **pass**, see below | all |
| M13 | S3 | J46P (guarantee), DRVR (legal), Q16U (swollen battery), EPPL (injection) | first message | **pass.** The first three: `path=fast`, `escalated`, reason `escalation_signal` (certainty 0.92-0.96). Injection: routed to `path=llm` (`instruction_injection`), `escalated`, never accepted | 21-23, 26 |
| M14 | S2 | 9PJ0, 06VM | English description, "another photo", scroll up while a reply is pending | **pass AC-31, AC-38; fail AC-40 (Q5.1).** Polish first message and replies; "nie można dosłać zdjęcia... rozpocznij nową sprawę przez Nowa sprawa", 0 `input[type=file]`. Scrolled up: view stays (st 538 for the whole wait, button opacity 1), but when the reply arrives `scrollTop` jumps 538 -> 1408 (bottom) | 50-53, 55 |

## Open findings re-checked

| Finding | Result |
|---|---|
| Q3.1 | **fixed.** 3 of 3 in-window returns with a reason accepted (S1, S3); a `needs_info` appears only for N32I where the reason contradicts the photo |
| MQ3.1 | **no `llm_inconsistent`** in any Q5 log (4 LLM returns/complaints on S2, 5 on S3, 1 on S8) |
| MQ3.2 | **fixed in substance:** Polish labels, dates DD.MM.RRRR, no "migotanie" or other invented symptom (0 hits). Residual: LLM summary says "Typ sprawy", template says "Rodzaj zgłoszenia" (Q5.4) |
| Q4.1-Q4.5 | hold (bounded scroller, document height = viewport at 1920 and 360) |
| **Q4.6** | **fixed.** 360x740 chat: message scroller 417 px = **56 %** of the screen with the summary collapsed (first message, after replies, error, dialog; 45 % only when the expiry alert is shown, 335 px). Header with badge, Nowa sprawa and summary heading is compact |
| **Q4.7** | **fixed** (M10 above, 1920 and 360) |
| Q4.8 | **still present**, now Q5.1 |
| Site header at 360 px | "Hardware Service Decision Copilot" wraps to two lines (about 64 px), navy, light-blue underline, no overflow, `scrollWidth` 360 on every screen |

## M12: brand and a11y

- Computed styles on the form (1920 and 360): body text `#515D6A`, headings `#003963`, Noto Sans, header border `#85D2F1`, primary button outlined pill (radius 22 px, 1px `#0096E0`, white fill, navy bold text, 47 px), inputs/select/textarea with `#85D2F1` borders and square corners, error text `#CC1D56` (magenta only for errors and the "rejected" badge), square sections. Matches `docs/design-guidelines.md` and `assets/homepage.png` (outlined pill CTA, navy/slate text, light-blue borders). Badges have icon + label and are readable; disclaimer is small slate text, readable. Nowa sprawa, Usuń, Spróbuj ponownie, Wyślij, Ponów are all outlined pills (Q2.3, Q3.3 stay fixed).
- No horizontal scroll: `scrollWidth` 360 on empty form, errors, preview, progress, banner, every first message, chat error, expired case, dialog. Focus ring present on keyboard focus.
- **axe at 360 px, 0 serious/critical** on: empty form, form with errors, progress, first message (S1), chat after a reply (S2), chat error (S6), dialog, expired case, service banner (S4, S5). Moderate on the progress screen only: `landmark-one-main`, `page-has-heading-one`, `region` (Q5.5).

## Log grep (`llm_inconsistent`, `revision_order_violation`, `case_failed`, `chat_failed`)

| Hit | Explanation |
|---|---|
| `case_failed` x2 | S4 GAJ5 `timeout` (`CASE_TIMEOUT_MS=1`), S5 FQKG `upstream` (invalid `VISION_MODEL`): expected |
| `chat_failed` x2, S6 K9BS | expected (invalid `LLM_MODEL`): send and Ponów |
| `llm_inconsistent`, `revision_order_violation` | 0 hits in s1..s8 |
| `decision_revised` x2, S2 24KH | intended (channel correction, escalation); 0 `revision_rejected` |
| Server logs | only the stacks of the expected S6 chat, S8 Jev and S5 vision provider errors |

## Defects

Code (`Q5.n`):
- **Q5.1 (medium, UI, AC-40)** When a pending reply arrives, the conversation jumps to the bottom even if the user had scrolled up. Probe at 250 ms on S2 (06VM): `scrollTop` 538 for the whole wait with the typing indicator and the button visible, then 1408 = `scrollHeight - clientHeight` in the same sample the reply appears; the same in 9PJ0 (604 -> 1534). AC-40: "auto-scrolls ... unless the customer has scrolled up". Same as Q4.8. Shots 52, 53, 55.
- **Q5.2 (low-medium, UI)** The first message opens scrolled to its end: `scrollTop` = max at 1920 (638 of 638) and 360 (1129), so "Dzień dobry"/summary are out of view and the user sees the end of the message first (shots 10, 12). At 1920 the summary panel is open by default and the conversation scroller is only 408 px of the 1080 px screen.
- **Q5.3 (low, UI)** The case summary panel prints the purchase date as ISO (`2026-11-06`) while the message uses 06.11.2026.
- **Q5.4 (low, UI/text)** A complaint with 2001 characters shows "Opisz problem (min. 20 znaków)." instead of the 2000-character limit message (returns show "Opis może mieć maksymalnie 2000 znaków."), `case-form.tsx` and `domain/index.ts` pick the message by case type.
- **Q5.5 (low, a11y, moderate)** Progress screen has no `h1`/`main` landmark (axe moderate x3).
- **Q5.6 (low, tests)** `api-cases.integration.test.ts` ("maps network TypeErrors...", "treats Jev failure as upstream in fast-only mode") hit the 5 s default timeout when the machine is loaded (14 failures in a run next to `tsc`, 1-2 in later loaded runs, 0 on an idle machine: 481/481). Raise the test timeout.

Model quality (`MQ5.n`):
- **MQ5.1 (medium)** After the correction in S2 24KH the decision flipped to "Wstępnie zaakceptowano", while the reply itself says the 14-day window has passed, a voluntary return needs an unused device and the photo shows a seriously damaged screen. Decision and explanation contradict each other.
- **MQ5.2 (low)** LLM first messages use "Typ sprawy" where templates use "Rodzaj zgłoszenia", and a different greeting ("Dziękujemy za zgłoszenie.").
- **MQ5.3 (low)** Same input, different outcome across paths (laptop-2: S1 needs_info mismatch, S3 needs_info via LLM, earlier S2 accepted), expected by design.

## Known limitation

A real photo near 10 MB is not verified (largest real photo about 1.2 MB; 413 was tested with a generated payload, the owner-approved exception). Safari/WebKit not verified (browser cannot launch on this VM). Streaming of a reply token by token could not be observed: replies appear as one block.
