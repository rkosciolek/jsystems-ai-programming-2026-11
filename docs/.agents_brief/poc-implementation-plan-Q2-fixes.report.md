# Report Q2.x fixes

All four defects fixed test-first. Red recorded (6 new tests failed before the fix), then green.

- **Q2.1** `case-form.tsx`: photo input class `sr-only w-px! h-px!` (important modifiers beat the shared `w-full`/`h-8`). Still labelled; the drop-zone button opens it by keyboard. Measured on the production build: scrollWidth/innerWidth 360/360 and 1920/1920.
- **Q2.2** `FieldError` always renders a `min-h-5` message slot (`data-slot="field-message"`), so a blur error no longer moves the submit button; AC-15 unchanged. Manual: invalid model + short description, blur, then one click on submit showed "Popraw zaznaczone pola.".
- **Q2.3** "Usuń" and "Spróbuj ponownie" now use the default (pill) Button variant; `button.tsx` untouched. Progress thumbnail gets `object-left` (the 320 px wide img box centered the picture inside the summary).
- **Q2.4** Client schema no longer uses `.and()`: one `z.object({photo}).loose().transform(...)` runs the domain schema and re-reports its issues, plus the photo checks. The description rule is also checked there because Zod skips the domain refinement while another field is invalid (the old intersection relied on that). Exported `clientSchema`.

Tests: new `app/tests/unit/case-form/case-form-q2-fixes.test.tsx`, extra case in `app/tests/unit/page-state/progress.test.tsx`.
Checks: `npm test` 416/416 (23 files, 0 skipped), lint clean, typecheck clean (needed `as unknown as Resolver<Draft>` after the schema type change), `npm run build` ok (includes T14 route /api/cases). Server on port 3000 started from a production build and stopped; no screenshots committed. No contradictions with the brief.
