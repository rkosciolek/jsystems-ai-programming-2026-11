# Q5.1–Q5.6 Fix Report

## Results by defect

| Defect | Test(s) | Fix | Files |
|---|---|---|---|
| **Q5.1 — scroll position changes when a reply arrives (AC-40)** | `isNearBottom uses a threshold`; `does not anchor (scroll to) a reply when the user scrolled up`; `anchors the reply when the user is at the bottom` | Track whether the viewport is within 80 px of the bottom. New messages anchor only while that state is true; sending a message resumes following the conversation. | `app/src/components/chat/scroll.ts`; `app/src/components/chat/chat-view.tsx`; `app/tests/unit/chat/q5-fixes.test.tsx` |
| **Q5.2 — first message opens at its end** | `does not default-scroll to the end of the first message` | Set the initial stick-to-bottom state to false and use the scroller's `start` position, so the first message is initially shown from its beginning. | `app/src/components/chat/chat-view.tsx`; `app/tests/unit/chat/q5-fixes.test.tsx` |
| **Q5.3 — ISO date in the case summary** | `shows the purchase date as DD.MM.RRRR`; `shows the corrected purchase date and channel from the latest data-decision` | Format ISO dates as `DD.MM.RRRR` in the chat case summary. The progress summary does not display a date. | `app/src/components/chat/scroll.ts`; `app/src/components/chat/chat-view.tsx`; `app/tests/unit/chat/q5-fixes.test.tsx`; `app/tests/unit/chat/chat-view.test.tsx` |
| **Q5.4 — wrong message for an overlong complaint description** | `client schema reports descriptionTooLong`; `domain schema reports descriptionTooLong`; complaint schema case `rejects 2001 characters with the appropriate limit message` | Report the 2000-character limit error for descriptions longer than 2000 characters, regardless of case type. | `app/src/components/case-form/case-form.tsx`; `app/src/lib/domain/index.ts`; `app/tests/unit/case-form/q5-description.test.ts`; `app/tests/unit/domain/schemas.test.ts` |
| **Q5.5 — missing progress-page accessibility landmarks** | `has an h1 from pl.progress.title inside a main landmark`; page-state checks assert form, progress and chat content is within `main`; `keeps chat content inside a main landmark` | Add the Polish progress title as an `h1` and wrap progress content in `main`. Form and chat content are also verified within their existing `main` landmarks. | `app/src/components/progress/analysis-progress.tsx`; `app/src/lib/i18n/pl.ts`; `app/tests/unit/page-state/progress.test.tsx`; `app/tests/unit/page-state/page.test.tsx`; `app/tests/unit/chat/q5-fixes.test.tsx` |
| **Q5.6 — integration-test timeout under load** | Full Vitest suite; existing integration assertions unchanged | Raise Vitest's test timeout to 30 seconds. | `app/vitest.config.ts` |

## Verification

- `npm test`: **29 test files, 512 tests passed**; no failed or skipped tests.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; production routes generated for `/`, `/_not-found`, `/api/cases` and `/api/chat`.
- Production startup on port 3801 succeeded. The manual Playwright check for Q5.1/Q5.2, including measurements and screenshots, is deferred to the Q6 gate; no real-browser measurements are reported here.
