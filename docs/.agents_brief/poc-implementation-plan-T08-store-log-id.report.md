# T08 report: case store, decision log, case ID

Brief: `docs/.agents_brief/poc-implementation-plan-T08-store-log-id.md` (issue #17).

## Files
- `app/src/server/case-id/index.ts`: `generateCaseId(now, exists)`, Warsaw date via `todayInWarsaw` from `@/lib/domain`, suffix via `crypto.randomInt`, retry on collision.
- `app/src/server/case-store/index.ts`: `createCaseStore`, `CaseRecord`, `CaseRevision`, `getCaseStore` singleton on `globalThis`.
- `app/src/server/decision-log/index.ts`: `serializeLogEntry`, `logDecision`.
- `app/tests/unit/store-log/case-id.test.ts`, `case-store.test.ts`, `decision-log.test.ts`.

## TDD record
- Red: all three test files failed on import (`Cannot find package '@/server/case-id' / '@/server/case-store' / '@/server/decision-log'`).
- Green: `npx vitest run tests/unit/store-log` gives 3 files, 14 tests passed.

## Verification
- Tests: 14/14 passed.
- Lint (`eslint` on my folders): clean.
- Typecheck (`tsc --noEmit`): clean for my files. One pre-existing error in `tests/unit/case-form/case-form.test.tsx(329,12)` belongs to another worker's folder; ignored per instructions.
- Did not open any `.env` file, did not run `npm install`, did not use git.

## Decisions and deviations from the brief
- `generateCaseId` has a 100-attempt guard, then throws. The brief did not specify a bound.
- `CaseStore.update(caseId, fn)`: `fn` receives the current record and returns its replacement. Returns the new record, or `undefined` if the record is missing or expired. Counts as an access (refreshes TTL).
- Expiry: a record is expired when idle time is `>= ttlMs`. `size()` sweeps but does not refresh TTL; `get`/`update` refresh it.
- `logDecision(entry, path?)`: the default path (`getEnv().DECISION_LOG_PATH`) is resolved inside the `try`, so an env error cannot throw from the logger. The brief's signature had it as a default parameter, which would throw synchronously.
- `logDecision` writes the line to stdout, then `mkdir -p` and `appendFile`. Errors go to stderr; nothing is thrown.
- Types: `entry` is `Record<string, unknown>` (per brief). ADR-002 §3.5 names `DecisionLogEntry`; that is a possible later tightening.

## Contradictions and open items
- ADR-002 §8 lists "Log privacy" (sentinel `ZZ-SENTINEL-ZZ`) as an **Integration** test. The brief asks for a unit test. I wrote unit coverage only. The integration check (grep of `decisions.jsonl` after the integration suite, TAC-07) still needs to be added by whoever owns the integration suite.
- ADR-002 §3.5 method name is `log(entry)`; the brief uses `logDecision(entry, path)`. I followed the brief.
- "Store TTL from env" (`CASE_TTL_MS=500` rejected) is already enforced by `server/env` (min 1000). Not covered by these tests; it belongs to the env test.
- `CaseRecord.classifier` and `imageAnalysis` are `unknown` until T07/T13 narrow them, as the brief says.
