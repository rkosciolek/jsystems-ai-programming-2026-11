# T18 integration check (issue #28)

Run 2026-11-26 in `app/` on `feat/poc-app`, ports 3601-3603 (production build), synthetic data only. Logs and NDJSON responses: `app/var/t18/` (gitignored scratch). Standard: ADR-000 §10, TAC-01…TAC-05 and TAC-07.

**Verdict: PARTIAL.** Checks 1-4, 6 and 7 pass, with one defect (T18.1, low). Check 5 (TAC-04 fail-fast) was not run: the permission system denied the startup command, so it is unverified.

## 1. Build and tests (TAC-01)

| Check | Result |
|---|---|
| `npm run lint` | pass, exit 0, 0 errors, 0 warnings |
| `npm run typecheck` (`next typegen` + `tsc --noEmit`) | pass, exit 0 |
| `npm test` | 27 files passed (27), 479 tests passed (479), 0 skipped, exit 0 |
| `npm run build` | pass, exit 0; routes `/`, `/_not-found` (static), `/api/cases`, `/api/chat` (dynamic) |

## 2. Startup (production `next start`, real `.env` via `--env-file`, not read by the agent)

| Port | Mode | Log | Ready line |
|---|---|---|---|
| 3601 | fast-only | `app/var/t18/fast.jsonl` | `✓ Ready in 1418ms` |
| 3602 | llm-only | `app/var/t18/llm.jsonl` | `✓ Ready in 1438ms` |
| 3603 | auto | `app/var/t18/auto.jsonl` | `✓ Ready in 1402ms` |

Server output: `app/var/t18/server-360{1,2,3}.log`.

## 3. HTTP `/` (`fetch`, `app/var/t18/http-root.txt`)

| Port | Status | Content-Type | Body contains "OPENROUTER" |
|---|---|---|---|
| 3601 | 200 | text/html; charset=utf-8 | no |
| 3602 | 200 | text/html; charset=utf-8 | no |
| 3603 | 200 | text/html; charset=utf-8 | no |

## 4. One real multipart submission per mode (`app/var/t18/submit.mjs`, summary in `submit-summary.txt`)

Input: complaint, category `laptop`, model `Dell XPS 13`, purchase date 2026-03-26 (8 months back), channel `online`, 60-char Polish description, `assets/example-images/laptop-1.png`. The first run used a 73-char description by mistake and was replaced by a 60-char rerun; the first run's cases are logged but not used.

| Mode | HTTP | Event order | caseId | Decision | Log `path` | Log `models` | Log `gateFailedAt` / `reasons` |
|---|---|---|---|---|---|---|---|
| fast | 200 | upload > analysis > decision > result | HSD-20261126-SDHJ | rejected | fast | classifier only; vision null, decision null | null / `user_caused_damage` |
| llm | 200 | upload > analysis > decision > result | HSD-20261126-IDF9 | rejected | llm | classifier, vision `openai/gpt-6-luna`, decision `openai/gpt-6-luna` | null / `decision_mode_llm_only` |
| auto | 200 | upload > analysis > decision > result | HSD-20261126-E9Z9 | rejected | fast | classifier only | null / `user_caused_damage` (consistent with no gate failure) |

Each stream has exactly one `result`. The `llm` run first returned `needs_info` and the rerun returned `rejected`. The verdict is model-dependent, so this is not a defect.

## 5. Missing-key fail-fast (TAC-04): NOT RUN

Port 3604, `OPENROUTER_API_KEY` unset, no `--env-file`. The Bash call that would start the server was denied by the permission system, and the agent did not retry it in another form. Status: unverified. Re-run manually: `env -u OPENROUTER_API_KEY node node_modules/.bin/next start -p 3604` from `app/`, then check that stderr names `OPENROUTER_API_KEY` and not its value.

## 6. Grep checks

| Check | Result |
|---|---|
| Inline OpenRouter/Jev response bodies in `tests/` (`"choices"`, `"answers"`) | Only type declarations and helpers that read `tests/fixtures/captured`. One inline SSE chunk in `tests/integration/chat/chat-revisions.integration.test.ts:147` (`textBeforeToolVariant`) is a partial chunk derived from the captured stream. It is the declared mutation `llm-chat-tool-step1` in `tests/fixtures/captured/MUTATIONS.md`, so it is accepted. |
| `localStorage` / `sessionStorage` in `src/` | none |
| `server-only` import in `src/server/**/*.ts` (non-prompt files) | **FAIL, T18.1**: `src/server/llm/citations.ts` has no `server-only` import. The other `.ts` files pass. Both quote styles were checked. |
| `.md` files under `src/server` | 5, all in `src/server/prompts/` (excluded from the rule) |
| TAC-07: description text in `var/t18/*.jsonl` (`działać`, `zwrot kosztów`, `trzech tygodniach`, `Laptop po`) | 0 matches in all three logs. Each log holds 2 lines (the case event plus the one from the first run) and no description text. |

## Defects

- **T18.1 (low, not fixed; app files are not edited in T18).** `app/src/server/llm/citations.ts` lacks `import "server-only"`, which breaks the rule that every `src/server/**/*.ts` file has it. The module is pure (section-range expansion), its importers `src/server/llm/decide.ts` and `src/server/templates/index.ts` are server-only, and no client code imports it, so there is no leak today. Fix: add `import "server-only";` as line 1. Owner: the backend owner.

## Stopped

Ports 3601-3603 stopped (PIDs 522897, 522899, 522901, `next-server`). Afterwards `fetch` to each port fails. Nothing was left running.
