# T04 report: contract tests (red)

## Test files
- `app/tests/unit/domain/schemas.test.ts`: 96 tests (63 plain and 33 from it.each). Enums and order, CATEGORIES, DECISION_LABELS, todayInWarsaw, makeCaseInputSchema boundaries, CITED_SECTION_REGEX, CASE_ID_REGEX, DateFactsSchema, ImageAnalysisSchema, DecisionOutcomeSchema, ReviseDecisionInputSchema, CaseSummarySchema, DecisionDataSchema, CaseEventSchema, LOG_FIELDS and DecisionLogEntrySchema.
- `app/tests/unit/domain/pl.test.ts`: 5 plain tests plus 46 parameterized PRD strings. appName, AC-25 disclaimer, form title, AC-04/AC-07 messages, no internal names in errors (AC-47), and 46 PRD UI strings checked verbatim in `JSON.stringify(pl)` (TAC-003-04).
- `app/tests/unit/domain/env.test.ts`: 22 tests (16 plain and 6 from it.each). ADR-000 section 7 defaults, DECISION_MODE enum, threshold range, CASE_TTL_MS range, missing and invalid variable names without values, getEnv caching.

Total: 169 expanded test cases in 3 files (96 + 51 + 22). `vitest list` prints it.each templates once, so its line count (98) is not the test count.

## Red output
`npm test` in `app/`:

    Test Files  3 failed | 1 passed (4)
    Tests  1 passed (1)

Domain-only run (`npx vitest run tests/unit/domain`): `Test Files  3 failed (3)` and `Tests  no tests`.

The 3 failed files are the new domain suites, each failing at import with "Cannot find module" for `src/lib/domain`, `src/lib/i18n/pl` and `src/server/env`. The 1 passed test is `tests/unit/app-header.test.tsx` (T11, another worker). No test in the new files ran, because the suites fail at collection.

## Assumptions the implementation must match
- Env result keys use the variable names in SCREAMING_CASE (e.g. `env.LLM_MODEL`); the brief does not fix property names.
- `EnvError` is exported from `src/server/env` and its message names variables only.
- `LLM_MODEL` is treated as required (ADR-000 section 7 and TAC-04), in addition to `OPENROUTER_API_KEY`.
- Schema error messages are the literal PRD strings, so tests check message text, not `pl` key names.
- `DecisionOutcomeSchema` is tested with the full ADR-001 shape (`reasonCodes`, `messageMarkdown` included).
- `DecisionLogEntrySchema` must reject or strip a `description` field.

## Contradictions and gaps
1. `docs/plans/poc-implementation-plan.md` T15 says "95 s timeout", but PRD section 4.7 and section 8, ADR-002 section 4 and AC-30 use 90 s. Not tested; the plan should be corrected.
2. ADR-000 section 7 marks `LLM_MODEL` as required, but the brief's env contract does not list it. Tested as required.
3. ADR-001 section 4 says `damage.probableCause` uses "the same enum as Jev damage_cause", but that enum is not defined in the sections read. The test does not pin its values.
4. The brief's `DecisionOutcomeSchema` omits `reasonCodes` and `messageMarkdown`, which ADR-001 section 4 includes. Tests follow the ADR.
5. `ReviseDecisionInputSchema` corrections require `purchaseDate` ≤ today (ADR-001 section 3.7), but the brief's contract has no `today` parameter for it. Not tested.
6. No PRD string exists for a description over 2000 characters or for invalid enum choices. Those tests check only that validation fails.
