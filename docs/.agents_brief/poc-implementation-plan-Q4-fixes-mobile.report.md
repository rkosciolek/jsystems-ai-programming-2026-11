# Q4.6 / Q4.7 fix report

Files: `app/src/components/chat/chat-view.tsx`, `app/tests/unit/chat/chat-view.test.tsx` (2 new tests, red then green; 481 tests pass; lint, typecheck, build pass).

## Q4.7
After a `case_not_found` 404 the inline "Nie udało się wysłać odpowiedzi." and Ponów are no longer rendered (only the expiry alert).

## Q4.6 changes (below 640 px; desktop unchanged)
Compact header (id + "Nowa sprawa" on one row, badge below, case type hidden, smaller h1), `gap-2 py-2`, summary trigger 40 px, expanded summary body capped at 30dvh with its own scroll, message list `min-h-[14rem]`, visually hidden message label, 1-row textarea, smaller send button and paddings.

## Measurements (production build, port 3701, fast-only, real case + 2 messages)
| Viewport | State | Message list height | scrollHeight | scrollWidth |
|---|---|---|---|---|
| 360x740 (before) | collapsed | 186 px (25%) per Q4 run 2 | n/a | 360 |
| 360x740 | collapsed | 417 px (56%) | 740 | 360 |
| 360x740 | summary expanded | 224 px (30%) | 761 (page scrolls ~21 px) | 360 |
| 1920x1080 | summary open (default) | 408 px | 1080 | 1920 |

Desktop: no page scroll, no horizontal scroll, list scrolls inside. AC-40 button not re-measured by script; unit tests for it pass.
Note: the site header (outside `components/chat`) wraps to two lines at 360 px and takes more than the 4rem the chat height assumes; slimming it would raise the 56% further. Screenshots: `app/var/q46/s-*.png`. Server stopped.
