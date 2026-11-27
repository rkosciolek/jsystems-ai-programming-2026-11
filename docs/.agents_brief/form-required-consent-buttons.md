# Brief — required markers, AI consent checkbox, equal dialog buttons

- **Worker:** Haiku subagent. Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/` (read `app/AGENTS.md`).

## Spec (source of truth)
`docs/PRD.md` AC-53, AC-54, AC-55 (new), AC-01, AC-07, AC-08, AC-15; `docs/design-guidelines.md` "Primary button"; `docs/ADR/003-frontend.md` §3 (form, i18n).

## Read
`app/src/components/case-form/case-form.tsx` (and its schema/validation it imports), `app/src/lib/i18n/pl.ts` (`form.labels.requiredMarker` already exists, currently used only for complaint description), `app/src/components/chat/chat-view.tsx` lines ~240–260 (Nowa sprawa AlertDialog), `app/src/components/ui/alert-dialog.tsx`, `app/src/components/ui/button.tsx`, existing tests under `app/tests/unit/` for the form and chat.

## Do (TDD: tests first, see them fail, then implement)
1. **AC-53:** append " (wymagane)" via `pl.form.labels.requiredMarker` to every required label: case type, category, model, purchase date, channel, complaint description, photo, consent. Return description keeps "(opcjonalnie)". Keep labels associated with controls (accessible names will now include the marker — update tests/E2E selectors that match exact label text, using regex or `exact: false`; check `app/tests/e2e/**` with grep for `getByLabel(` and fix only selectors, not assertions about behaviour).
2. **AC-54:** consent checkbox after Photo, unchecked by default, text and error from the PRD (put strings in `pl.ts`). Part of form validation (zod/react-hook-form, whatever the form uses): missing → error under checkbox, counted in the AC-15 all-errors/focus-first-invalid behaviour. Not sent to the server. Use a native `<input type="checkbox">` styled with existing tokens or an existing ui component — **no new packages**. Minimum 24×24 px hit target, keyboard operable. Form reset ("Nowa sprawa") clears it. E2E/helpers that submit the form must tick it — grep `app/tests/e2e` for the submit helper and add the tick there.
3. **AC-55:** in the Nowa sprawa dialog, `AlertDialogCancel` and `AlertDialogAction` render with the same button variant/size (outlined pill per design guidelines, same as the "Nowa sprawa" header button), equal width (e.g. footer grid with 2 equal columns ≥ sm, stacked full width below). Check other AlertDialogs in the app for the same issue.

## Verify (outputs to `app/var/formfix/*.log`)
`npm test`, `npm run lint`, `npm run typecheck`, `npm run build` (all from `app/`, use `cd /home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11/app && <cmd> > var/formfix/<name>.log 2>&1`). Do not run Playwright E2E and do not start servers — the orchestrator does the visual check.

## Rules
Edit only `app/src/**`, `app/tests/**`. No git writes, no installs, never open/print/grep `.env`, never read or write outside the repository (no /tmp). Report spec contradictions instead of guessing.

## Final answer (≤ 15 lines)
Files changed, tests added (red → green), check counts (tests passed/skipped, lint, typecheck, build), any E2E selectors changed, open questions.
