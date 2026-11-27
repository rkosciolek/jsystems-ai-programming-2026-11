# Brief T21a — independent read-only review

- **Task:** T21, issue #31. **Reviewer:** Luna via OpenCode, agent `plan` (read-only). You must not edit any file except the report below.
- Repo root `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`. Scope: the diff `git diff feat/prd-adr-plan...HEAD -- app/` (read-only git commands are allowed: `git diff`, `git log`, `git show`).

## Review against
- `docs/PRD.md` (AC-01…AC-52, §11), `docs/ADR/000…003` (incl. amendments), root `AGENTS.md` "Code Review Rules", `app/AGENTS.md`.

## Focus (priority order)
1. Security and secret handling: the API key never reaches the client bundle or any response; no provider/model names, stack traces or internal IDs in client-visible output (AC-47); `server-only` guards; log allowlist (no description/chat text/image in `var/*.jsonl`, TAC-07).
2. Authorization of decisions: the chat cannot tamper with the case context (index-0 rule, server-held `CaseRecord`); `revise_decision` cannot bypass `checkLlmOutcome`; prompt-injection handling.
3. Streaming and error paths: `/api/cases` NDJSON (abort, timeout vs Jev fallback, `case_aborted`), `/api/chat` masked errors, 404 expiry.
4. Correctness of the decision rules vs ADR-001 §3.3 and the policies.
5. Tests: mocks only from recordings, no weakened assertions.

## Output
Write `docs/.agents_brief/poc-implementation-plan-T21-review.report.md`: findings only for **newly introduced** defects, each with severity (blocker/major/minor), file:line, a **concrete failing scenario**, and evidence; mark unverified suspicions separately. Do not include style nits. Never open `.env` files. Never write outside that report file; never use /tmp.
