# Brief Q3.x — description/photo question and prompt refresh, with re-recording

- **Tasks:** Q3.1 (issue #24) and the MQ3.2 prompt refresh. Concurrent: T17 (chat UI) and T19 (e2e specs) — other folders.
- **Worker:** Sonnet subagent (real API calls). Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Context
- `docs/plans/qa/Q3/README.md` Q3.1: with a normal return reason (e.g. "Nie podoba mi się brzmienie"), real Jev answers `description_matches_photo = false`, so every in-window return with a reason ends `needs_info` (rows R3b / C3b). A reason that does not describe the device's appearance is not a mismatch.
- The orchestrator already edited `app/src/server/prompts/decision-complaint.md` and `decision-return.md` (Polish labels, DD.MM.RRRR, no invented symptoms). Their hashes changed, so the decision recordings are stale.

## Do
1. **Q3.1:** in `app/src/server/classifier/questions.ts` reword `description_matches_photo` (keep the ID, type `noul`, and semantics "true = consistent") so that Jev answers **false only when the description states something about the device's visible condition that the photo clearly contradicts** (e.g. the description says the screen is cracked and the photo shows an intact screen, or it names a different device). Descriptions that give a reason, a symptom invisible on a photo (flickering, battery), or nothing about appearance → true. Keep the instructions self-contained and in English.
2. Verify with real Jev before re-recording (small ad-hoc calls through the capture tooling): `phone-1.jpg` return with "Nie podoba mi się brzmienie, chcę oddać." → true with certainty ≥ 0.8; `laptop-1.png` complaint with "Ekran migocze od tygodnia." → true; `laptop-1.png` complaint with "Laptop jest nowy, bez żadnych uszkodzeń, ale nie włącza się." (if the photo shows visible damage) → expected false — record what Jev actually answers; do not tune wording more than 3 times. Report the answers.
3. Re-record with `CAPTURE_ONLY=<name> npm run capture` **only**: `jev-complaint-laptop-1`, `jev-complaint-laptop-2`, `jev-return-phone-1`, `jev-return-phone-3`, `llm-decision-complaint-laptop-1`, `llm-decision-return-phone-1` (do not use `all`). Same secrets rules as before (never open `.env`; strip auth; grep for `sk-or-` and `user_id`, redact and declare in `MUTATIONS.md`).
4. Update tests that depend on the changed recordings (mutation paths in `MUTATIONS.md` and in tests under `app/tests/**` that target these recordings, the freshness hashes). Do not weaken assertions; if a test asserted a value that the new real recording no longer has, keep the intent via a declared mutation.
5. `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` green (report if failures come from the T17/T19 folders: `app/src/components/chat`, `app/tests/unit/chat`, `app/tests/e2e`).

## Editable files
`app/src/server/classifier/questions.ts`, `app/tests/fixtures/captured/**`, `app/tests/unit/**` and `app/tests/integration/**` (only tests bound to the re-recorded files), `app/scripts/capture/**` (only if needed).

## Rules
`--help` → Context7 → official docs last. npm only, never install. No git writes (git checkout/restore not allowed either). Scratch output only under `app/var/`.

## Report
`docs/.agents_brief/poc-implementation-plan-Q3-fixes.report.md`: new question text, the verification answers, recordings refreshed, tests changed (why), check results. Final answer ≤ 12 lines.
