# Q1 QA gate: P1 (scaffold, theme, header)

Date 2026-11-26. Production build (`npm run build` + `npm start -- -p 3000`), driven with `playwright-cli`. Issue #8.

**Verdict: PASS** (one minor defect, Q1.1, does not block the gate criteria).

## Automated checks (`app/`)

| Check | Result |
|---|---|
| `npm run lint` | PASS, exit 0, no warnings |
| `npm run typecheck` | PASS, exit 0 |
| `npm test` | PASS, 4 files, 170 tests passed, 0 failed, 0 skipped (Vite config-loader notice only) |
| `npm run build` | PASS, Next.js 16.4.6 Turbopack, routes `/` and `/_not-found` static |

## Startup

`next start -p 3000` reported "Ready in 369ms". `/` returned HTTP 200 (navigation entry `responseStatus`, via `playwright-cli`).

## Measurements on `http://localhost:3000/`

| Check | Measured | Expected | Result |
|---|---|---|---|
| `html lang` | `pl` | `pl` | PASS |
| `scrollWidth` / `innerWidth` at 360 px | 360 / 360 | scrollWidth <= innerWidth | PASS |
| body `font-family` | `"Noto Sans", "Noto Sans Fallback", Arial, sans-serif`; Noto Sans 400/500/700 loaded | contains Noto Sans | PASS |
| Header text "Hardware Service Decision Copilot" | `rgb(0, 57, 99)`, weight 700 | navy `rgb(0, 57, 99)` | PASS |
| Button border / radius | `1px solid rgb(0, 150, 224)` / `22px` | 1px `rgb(0,150,224)` / 22px | PASS |
| Button text | `rgb(0, 57, 99)`, weight 700, 18px | navy bold 18px | PASS |
| Button background | `rgb(254, 254, 254)` (#FEFEFE) | white | see Q1.1 |
| Header background | `rgb(254, 254, 254)` | white (#FFFFFF) | see Q1.1 |
| Focus ring (Tab to button, `:focus-visible` true) | 3px ring, sky blue at 50% alpha | visible ring | PASS |
| Console | 0 messages (0 errors, 0 warnings) | clean | PASS |
| UI text | Polish ("Zgłoś reklamację lub zwrot", "Wyślij zgłoszenie") | Polish | PASS |
| Log grep (`llm_inconsistent`, `revision_order_violation`, `case_failed`, `chat_failed`) | not applicable at P1 (no API); server log holds only startup lines | none | PASS |

## Screenshots

| File | Shows | Result |
|---|---|---|
| `01-home-1920.png` | Full page at 1920x1080: 80 px white header with navy wordmark, H1, intro, outlined pill button | PASS |
| `02-home-360.png` | Full page at 360x800: wordmark wraps to two lines, H1 wraps, button fits, no horizontal scroll | PASS |
| `03-button-focus-1920.png` | Button focused by Tab at 1920 px: light-blue focus ring around the pill | PASS |
| `04-button-focus-360.png` | Button focused by Tab at 360 px | PASS |

## Brand comparison with `assets/homepage-hero.png` and `docs/design-guidelines.md`

- Header white, 80 px, bottom hairline: MATCH (colour is #FEFEFE, see Q1.1).
- Navy wordmark top-left of the header: MATCH in position (left edge of the 1360 px container at x=312; the reference logo slot is at x=160, acceptable). No logo graphic, nav or utility row yet: expected at P1, not a mismatch.
- Outlined pill button, white fill, 1px sky-blue border, navy Bold 18px, radius 22px, about 47 px tall: MATCH.
- Colours: navy #003963 headings, slate body text, sky blue #0096E0 border: MATCH.
- Typography: single Noto Sans family, Medium-weight H1 in navy, Regular slate body: MATCH.
- Hero imagery, wave and tab strip of the reference: not in scope for P1; not compared.
- Centred 960 px content column with wide white margins at 1920 px: MATCH.

## Defects

- **Q1.1 (minor, cosmetic):** header and button background computed as `rgb(254, 254, 254)` (#FEFEFE, the page-default token) while `design-guidelines.md` specifies header and buttons as `background.surface` #FFFFFF. Visually indistinguishable on the #FEFEFE page. Expected `rgb(255, 255, 255)`.

## Q1.1 fix (orchestrator)

Header and default button now use `bg-card` (#FFFFFF) instead of `bg-background` (#FEFEFE). Fixed in the Q1 evidence commit; re-checked in Q2.
