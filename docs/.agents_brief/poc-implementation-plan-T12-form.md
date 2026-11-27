# Brief T12 — case form

- **Task:** T12, issue #9. Concurrent: P3 backend workers (T05/T06/T08) in `app/src/server/**` — disjoint.
- **Worker:** Luna (OpenCode). Repo root: `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Goal
A `CaseForm` component that satisfies PRD AC-01…AC-16 (client side) with react-hook-form + Zod, the photo drop zone with preview, the service-error banner and server field errors via `setError`.

## Read (sections only)
- `docs/PRD.md` §6 "Form" (AC-01…AC-16), §9.1 (all texts and layout).
- `docs/ADR/003-frontend.md` §3.2, §3.5 (buttons, colors), §3.6, §5 (`Draft`), §8 rows "Form field order", "Validation messages", "Photo handling".
- Contracts (do not edit): `app/src/lib/domain/**` (`makeCaseInputSchema`, `CATEGORIES`, `todayInWarsaw`, types), `app/src/lib/i18n/pl.ts` (every string comes from here; if a string is missing, list it in the report instead of hard-coding it).
- UI primitives: `app/src/components/ui/*` (shadcn, already brand-styled; outlined-pill `Button`).
- `app/AGENTS.md`.

## Public API (the page T15 depends on this — keep it exactly)
`app/src/components/case-form/index.ts` exports:
- `type Draft = { caseType?: 'complaint'|'return'; category?: CategoryId; model: string; purchaseDate: string; channel?: 'online'|'store'; description: string; photo?: File }` and `emptyDraft(): Draft`.
- `CaseForm` props: `{ initialDraft: Draft; serverFieldErrors?: Partial<Record<keyof Draft, string>>; serviceError?: boolean; onSubmit(draft: Draft): void; onRetry?(draft: Draft): void; disabled?: boolean }`. `onSubmit` is called only with a valid draft; `onRetry` is the banner's "Spróbuj ponownie".
- `MAX_PHOTO_BYTES = 10 * 1024 * 1024`.

## Behaviour checklist
- Field order and controls per ADR-003 §3.2 table; no preselection; case-type tiles as an accessible radio group with subtitles.
- Mode `onTouched`; AC-09; AC-15 (all errors, focus first invalid, summary "Popraw zaznaczone pola.", nothing sent).
- Photo: hidden input `accept="image/jpeg,image/png,image/webp"`, drop zone operable by keyboard (Enter/Space), drag-and-drop, client checks on `File.type` (empty type → extension), > 10 MB message, preview thumbnail (object URL, revoked on change/unmount), file name, size, "Usuń". Second file replaces the first.
- Description counter `N / 2000`; labels and placeholders switch with case type; `(opcjonalnie)` for return.
- `serverFieldErrors` applied with `setError` and focus on the first one; `serviceError` shows the `Alert` banner at the top with the PRD AC-45 text and "Spróbuj ponownie".
- Visible labels, `aria-invalid`, `aria-describedby` on errors.

## Editable files
`app/src/components/case-form/**`, `app/tests/unit/case-form/**`.

## Steps
1. RTL tests first (jsdom) for every Form AC (AC-01…AC-15, AC-09 switch case), photo handling and server errors. **Photos in tests:** read the real files from `assets/example-images/` with `fs` into `File` objects; for the > 10 MB and wrong-format cases a generated non-image payload is allowed (owner exception, ADR-000 TAC-08). Run → red; record the line.
2. Implement; `npm test`, `npm run lint`, `npm run typecheck` green. Do not render it in `page.tsx` (T15 does that).

## Tool guidance (plan §4.2)
1. `--help` → Context7 (`npx ctx7@latest library "react-hook-form" "setError shouldFocusError"`, `npx ctx7@latest library zod "superRefine"`) → web last.
2. Research questions you cannot answer: `opencode run -m opencode/deepseek-v4.1-flash-free --agent plan "<question>; answer with sources"`.
3. npm only; never install packages (ask in the report). No git. Edit only the listed files.
4. Upload tests use the real photos only, except the generated 413/415 payloads.
5. Report contradictions instead of resolving them.

## Report
`docs/.agents_brief/poc-implementation-plan-T12-form.report.md`: files, red/green lines with counts, lint/typecheck, missing `pl.ts` strings, contradictions.
