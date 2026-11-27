# Report T04 (implementation)

Files created: `app/src/lib/domain/index.ts`, `app/src/lib/i18n/pl.ts`, `app/src/server/env/index.ts`. No tests edited.

Orchestrator decisions applied: DecisionOutcome per ADR-001 section 4; `DAMAGE_CAUSES` exported and used for `probableCause`; `makeReviseDecisionInputSchema(today)` plus date-unbounded `ReviseDecisionInputSchema`; `LLM_MODEL` required; `EnvError` exported (lists variable names only).

Notes:
- `LOG_FIELDS` is derived from `DecisionLogEntrySchema.shape` keys, so it cannot drift from the schema. Unknown keys (e.g. `description`) are stripped by Zod.
- `LLM_REASONING_EFFORT` enum is `minimal|low|medium|high` (ADR does not list values).
- Description over 2000 chars for a complaint yields the AC-07 message (test requires it); for a return it yields `pl.errors.descriptionTooLong`.

Checks (in `app/`):
- `npm test`: pass, 4 files, 170 tests passed.
- `npm run lint`: pass, 0 errors, 1 pre-existing-in-tests warning (`_omit` unused in `tests/unit/domain/schemas.test.ts:247`; test file not editable).
- `npm run typecheck`: pass.
- `npm run build`: pass (compiled, TypeScript finished, 4 static pages).

Contradictions between tests and ADR/PRD: none found.
