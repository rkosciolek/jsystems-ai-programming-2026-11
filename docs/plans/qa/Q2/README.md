# Q2 QA gate: form, validation, page state, progress (issue #11)

Run 2026-11-26 on `feat/poc-app` HEAD 4c64a4d (detached worktree `../hsd-q2`), `next start` production build, `playwright-cli`, synthetic data only.

**Verdict: FAIL (blocking: Q2.1, Q2.2 need fix tasks; all AC checks otherwise pass).**

## Check results

| Check | Result |
|---|---|
| `npm run lint` | pass, no output |
| `npm run typecheck` | pass (`next typegen && tsc --noEmit`) |
| `npm test` | pass: 19 files, 381 tests, 0 failed (vitest 5.1.2) |
| `npm run build` | pass (Turbopack, routes `/` and `/_not-found`). Needed a real copy of `node_modules` in the worktree: with the symlink from the brief, Turbopack fails ("Could not find the Next.js package"); `next build --webpack` with the symlink ran out of heap |
| Startup | `Ready in 506ms`. Port 3000 was taken by someone else's `next dev` (main checkout), so the worktree server ran on **port 3100** with `--env-file` (the `.env` was never opened) |
| Server log grep (`llm_inconsistent`, `revision_order_violation`, `case_failed`, `chat_failed`) | 0 hits. Only log error: "Failed to find Server Action" for POST /api/cases |
| Console | only the expected failed POST `/api/cases`, which returns **409** (not 404: Next answers a multipart POST to a missing route with 409, `x-nextjs-action-not-found`). One earlier run showed 8x "Unmergable intersection ... ["description"]" Zod errors, not reproducible (see Q2.4) |
| UI language | Polish throughout |
| Brand | navy text, Noto Sans, light-blue borders, outlined pill primary buttons, magenta only for errors: match; exceptions Q2.3 |

## Acceptance criteria verified by hand

- AC-01/02/03/06: 7 fields in PRD order, labels visible, title and intro, nothing preselected. Pass.
- AC-04 model 1 char: "Podaj nazwę lub model urządzenia (2–100 znaków)." Pass.
- AC-05 date 2026-12-31: "Data zakupu nie może być z przyszłości." Pass. (Empty date says "Podaj poprawną datę zakupu.", not in the PRD.)
- AC-07 complaint, 19 chars: "Opisz problem (min. 20 znaków)." Pass.
- AC-08 return: label "Powód zwrotu (opcjonalnie)". Pass.
- AC-09 Zwrot to Reklamacja, empty description: no error until the field is left, then the error appears. Pass.
- AC-10 counter `N / 2000` (0, 1, 19, 72). Pass.
- AC-11/14 `laptop-1.png` (thumbnail, name, 1,16 MB, Usuń), replaced by `laptop-2.webp` (162,08 kB), Usuń clears. Pass.
- AC-12 text file: "Dozwolone formaty: JPG, PNG, WEBP." Pass. AC-13 (>10 MB) not run: no real photo over 10 MB is available (the brief forbids generated images).
- AC-15 empty submit: all errors at once, "Popraw zaznaczone pola.", focus on the first invalid field (case type). With a valid case type the focus went to the category combobox. Pass.
- AC-16 valid submit: progress screen (3 steps, summary, thumbnail) after about 400 ms. Pass.
- AC-45 return to the form with banner "Nie udało się przeanalizować zgłoszenia. Spróbuj ponownie za chwilę.", all values and photo kept (both viewports). Pass. "Spróbuj ponownie" resubmits (2nd POST seen). Pass.
- AC-50 keyboard only: Tab, Space on radios, Enter/ArrowDown/Enter in the combobox, typed model and date, Space on the channel radio, typed description, Enter on the drop zone opens the file dialog (set with `upload`, the native dialog cannot be driven), Tab reaches Usuń and submit. Pass. Tab order is sane, but the date field needs 4 Tabs (segments and picker).
- Note: the progress screen was held visible by delaying the real `/api/cases` request by 4 s with a Playwright route (the response itself stayed real); without the delay the 409 returns in about 350 ms.

## Screenshots

| File | Shows | Result |
|---|---|---|
| 01-form-empty-1920.png | Empty form, 1920 | pass (page wider than viewport, see Q2.1) |
| 02-form-empty-360.png | Empty form, 360 | pass layout; horizontal scroll, Q2.1 |
| 03-errors-all-1920.png | Empty submit: all errors, summary, focus on case type | pass |
| 04-errors-all-360.png | Same at 360 | pass |
| 05-invalid-values-1920.png | 1-char model, future date, 19-char description (blur errors; shot taken after the first click that did not submit) | pass, shows Q2.2 |
| 06-return-type-1920.png | Zwrot: "(opcjonalnie)" label and return hint | pass |
| 07-photo-laptop1-1920.png | `laptop-1.png` thumbnail, name, size, Usuń | pass (Usuń not a pill, Q2.3) |
| 08-photo-replaced-webp-1920.png | Replaced by `laptop-2.webp` | pass |
| 09-photo-nonimage-1920.png | Text file rejected, format message | pass |
| 10-keyboard-filled-1920.png | Form filled with the keyboard | pass |
| 11-progress-1920.png | Progress screen with summary and thumbnail | pass |
| 12-service-banner-1920.png | Form with banner, data and photo kept | pass |
| 13-form-filled-360.png | Filled form at 360 | pass |
| 14-progress-360.png | Progress at 360 | pass |
| 15-service-banner-360.png | Banner and kept data at 360 | pass |

## Defects

- **Q2.1 (high) Horizontal scroll at 360 px; page also overflows at 1920.** The hidden photo input (`#photo-input`, class `sr-only` plus shadcn `w-full`, so it is `position:absolute; width:360px; left:16px`, not clipped) pushes `scrollWidth` to 375 at 360 px (window scrolled 15 px) and to 2535 at 1920 px (visible as extra width in screenshots 01 to 10). Fix: make the input truly clipped (`sr-only` must win over `w-full`, or `w-px h-px`). Appears only on the form screen.
- **Q2.2 (medium) First click on "Wyślij zgłoszenie" is lost after leaving an invalid field.** Type 1 char in the model and 19 chars in the description, then click submit once: the blur error appears, the layout shifts, the click does not submit (no summary). A second click works. Reproduced twice. Fix: do not rely on click after blur-triggered layout shift (e.g. validate on submit via `onMouseDown` ordering or reserve space for the error line).
- **Q2.3 (low) Usuń and Spróbuj ponownie are square-cornered outline buttons**, not the outlined pill style of the brand. Also the progress-screen thumbnail is offset under the value column.
- **Q2.4 (low, not reproducible) Console showed 8x `Unmergable intersection. Error path: ["description"]`** (Zod intersection in the form resolver) during one keyboard-driven run (case type, category changed after a description edit). Several attempts to reproduce (switching case type with text, submit, keyboard flow) gave no errors. Worth a unit test that exercises the resolver with the case-type switch.
- Observation (not a defect of the gate): POST `/api/cases` returns 409 rather than 404 until T14 exists.
