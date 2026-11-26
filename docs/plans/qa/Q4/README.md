# Q4 QA gate: chat, revision, failure, expiry (issue #27)

Run 2026-11-26 on `feat/poc-app` HEAD 119d515 (detached worktree `../hsd-q4`), one `npm run build`, four `next start` servers (S1 3201 fast-only, S2 3202 llm-only, S6 3206 invalid `LLM_MODEL`, S7 3207 `CASE_TTL_MS=5000`), real OpenRouter calls, `playwright-cli` (`run-code` scripts), real photos from `assets/example-images/`, synthetic data. Logs: `app/var/q4/s1.jsonl`, `s2.jsonl`, `s6.jsonl`, `s7.jsonl` (gitignored).

**Verdict: FAIL for the gate as it stands (one high UI defect Q4.1, one medium Q4.2).** M6, M9, M10, M11, M14 (except AC-40) and Q3.3 behave as specified; revision logic works; but the chat layout breaks after the first reply, and a revised message carries no text.

## Checks

| Check | Result |
|---|---|
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm test` | pass: 27 files, 460 tests (stderr shows an expected `chat_failed` log from a failure test) |
| `npm run build` | pass (`/`, `/_not-found`, `/api/cases`, `/api/chat`) |
| Startup | all four "Ready" in 0.6 to 1.2 s |
| Polish UI / tone | Polish throughout, no "Pan/Pani", no emoji; no provider, model or stack text on the page (S6 checked) |
| 360 px | `scrollWidth` 360 after first message and after a reply; summary collapsed (`Szczegóły sprawy`, `aria-expanded=false`); badge has icon + label; no raw `##` or `**` in the page text |

## Scenarios

| Scenario | Case | Srv | Result | Evidence |
|---|---|---|---|---|
| **M6** chat (Lenovo ThinkPad T14 complaint, 8 months) | HSD-20261126-YHHR | S2 | **pass** | "Jaką datę zakupu podałem?" -> "Podałeś datę zakupu 26.03.2026." Policy question (replacement) -> answers from §5 and says the case is with a specialist. Off-topic (weather) -> one short deflection: "Mogę pomóc tylko w sprawie tej reklamacji lub zwrotu. Możemy kontynuować rozmowę o Twoim zgłoszeniu." Phone "500 600 700" -> not repeated, "Numer telefonu nie jest potrzebny w tym kanale". Shots 01 to 03 (02 is the typing indicator, taken in a first run on case HSD-20261126-7YSM). |
| **M7a** no new facts (laptop-1 complaint) | HSD-20261126-48BH | S2 | **pass** | "Proszę zmienić decyzję" -> "Sama prośba o zmianę nie zmienia wstępnej oceny ...", badge stays "Wstępnie odrzucono", no log event. Shot 04. |
| **M7b** correction (return, store, 20 d, signs of use) | HSD-20261126-SF5H | S2 | **pass (logic), fail (message), see Q4.1/Q4.2** | "Kupiłem w sklepie internetowym" -> `decision_revised` rejected -> accepted, `corrections {channel: online}`, badge "Wstępnie zaakceptowano", message badge "Zmieniona ocena" + disclaimer. The message has **no text**: no previous/new decision, no reason. Shots 05, 06. |
| **M7c** escalation | HSD-20261126-SF5H | S2 | **pass (logic)** | "Proszę o kontakt z pracownikiem" -> `decision_revised` accepted -> escalated, badge "Przekazano do specjalisty"; the reply is again empty. Shot 07 is blank (Q4.1). |
| **M9** chat failure | HSD-20261126-3673 | S6 | **pass** | Inline "Nie udało się wysłać odpowiedzi." + **Ponów**; after retry exactly one copy of the user message and one error; no `openrouter`, model id or stack on the page; console 0 errors. Log: 2 x `chat_failed` `upstream` (expected, one per attempt). Shots 12, 13. |
| **M10** expiry | HSD-20261126-A2MV | S7 | **pass** | After 6.5 s: "Sprawa wygasła. Rozpocznij nową sprawę.", textarea and Wyślij disabled, Nowa sprawa -> confirm dialog -> empty form. The browser logs one `404` for `/api/chat` (expected, network-level). Shots 14, 15. |
| **M11** new case / reload / keyboard | HSD-20261126-OCHF, 8G8J, 8S5C, OJBS | S1 | **pass** | Nowa sprawa: Anuluj keeps the chat, confirm gives an empty form (shot 16). Reload with a chat open: `playwright-cli reload` prints `Modal state: "beforeunload" dialog`, but a following `dialog-accept`/`dialog-dismiss` says "requires an open dialog" and the page is already an empty form (the CLI resolves it itself). With a `page.on('dialog')` handler: dismiss keeps the chat, accept gives an empty form. Keyboard only (Tab, Space, Enter, arrows, file chooser opened with Enter): radio, category, model, date, channel, description, photo, submit, chat input, Wyślij, Nowa sprawa and the dialog (focus lands on Anuluj) are all reachable (shot 17). |
| **M14** language, photo, scroll | HSD-20261126-7FF9 | S2 | **pass AC-31/AC-38, fail AC-40** | English description -> Polish first message and replies. "Czy mogę dosłać jeszcze jedno zdjęcie?" -> "Nie można dosłać zdjęcia w tej rozmowie ... rozpocznij nową sprawę przez Nowa sprawa"; no `input[type=file]` and no attach button in the chat. Scrolling up by 700 px mid-stream is not undone (`scrollY` stays 2320), but "Przewiń do najnowszej wiadomości" stays at `opacity: 0`, `pointer-events: none` (Q4.1). Shots 08 to 11 (09 is a first attempt whose wheel event did nothing). |
| **Q3.3 re-check** | HSD-20261126-PBDI | S1 | **fixed** | "Nowa sprawa" computed style at 360 px: `border-radius 22px`, `1px solid rgb(0,150,224)`, white background, text `rgb(0,57,99)`, 47 px high: an outlined pill (shot 18). |
| Typing indicator, markdown, disclaimer | PBDI | S1 | **pass** | `role=status` "Asystent przygotowuje odpowiedź" visible during a reply (shot 20); headings and lists rendered, disclaimer readable (shots 18, 19, 21). |

