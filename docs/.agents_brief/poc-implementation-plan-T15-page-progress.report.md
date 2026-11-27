# T15 report: page state machine, NDJSON client, progress screen, temporary first-message view

## Result
- `npx vitest run tests/unit/page-state`: 66 tests pass (5 files). Red was recorded first (modules missing).
- `npm run lint`: 0 errors. Lint of my paths is clean. Two warnings are in another worker's files (`tests/integration/llm/llm.integration.test.ts`, `tests/unit/llm/llm.test.ts`, unused variables).
- `npm run typecheck`: no errors in my files. The only errors are in `tests/integration/llm` and `tests/unit/llm`, which import `@/server/llm/analyze-image` and `@/server/llm/decide` (not yet present). That is the concurrent backend worker's folder.
- `npm run build`: passes (compiled, TypeScript, static pages).
- Manual QA (Playwright, screenshots) was not run; the brief does not ask for it. The app was not started in a browser.

## Files (all inside the brief's editable list)
- `app/src/lib/client/submit-case.ts`: `ValidationError`, `parseNdjson`, `submitCase`.
- `app/src/app/page-state.ts`: `PageState`, `PageAction`, `pageReducer`, `initialPageState`.
- `app/src/app/page.tsx`: client component wiring the states, 95 s timeout, `beforeunload` in chat only, thumbnail URL lifecycle.
- `app/src/components/progress/{index.ts,analysis-progress.tsx}`: `AnalysisProgress`.
- `app/src/components/first-message-view/{index.ts,first-message-view.tsx}`: `FirstMessageView` (temporary, T17 replaces it).
- `app/tests/unit/page-state/`: `submit-case.test.ts`, `page-state.test.ts`, `progress.test.tsx`, `first-message-view.test.tsx`, `page.test.tsx`.

## Contradictions and deviations (please review)
1. **Duplicate heading on the form screen.** `CaseForm` renders its own `<h1>{pl.form.title}</h1>`. The page now also renders `pl.form.title` as `<h1>` above it, as the orchestrator note asked. Two identical h1s result. Fix in T12 (remove the h1 from CaseForm) or drop the page's h1. `case-form` is not in my editable list, so I did not change it.
2. **Missing i18n string.** `pl.ts` has no "Anuluj". `FirstMessageView` uses the literal `Anuluj` for the AlertDialog cancel button. Move it to `pl.ts` (`chat.cancel`) and update the component.
3. **No runtime import of `case-form`.** `case-form.tsx` was mid-edit and failed to parse during my run, so `page-state.ts` uses only a type import from it. The empty draft literal is inlined. `page.test.tsx` mocks `@/components/case-form`.
4. **Thumbnail URL owned by the page, not the progress component.** A `useEffect` that calls `setState` triggers lint error `react-hooks/set-state-in-effect`. The page creates the object URL on submit, passes it to `AnalysisProgress` as `thumbnailUrl`, moves it into chat state on `result`, and revokes it otherwise.
5. **Added behaviour not in the brief.** `submitCase` yields `{type:'error', code:'internal'}` if the stream ends without `result` or `error`, so the page cannot hang in progress.
6. **Network failure** rejects from `submitCase` (not an event). The page treats any thrown non-`ValidationError` as a service error.
7. **`firstMessage` type** in chat state is the zod-inferred type from `CaseEventSchema`, not `CaseUIMessage`, so the temporary view does not depend on `ai`. T17 may convert it.
8. **Escalated icon:** `UserRound`. ADR-003 says "user-arrow" and I found no exact lucide match, so I picked the nearest icon.
9. **Streamdown Tailwind source is missing.** `app/src/app/globals.css` has no `@source` line. Add this line (path relative to `globals.css`): `@source "../../node_modules/streamdown/dist/*.js";`
10. One dialog test in `first-message-view.test.tsx` has a 15 s timeout. It took 5.3 s under load from concurrent workers. It passes alone.
11. `tests/unit/page-state/progress.test.tsx` changed on disk during my run (not by me). I kept the current version. All its tests pass.
