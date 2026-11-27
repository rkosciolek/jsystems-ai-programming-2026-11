# Brief T08 — case store, decision log, case ID

- **Task:** T08, issue #17. Concurrent: T05, T06, T12. Disjoint files.
- **Worker:** Haiku subagent. Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
`docs/ADR/002-backend-api.md` §3.1 "Case ID", §3.4, §3.5, §8 rows "Case ID", "Store TTL/cap", "Store TTL from env", "Log privacy"; `docs/ADR/000-main-architecture.md` §5 (`CaseRecord`, DecisionLogEntry allowlist), TAC-07; contracts in `app/src/lib/domain/**` (`LOG_FIELDS`, `DecisionLogEntry`, `CASE_ID_REGEX`) and `app/src/server/env`; `app/AGENTS.md`.

## Contract (every file starts with `import 'server-only'`)
- `server/case-id/index.ts`: `generateCaseId(now: Date, exists: (id: string) => boolean): string` — `HSD-` + Europe/Warsaw date `YYYYMMDD` + `-` + 4 chars `[A-Z0-9]` via `crypto.randomInt`; retries on collision.
- `server/case-store/index.ts`: `createCaseStore({ ttlMs, maxRecords = 500, now = Date.now })` → `{ create(record), get(caseId), update(caseId, fn), size(), clear() }`; TTL since last access, lazy sweep on get/set, eviction of the oldest by lastAccess; `getCaseStore()` singleton on `globalThis` using `getEnv().CASE_TTL_MS`. Record type `CaseRecord` defined here per ADR-000 §5 (use domain types; `classifier` and `imageAnalysis` typed as `unknown` for now — T07/T13 narrow them later).
- `server/decision-log/index.ts`: `serializeLogEntry(entry: Record<string, unknown>): string` copies only `LOG_FIELDS`; `logDecision(entry, path = getEnv().DECISION_LOG_PATH)` writes to stdout and appends a line (mkdir -p; async; errors to stderr, never thrown).

## Editable files
`app/src/server/case-store/**`, `app/src/server/decision-log/**`, `app/src/server/case-id/**`, `app/tests/unit/store-log/**`.

## Steps
1. Tests first: case-ID format with fixed clock 2026-11-25 and collision retry; store TTL with fake timers (`ttlMs` 1000), access refreshes TTL, 501 inserts evict the oldest; serializer drops unknown fields and a description containing `ZZ-SENTINEL-ZZ`; logger appends to a temp file and survives an unwritable path. Red → record.
2. Implement; tests, lint, typecheck green.

## Tool guidance (plan §4.2)
`--help` → Context7 → web last. npm only, never install. No git. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-T08-store-log-id.report.md`; final answer ≤ 10 lines.
