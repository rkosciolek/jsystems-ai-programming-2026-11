# T12 — Case form implementation report

## Files changed

- `app/src/components/case-form/index.ts` — public exports required by T15.
- `app/src/components/case-form/case-form.tsx` — `Draft`, `emptyDraft`, `MAX_PHOTO_BYTES`, and `CaseForm` implementation.
- `app/tests/unit/case-form/case-form.test.tsx` — RTL coverage using real images from `assets/example-images/`; generated payloads are limited to invalid-format and oversize rejection cases.

## Behavior implemented

- Seven controls in the PRD order, case-type radio tiles and subtitles, category choices, purchase-channel choices, an unselected initial state, and a date input capped at `todayInWarsaw()`.
- React Hook Form in `onTouched` mode, shared domain validation plus client photo checks, all invalid fields on submit, summary text, ordered focus, and `aria-invalid`/`aria-describedby` on invalid controls.
- Case-dependent description labels/placeholders and photo hints, optional return description, and live character count.
- Keyboard- and drag/drop-operable photo selection, MIME/extension and 10 MB checks, replacement, localized size display, thumbnail object URL cleanup, and remove action.
- Server field errors via `setError`, AC-45 service banner, retry callback, and disabled state after valid submission.

## Red → Green evidence

- **Red, before implementation:** `npm test -- tests/unit/case-form/case-form.test.tsx` failed resolving the not-yet-created component import at test line 7; `Test Files 1 failed (1)`, `Tests no tests`. This was the expected missing-implementation failure.
- An initial post-implementation jsdom run exposed missing `ResizeObserver`/pointer APIs in the test environment. The test file now supplies those browser API shims; no production workaround was added for jsdom.
- **Green, focused:** `npm test -- tests/unit/case-form/case-form.test.tsx --pool=threads --maxWorkers=1 --reporter=dot` — `Test Files 1 passed (1)`, `Tests 22 passed (22)`.

## Verification

- `npm run lint` — passed with no errors or warnings.
- Scoped ESLint after the final file layout and edits — passed with no output.
- `npm run typecheck` — passed; route types generated and `tsc --noEmit` completed with no errors.
- Full unit suite, `npm test -- --pool=threads --maxWorkers=1` — `Test Files 14 passed (14)`, `Tests 315 passed (315)`.
- Vitest emits existing Vite configuration notices about `configLoader: 'native'` and `vite-tsconfig-paths`; these are unrelated to T12.

## Missing Polish strings / specification conflict

The brief requires all UI copy to come from `pl.ts` and says missing strings must be reported rather than hard-coded. The required module has no dedicated visible field-label strings for **case type, equipment category, model, purchase date, purchase channel, description, or photo**, and no introductory sentence for the form screen. Existing strings are used as the available labels/placeholders where possible; this means some currently displayed labels are validation text or placeholders rather than purpose-written field labels. The intro sentence is omitted rather than invented. Add approved Polish strings to `pl.ts` in a follow-up to fully satisfy PRD §9.1 and ADR-003 §3.6.

## Manual QA

The component was deliberately not wired into `page.tsx`, as required by T12; T15 owns that integration. Therefore the running application does not expose this component yet, so a real browser flow, app screenshot, and brand-reference comparison were not available within this file scope.

## Round r2

- Updated `CaseForm` to use the new `pl.form.labels.*` entries for the case type, category, model, purchase date, channel, description, photo, required marker, and drop-zone instruction. The category placeholder uses `categoryPlaceholder`; the description label switches by case type and keeps the description placeholders separate. The drop zone presents `dropzone` and `chooseImage`.
- Removed the form title from `CaseForm`; it no longer renders the page-owned title or intro. Updated RTL queries/assertions to use the new visible labels with `getByLabelText`.
- `npm test -- tests/unit/case-form` — passed: `Test Files 1 passed (1)`, `Tests 22 passed (22)`.
- `npm run lint` — completed with 0 errors; it reported two unrelated warnings in `app/tests/unit/llm/llm.test.ts` (unused `readFile` and `CAPTURES`). ESLint scoped to the T12 component and test files passed with no warnings.
- `npm run typecheck` — passed; route types generated and `tsc --noEmit` completed successfully.
