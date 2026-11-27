# Report Q3.4 - accept policy section ranges from the decision LLM

## Changes
- `app/src/server/llm/citations.ts` (new): `expandCitedSection`, `normalizeCitedSections` (expands `§N ust. a–b`, `a-b`, `a, b`, `§N ust. a, §N ust. b`; trims; de-duplicates; unexpandable entries kept unchanged), `textCitesSection` (verbatim, or covered by a range/list for the same `§N`).
- `app/src/server/llm/decide.ts`: `generateDecision` applies `normalizeCitedSections` to the LLM output before `checkLlmOutcome` and validation.
- `app/src/server/templates/index.ts`: `validateFirstMessage` uses `textCitesSection`; all other rules unchanged.
- `app/tests/unit/llm/citations.test.ts` (new) and `app/tests/unit/templates/templates.test.ts` (new `validateFirstMessage section ranges` block): written red first (missing module and range/list cases failed), then green.
- `app/tests/integration/llm/llm.integration.test.ts`: range mutation removed; the return recording now replays unmodified.
- `app/tests/fixtures/captured/MUTATIONS.md`: the range row removed.

## Checks
- `npx vitest run tests/unit/llm tests/unit/templates tests/integration/llm`: 4 files, 55 tests passed.
- `npm run lint`: clean.
- `npm run typecheck`: clean (no errors in `src/components/chat` or `tests/unit/chat`).

## Limitation
`generateDecision` still parses output with `DecisionOutcomeSchema`, whose `citedSections` regex is `CITED_SECTION_REGEX`. A range placed inside `citedSections` (rather than in `messageMarkdown`) fails the SDK parse before normalization runs. Changing the schema would alter the request body that the captured recordings pin, so this was left as is. The current recording has ranges only in `messageMarkdown`, which the validator now handles.
