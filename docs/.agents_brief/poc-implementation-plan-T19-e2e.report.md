# T19 E2E real-stack suite: report

Scope: `app/playwright.config.ts` and `app/tests/e2e/**`. The suite was not run (per brief). Checks run: `npx playwright test --list`, `npx tsc --noEmit`, `npx eslint tests/e2e playwright.config.ts`. No `.env` file was opened.

## Files
- `app/playwright.config.ts`: `webServer` array of 8 `next start` servers (ports 3101-3108) from one build, with env overrides from the matrix and `DECISION_LOG_PATH=./var/e2e/s<N>.jsonl`. `reuseExistingServer: false`. Projects: `chromium`, `chromium-model`, `firefox` (E1, E8, E9 only), `firefox-model`, and `webkit` and `webkit-model` only when `E2E_WEBKIT=1`. Default `retries: 0`. Projects with `@model` tests use `retries: 2`. `workers: 2`, test timeout 180 s, output under `app/var/e2e/`.
- `app/tests/e2e/servers.ts`: the matrix (S1-S8: ports, overrides, log paths). It is shared by the config and the specs. The config strips matrix keys from the inherited environment, so the shell cannot change a server's mode. Model IDs come from `../.env` via `node --env-file-if-exists`.
- `app/tests/e2e/helpers.ts`: custom `test` with an auto console guard (fails on console errors, uncaught page errors and React warnings, TAC-003-05). Network-status console errors are allowed only when a spec sets `allowNetworkErrors`. Also: form filling with real photos via `setInputFiles` on the hidden file input, `submitCase` (reads the NDJSON body of the same `/api/cases` response, without interception), decision-log readers, chat helpers, streamed-reply wait, axe at serious/critical, horizontal scroll check (`scrollWidth <= 360`), provider-leak check.
- `app/tests/e2e/e1.spec.ts` … `e14.spec.ts`: one file per ADR row.
- `package.json` is unchanged. `test:e2e` stays `playwright test`. Run as `npm run build && npm run test:e2e`.

## `--list` counts (`npx playwright test --list`)
| Project | Tests | Files |
|---|---|---|
| chromium | 20 | 14 |
| chromium-model | 2 | 2 |
| firefox | 9 | 3 (e1, e8, e9) |
| firefox-model | 1 | 1 (e1) |
| all (default run) | 32 | 14 |
webkit projects are not listed because `E2E_WEBKIT` is not set.

## Spec to ADR row
| Spec | ADR-000 §10 row | Server | Projects | Tests |
|---|---|---|---|---|
| e1 | E1 | S1 | chromium; chromium-model (@model); firefox; firefox-model | Fast path with progress order and structure; `@model` purchase date in the chat reply |
| e2 | E2 | S1 | chromium | Return, store, 10 days, fast path |
| e3 | E3 | S2 | chromium; chromium-model (@model) | LLM path with vision/decision models and `shadowFastPathDecision`; `@model` insist does not revise, new-fact invariant |
| e4 | E4 | S2 | chromium | Return, LLM path, chat reply streams |
| e5 | E5 | S3 | chromium | Auto routing consistent with `minGatingCertainty` and `gateFailedAt` |
| e6 | E6 | S4 | chromium | Timeout banner, retry, values and photo kept, `case_failed` timeout |
| e7 | E7 | S5 | chromium | Upstream banner, no provider or stack text, `case_failed` upstream |
| e8 | E8 | S1 | chromium; firefox | Empty submit and focus, 19-char description, 11 MB file in the browser, 415 through the UI, generated 413 and 415 via `POST /api/cases` |
| e9 | E9 | S1 | chromium; firefox | Cancel keeps chat, confirm empties form, reload fires `beforeunload` |
| e10 | E10 | S1 | chromium | 360 px: no horizontal scroll and no serious/critical axe on form, progress and chat |
| e11 | E11 | S6 | chromium | Chat failure, inline error, Ponów, one user-message copy, no provider text |
| e12 | E12 | S7 | chromium | Expiry text, disabled input, New case gives an empty form |
| e13 | E13 | S8 | chromium | Jev failure: `classifierError` set, path llm, first message shown |
| e14 | E14 | S2 | chromium | Escalation and injection answers in the log, structure of both first messages |

Evidence mapping to plan §6 (`docs/plans/poc-implementation-plan.md`): the E-rows above, plus TAC-003-02 (E10 axe), TAC-003-03 (E10 scroll), TAC-003-05 (console guard in every spec).

## Deviations and open items
1. Console guard allowance is wider than the brief's "S4/S5/S6": `allowNetworkErrors` is also set on E8 (UI and direct 400/413/415 responses), E11 (S6) and E12 (S7, expected 404). Remove it on E8 and E12 if the owner wants a strict reading.
2. E4 does not assert the typing indicator. `pl.ts` has no string for it, and a selector would depend on the unfinished chat view. Add it once the chat view exists.
3. E10 runs axe on the progress screen inside the submit callback. The screen is visible only while the real request runs, so this step is timing-dependent.
4. E1 progress order is read from the DOM `ol li` items (all three steps, in order), not from observed completion events.
5. E6 and E7 find their `case_failed` entries by timestamp, because the client gets no case ID on failure.
6. Chat selectors are role and `pl.ts` based (`getByRole('textbox').last()`, the send and Ponów buttons, `pl.chat.sections` headings, `alertdialog` for New case). They are unverified against the chat view, which another worker is still writing. All chat selectors are in `helpers.ts`, so they can be adjusted in one place.
7. React warnings: a production build does not emit React dev warnings, so the React-warning branch of the guard can only catch them under a dev build. Console errors and page errors are checked fully.
8. Firefox is not installed in this VM (`~/.cache/ms-playwright` has chromium and webkit only). The runner must run `npx playwright install firefox` before the firefox projects. WebKit is off by default.
9. Lint: my files pass `eslint`. The full `npm run lint` fails on `app/src/components/chat/chat-view.tsx:103` (react-hooks/set-state-in-effect, error) and warns on `app/tests/unit/chat/chat-view.test.tsx:2`. Both belong to the other worker's chat files.
10. Specs were not executed. Real LLM cost per full run is as in ADR-000 §10 (about 15 Jev calls, about 6 vision, 6 decision and about 10 chat turns). E1 and E3 `@model` results must be reported separately from code defects.