## Log grep (`llm_inconsistent`, `revision_order_violation`, `case_failed`, `chat_failed`)

| Hit | Explanation |
|---|---|
| `chat_failed` x2, S6 `HSD-20261126-3673` | Expected (`LLM_MODEL=invalid/does-not-exist`): first send and the Ponów retry, `failureCode upstream`. |
| `llm_inconsistent`, `revision_order_violation`, `case_failed` | 0 hits in all four logs. `case_aborted` x2 in S2: my first run was stopped by a `beforeunload` dialog (not in the grep list). |
| `decision_revised` x2, S2 (SF5H) | Intended: rejected -> accepted (`corrections.channel=online`) and accepted -> escalated. The tool ran before any text each time (no `revision_order_violation`). |
| `revision_rejected` x3, S2 | 7YSM and YHHR: the chat model called `revise_decision` on a policy / phone message with no change (escalated -> escalated), rejected as intended, no badge change. SF5H 13:04:45: a **second** tool call in the same turn after the revision (`revision_already_attempted`); it is logged with `decision rejected`, `previousDecision accepted`, channel `store` (stale fields). See Q4.2. |

## Defects

- **Q4.1 (high, UI) Runaway scroll spacer; chat unusable after the first reply.** In `[role=log]` the last child (the message scroller spacer) grows to 0.8 to 4.7 million px (document `scrollHeight` 827,944 at 360 px after one reply in S1; 4,091,002 at 1920 px after three messages in S2). The message scroller is not a bounded inner scroller: it is as tall as its content, the whole page scrolls, `content-visibility: auto` items report empty `innerText`, the page ends in a blank screen (shot 07, 11) and the "Przewiń do najnowszej wiadomości" button never appears (AC-40). Evidence: shots 07, 10, 11 and the `getBoundingClientRect` heights of the log children. Suspects: `chat-view.tsx` lines 236 to 273 (the `MessageScroller` has `min-h-[18rem] flex-1` but no fixed or max height, and two items can be `scrollAnchor` at once: the last message and the typing item). Reproduced in S1 (360 px) and S2 (1920 px).
- **Q4.2 (medium, code) A revised message has no text.** After `decision_revised` the assistant message is only the "Zmieniona ocena" badge and the disclaimer (`<div class="space-y-4"></div>` is empty): no previous/new decision, no reason, no explanation (M7b and M7c, 2 of 2). In M7b the model also called the tool twice in the turn (32 s, second call logged as `revision_rejected` with stale fields), so the second step may end on a tool call with no text. Needs a text fallback built from `appliedRevision` (previous, new, reason).
- **Q4.3 (low, form) No lower bound for the purchase date.** A date typed as year 0326 was accepted and decided (`ageDays 621192`, `liability_expired`, S1 `HSD-20261126-R0N1`, `JSX6`). Only "real ISO date" and "not in the future" are validated.
- **Q4.4 (low, UI) The case summary panel keeps the original channel** ("Sklep stacjonarny") after the revision changed it to online (shot 07 DOM); and the "Nowa sprawa" confirm dialog still says "Bieżąca rozmowa zostanie utracona" on an expired case (acceptable, just unnecessary).
- **Q4.5 (low, UI) Empty bordered box above the typing indicator** (about 34 px, shot 02): an empty assistant item is rendered before the reply starts.
- No model-quality findings `MQ4.n` blocking. Observations: the decision LLM escalated `laptop-2.webp` ("Przegrzewanie" in the description is an escalation signal), and in the first M6 run it flagged the model mismatch (the photo is a Lenovo ThinkPad, I had typed Dell). Tone is informal ("Zrób kopię zapasową") without "Pan/Pani" or emoji.

## Files

`01` to `21` `*.png` in this folder (`<NN>-<scenario>-<server>-<viewport>.png`); logs in `app/var/q4/`. Servers started by this run were stopped; ports 3201, 3202, 3206, 3207 are free.
