# Report Q4.x frontend

## Changes
- `app/src/components/chat/chat-view.tsx`: `main` is a bounded column (`h-[calc(100dvh-4rem)] md:h-[calc(100dvh-5rem)] min-h-[30rem]`), the message scroller is `flex-1` with `min-h-0` (base class), so only the list scrolls. Only the last message is `scrollAnchor`, and not while the typing item (also an anchor) is shown. The summary panel merges `corrections` from the newest `data-decision` (read defensively from the raw part, because `DecisionDataSchema` does not have the field yet). Expired case: "Nowa sprawa" is a plain button, no dialog. Assistant messages with no text are not rendered (Q4.5).
- `app/src/components/case-form/case-form.tsx`: `min="2000-01-01"` on the date input.
- Tests: 4 new in `app/tests/unit/chat/chat-view.test.tsx`, 1 in `app/tests/unit/case-form/case-form-q2-fixes.test.tsx`.

## Red -> Green
Red: 5 new tests failed (corrections, expired without dialog, empty assistant, bounded column, date min). Green: 27 files, 479 tests pass; `npm run lint`, `npm run typecheck`, `npm run build` pass. (A first `npm test`/`lint` run while the build was running showed 2 failures and lint errors; reruns after the build were clean, probably concurrent `.next` output.)

## Measured (production build, fast-only, port 3501, case + 3 messages + 1 long reply)
| Viewport | documentElement.scrollHeight | scrollWidth | last log child heights |
|---|---|---|---|
| 360x740 | 740 at every step | 360 | 80, 790, 0 px (inner scroller) |
| 1920x1080 | 1080 at every step | 1920 | 52, 426, 0 px |

Before the fix: 827,944 px and 4,091,002 px.

AC-40: at the bottom the button has `data-active=false` (opacity 0); after scrolling the list up it is `data-active=true` (opacity 1), at both widths. While a reply streamed, scrollTop stayed 0 (no forced scroll).
Server stopped, port 3501 free. Screenshots only in `app/var/q4fe/` (not committed).

## Notes / contradictions
- `DecisionDataSchema` lacked `corrections` during this work; the UI reads it from the raw part, so it works once the server worker adds it. Covered by the unit test only; the live run (fast-only) has no revision.
- The expired reset was not exercised in the real browser (needs a short TTL).
- At 360x740 the message area is about 190 px tall next to the header, summary bar and input: not broken, but cramped; a more compact mobile header could help.
- At 360, after one streamed reply ended, the button was still `active=true` in one sample taken right at the end (at 1920 it was false). Possibly timing.
