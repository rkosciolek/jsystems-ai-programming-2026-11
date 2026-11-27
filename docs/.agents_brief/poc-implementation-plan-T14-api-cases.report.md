# T14 report: `POST /api/cases` and the case pipeline

## Files (T14 scope, written by the earlier worker, not changed in this run)
- `app/src/app/api/cases/route.ts`
- `app/src/server/pipeline/index.ts`
- `app/tests/integration/cases/api-cases.integration.test.ts` (15 tests)
- `app/tests/fixtures/captured/MUTATIONS.md` (appended rows, see below)
- Logs: `app/var/t14-test.log`, `app/var/t14-lint.log`, `app/var/t14-typecheck.log`, `app/var/t14-build.log`

No source file was edited in this run. No git, no npm install, no servers, no `.env` opened.

## Checks (run in `app/`, in this order)
| Check | Command | Result |
|---|---|---|
| Tests | `npm test` | exit 0; 22 files, 410 tests passed (0 failed). The T14 integration file has 15 tests, all passing. |
| Lint | `npm run lint` | exit 0; no output |
| Typecheck | `npm run typecheck` | exit 0; route types generated, `tsc --noEmit` clean |
| Build | `npm run build` | exit 0; Next.js 16.4.6, compiled, TypeScript finished; routes `/`, `/_not-found`, `/api/cases` (dynamic) |

Pre-existing, out of T14 scope, not fixed: Vitest prints a `configLoader: 'native'` warning for `vitest.config.ts` (ESM in CJS) and a `vite-tsconfig-paths` deprecation notice. The test run also prints `case_decided` JSON lines to stdout from other suites. None of these fail a check.

## ADR-002 §8 and TAC mapping (`/api/cases` rows)
| Row / criterion | Test name (file: `api-cases.integration.test.ts` unless stated) | Status |
|---|---|---|
| Valid complaint submission (200, upload/analysis/decision/result, one log line) | `accepts laptop-1.png by content and streams fast-path progress before one result` | Covered. Needs a recording mutation to reach the fast path (see contradictions). |
| Field validation: missing model, 19-char description, future date → 400 | `returns exact Polish field errors for invalid input` | Covered |
| Field validation: empty description is valid | `tests/unit/domain/schemas.test.ts` "accepts an empty description" | Covered elsewhere, not in the route test |
| Oversize: file check (413 after `formData()`) | `rejects a photo over 10 MiB after reading multipart data` | Covered |
| Oversize: preflight (413, `formData()` never called) | `rejects an oversized Content-Length before request.formData() is called` | Covered |
| Wrong format (text named `fake.png` → 415) | `rejects text content named fake.png with 415` | Covered |
| Extension mismatch (JPEG named `.png`) accepted | `accepts a real JPEG whose filename and MIME type say PNG` | Covered |
| Resize (Unit, real photos) | `tests/unit/images.test.ts`: `resizes the longer edge of laptop-1 ... to exactly 2048`; `keeps an upright portrait photo with an EXIF block (phone-1) ...`; `returns JPEG output for every real photo, with no EXIF block` | Covered elsewhere (T08). No test for "small photos not upscaled" by name. |
| Timeout (`error timeout` within 1 s, no LLM request) | `times out a delayed Jev replay and does not call the LLM` | Covered. Timing differs from the brief (see contradictions). |
| Upstream: recorded Jev 4xx → LLM path | `falls back from a recorded Jev 401 to the recorded vision and decision calls` | Covered |
| Upstream: recorded LLM 4xx → `error upstream`, no provider text | `masks a recorded LLM 401 and never includes provider, model, or stack details` | Covered |
| Upstream: network `TypeError` | `maps network TypeErrors to upstream without leaking the error text` | Covered |
| Upstream: recorded Jev 4xx in fast-only | `treats Jev failure as upstream in fast-only mode` | Covered (extra) |
| Client abort → `case_aborted` | `logs client disconnect as case_aborted without persisting a case or emitting an error` | Covered |
| `llm-only` logs `shadowFastPathDecision` | `records the shadow fast-path decision in llm-only mode` | Covered |
| Non-POST → 405 | `returns 405 for non-POST requests` | Covered (extra) |
| Case ID (Unit) | `tests/unit/store-log/case-id.test.ts` (format, Warsaw date, collision retry) | Covered elsewhere |
| Store TTL/cap; Store TTL from env | `tests/unit/store-log/case-store.test.ts`; `tests/unit/domain/env.test.ts` | Covered elsewhere |
| Env (missing key named, threshold 1.5) | `tests/unit/domain/env.test.ts` | Covered elsewhere |
| Log privacy (sentinel `ZZ-SENTINEL-ZZ` absent from log) | Sentinel check inside `accepts laptop-1.png by content ...` (lines 103, 122) | Partial: success path only, not error paths |
| TAC-07 (no description in `decisions.jsonl`) | Same sentinel check as above; `tests/unit/store-log/decision-log.test.ts` uses the same sentinel | Partial, as above |
| TAC-002-01 event order, exactly one terminal event | Order checked in `accepts laptop-1.png ...`; only the last line is checked, not the count of terminal events | Partial |
| TAC-002-02 no stack, model ID, provider, `openrouter` | `masks a recorded LLM 401 ...`; `maps network TypeErrors ...` | Partial: timeout, 413, 415 bodies not checked |
| TAC-002-03 longer edge ≤ 2048, JPEG, no EXIF | `tests/unit/images.test.ts` | Covered elsewhere |
| TAC-002-04 real photo through `npm start`; 10 MB + 1 byte → 413 E2E | None in T14 | MISSING (E2E/manual QA, not run here) |
| TAC-002-05 no `formData()` / sharp past preflight | `rejects an oversized Content-Length before request.formData() is called` | Covered |
| Chat 404, Chat input limits, Chat stream | None found in `app/tests` | MISSING, but belongs to the chat route (T16), not `/api/cases` |

## Mutations (`app/tests/fixtures/captured/MUTATIONS.md`)
Tail rows used by T14 tests:
- `jev-complaint-laptop-1`, `answers.image_usable.noul`: `0.84 -> 0.5` (API pipeline integration, LLM fallback edge). Used by `routes a low-certainty Jev answer to the LLM ...`.
- `jev-complaint-laptop-1`, `answers.description_matches_photo.noul`: `0.57 -> 0.9` (API integration, fast path). Used by the fast-path, extension-mismatch and llm-only tests.

No new rows were added in this run. The file is already modified in the working tree from the earlier worker, and without git I could not confirm which rows were added by T14 versus earlier tasks.

## Contradictions and gaps
1. Timeout parameters: the brief says `CASE_TIMEOUT_MS=200` with a replay delayed by 500 ms. The test uses `CASE_TIMEOUT_MS=500` with a 1000 ms delay. The `< 1000 ms` assertion still holds.
2. Fast path vs ADR row: the ADR and brief say a valid complaint is replayed "from the recording" with zero LLM requests. The recording alone routes to the LLM. The test reaches the fast path only through the `description_matches_photo 0.57 -> 0.9` mutation. This needs to be stated in the ADR row or the brief.
3. The integration test uses `os.tmpdir()` (`/tmp` on this Linux host) for its temp `DECISION_LOG_PATH`. The brief asks for a temp path, not a specific one. The directory is removed after each test.
4. Gaps listed above: exactly-one-terminal-event check (TAC-002-01), provider-text checks on timeout, 413 and 415 bodies (TAC-002-02), log privacy on error paths, and TAC-002-04 E2E.
5. Chat rows of ADR-002 §8 (404, input limits, stream) have no test yet. They belong to T16.
