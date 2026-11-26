# T07 — Jev classifier client implementation report

## Files changed

- `app/src/server/classifier/index.ts` — server-only Jev client, Zod response validation, normalization, image resizing, HTTP/network/abort handling.
- `app/tests/helpers/replay-fetch.ts` — captured exchange loader, status/header/body replay with original chunks, request recording, delay/network fault options, and recorded-response mutations.
- `app/tests/unit/classifier/classifier.test.ts` — replay-backed mapping, request, freshness, error, and abort coverage.
- `app/tests/fixtures/captured/MUTATIONS.md` — declared three T07 response mutations.

Question text in `app/src/server/classifier/questions.ts` was not changed.

## TDD and test results

- **Red:** before the client existed, the first targeted test run failed while importing the missing `@/server/classifier` module; Vitest collected 0 tests. This recorded the absent implementation, but did not execute assertion-level red cases.
- **Green, T07 scope:** `npm test -- --no-file-parallelism --testTimeout=30000 tests/unit/classifier/classifier.test.ts` — **14 passed, 0 failed, 0 skipped**. Coverage includes complaint/return noul, choice and score mappings; `p = 0.5`; probability versus `confidence`; request body and JPEG data URL; the 1568 px bound; omitted purchase date and empty-return-description question; both freshness hashes; invalid response; recorded HTTP 400/401; network `TypeError`; abort propagation; and real-response extra fields.
- **Full suite:** `npm test -- --no-file-parallelism --testTimeout=30000` — **312 passed, 2 failed, 0 skipped** (314 tests). Both failures are in the existing `tests/unit/templates/templates.test.ts`, asserting the damaged-return recommendation matches `/reklamację/`; the rendered strings use a different inflection. The classifier file passed in this run.
- An earlier default-parallel full run exceeded the command time limit under worker contention; the serial run above is the complete result.

## Other checks

- `npm run lint` — passed with 0 errors and 0 warnings on the final run.
- `npm run typecheck` — **blocked** by the existing unresolved import `@/server/templates` in `tests/unit/templates/templates.test.ts:6`. Route type generation succeeded; TypeScript reported no T07-file errors before stopping on that import.
- Manual QA / browser screenshots were not performed. The implementation was exercised through real captured Jev exchanges; an actual form submission would make a live external model request, outside this replay-only task scope.

## Mutations added

1. `jev-complaint-laptop-1`, `answers.image_usable.noul`: `0.84` → `0.5` — inclusive noul boundary.
2. `jev-complaint-laptop-1`, `answers`: object → field removed — invalid-response handling.
3. `jev-complaint-laptop-1`, `answers.device_category.confidence`: `1` → `0.02` — verifies certainty comes from the selected probability and `raw` retains confidence.

The unmodified question hashes match the captures:

- `jev-complaint-laptop-1`: `65fe294a65319aaa381745db28d55013727a6a0bdebc194e20d400f42aa1a1cc`
- `jev-return-phone-1`: `c823faa30c1e101e6e8f7943060832f5c8ef1722f5ffddf804250bbbc4f7fa15`

## Contradictions / blockers

- The brief requests green `typecheck`, but the checkout already references a missing `@/server/templates` module from an out-of-scope test file.
- The brief requests full tests green, but two existing template assertions fail independently of the T07 classifier tests. Those files were outside the authorized edit list and were left unchanged.
- No contradictions were found in the Jev normalization, request shape, image-size limit, or capture hashes reviewed for T07.
