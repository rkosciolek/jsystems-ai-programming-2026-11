# Implementation Plan — Hardware Service Decision Copilot PoC (whole application)

> **Status: DRAFT, awaiting review by the repository owner.** This plan does not authorize execution, starting agents, pushing, publishing or merging.
> It supersedes the earlier slice-only draft, which has been removed.

**Date:** 2026-11-26
**Branch (planned):** `feat/poc-app`, stacked on `feat/design-system` (open PR #2). The PR targets `feat/design-system`, then is retargeted to `main` after PR #2 merges.
**Tracker:** the `Status` column of the [dependency matrix](#5-dependency-matrix-authoritative). GitHub issues are disabled. Only the orchestrator updates the column, in the commit that accepts a task.

**Sources of truth:**
- Product: [PRD](../PRD.md)
- Architecture:
  - [ADR-000 main](../ADR/000-main-architecture.md)
  - [ADR-001 decision pipeline](../ADR/001-ai-decision-pipeline.md)
  - [ADR-002 backend](../ADR/002-backend-api.md)
  - [ADR-003 frontend](../ADR/003-frontend.md)
- Design: [design-guidelines](../design-guidelines.md), [tokens](../../assets/design-tokens.json), [homepage reference](../../assets/homepage.png)
- Policies: [complaint](../policies/complaint-policy.md), [return](../policies/return-policy.md)
- Test photos and their rules: [example-images README](../../assets/example-images/README.md)
- Agent rules: [AGENTS.md](../../AGENTS.md), [CLAUDE.md](../../CLAUDE.md)

---

## 1. Scope

The whole PRD. Every acceptance criterion AC-01…AC-52 and every flow in PRD §4.1–§4.7 is in scope, on both decision paths (ADR-000 TD-03). Nothing from PRD §7 Out of Scope is built.

---

## 2. What exists today (inspected 2026-11-25/26)

| Item | Observed state |
|---|---|
| Branch | `feat/design-system`, 2 commits ahead of origin |
| Working tree | `M docs/PRD.md`; `?? docs/ADR/` (4 files); `?? docs/plans/`; `?? .agents/` (empty, unrelated, untouched) |
| `app/` | Only `README.md`: no `package.json`, no code, no tests, no entry points |
| Test photos | 5 real photos. `laptop-1.png` is **JPEG content with a `.png` name** (3024 × 3135, 1.2 MB). The rest are real WebP and JPEG photos (15–166 KB). There is no real photo near 10 MB. |
| Custom agent roles | None (`.claude/agents/` and `.codex/agents/` are absent) |

**Commands verified:**

| Command | Result |
|---|---|
| `node -v` / `npm -v` | 24.22.3 / 11.19.1 (no pnpm, bun or docker) |
| `opencode --version` | 1.19.0 |
| `opencode run --help` | Flags `-m`, `--agent`, `--dir`, `-f` (array), `--format json`, `--title`, `-s`, `--variant`, `--auto` |
| `opencode auth list` | OpenRouter credential present |
| `opencode models openrouter` | Lists `openrouter/openai/gpt-6-luna`; Jev is not listed (it is not a chat model) |
| **Smoke test** `opencode run -m openrouter/openai/gpt-6-luna --agent plan "<question>" -f assets/example-images/laptop-1.png` | ✅ Answered "laptop; screen cracked, impact point on the left", which matches the photo. **Luna image input works via OpenRouter.** Gotcha: `-f` is an array, so the message must come **before** `-f`, otherwise the message is parsed as a file name. |
| `gh auth status`, `gh pr list` | Logged in; PRs #1 and #2 open |

**Not verified (blocked):**
- **Jev (`typesafe/jev-1.14`).** It needs the app's `OPENROUTER_API_KEY`, and reading `.env` files is blocked in this session. Verified in T03 after T01.
- **Luna through the AI SDK provider with structured output.** Also T03.

**Baseline build / test / start:** **none exist yet**, so there is no baseline failure. All application commands are created and verified in T02.

---

## 3. Document review: consistency findings (2026-11-26)

### 3.1 Fixed in this revision (uncommitted, awaiting your approval in T00)

| # | Where | Problem | Fix |
|---|---|---|---|
| D1 | PRD AC-26 vs PRD §11.3 | A >24-month complaint was rejected unless a guarantee was mentioned, while §11.3 escalates on safety, legal or human requests | AC-26 now says any §11.3 escalation criterion wins (your decision); ADR-001 keeps C3 above C4 |
| D2 | PRD | No behaviour defined when the chat case has expired (server restart), although ADR-003 already had a UI text | Added **AC-52** |
| D3 | ADR-002 §3.1 | `caseId` was generated **after** the decision, but templates and the decision LLM need it (AC-41) | Generated at step 0 |
| D4 | ADR-001 §3.3 | A global "all answers confident" gate sent clear cases (e.g. unusable photo) to the LLM, because unrelated answers are naturally uncertain | **Row-level gate** with a *Req.* column; R8 (window expired) moved above R4–R7 |
| D5 | ADR-001 / PRD §11.3 | The fast path could not detect a description that contradicts the photo | New Jev question `description_matches_photo` → LLM path (your decision) |
| D6 | ADR-000/001 | E2E could not force each decision method with real models | New `DECISION_MODE=fast-only` (your decision) plus the **E2E server matrix** (ADR-000 §10) |
| D7 | ADR-001 §3.7 | The revision text could precede the tool call → a badge/text mismatch when the tool refuses | Tool-first ordering, plus a server guard and the log event `revision_order_violation` |
| D8 | ADR-001 §3.7 | "Replace the first assistant message" was ambiguous | Index 0 must match the stored `firstMessage.id`, otherwise `400` |
| D9 | ADR-002 §3.1 vs `laptop-1.png` | The upload check required MIME **and** magic bytes, which would reject the real JPEG-with-`.png` photo | The content decides; extension and MIME are ignored on the server |
| D10 | ADR-000/002 tests vs `example-images/README.md` | Tests planned generated images (alpha PNG, EXIF, 10 MB JPEG), which the README forbids | Real photos for every accepted upload; generated non-photo payloads only for 413/415 (your decision); TAC-08 and TAC-002-04 rewritten |
| D11 | ADR-000 TAC-05 vs AGENTS.md mock rule | Captures lacked HTTP status and headers | Verbatim status + headers + body + metadata |
| D12 | ADR-003 | A 404 could not be detected reliably from the `useChat` error | `fetch` wrapper on the transport (option to verify) with a stated fallback |
| D13 | ADR-003 TAC-003-02 | "optional" axe check, which is not verifiable | 0 serious/critical violations via `@axe-core/playwright` (added to T02 deps) |
| D14 | ADR-003 | "logo placeholder" left the agent unsure | Text wordmark; no image logo |
| D15 | ADR-000 §10 | PRD AC-49 lists 4 browsers; tests ran only Chromium | Chromium + Firefox in E2E; WebKit if it installs, otherwise reported as not verified |
| D16 | ADR-000 §5 / ADR-002 | Disconnect logged as `case_failed {aborted}`, a value outside the enum | Event `case_aborted` and field `failureCode` |
| D17 | ADR-000 TD-04 | Luna image input was marked UNVERIFIED | Smoke test result recorded; AI SDK path and Jev stay in T03 |

### 3.2 Agent-instruction problems: proposed edits, **not applied** (need your approval)

| # | File | Problem | Proposed edit |
|---|---|---|---|
| A1 | `AGENTS.md` | `assets/example-images/README.md` asks to be referenced from the root `AGENTS.md`, and it is not. Without this, workers will generate images and assert what the model "should" see. | Add under *TDD Rules*: "Upload tests use only the real photos in `assets/example-images/` and follow its README; generated payloads are allowed only for rejection tests; never assert what a model sees on a real photo." |
| A2 | `AGENTS.md` Test Strategy | "Integration: only external LLM API mocked". Jev is an external model API too. | Change to "Only external model APIs (LLMs and the Jev Decisions API)". |
| A3 | `AGENTS.md` Test Strategy | The `Who` column names roles (`be-dev`, `fe-dev`, `qa-engineer`) that do not exist ("no active custom roles") | Rename the column to "Typical owner", or remove the role names |
| A4 | `CLAUDE.md` and `AGENTS.md` | Context7 is MCP-only, but the MCP monthly quota was exhausted during research. Your global rule and the `write-adr` skill prefer the `ctx7` CLI. | Allow either: "Context7 MCP or `npx ctx7@latest` CLI (`library` → `docs`)" |
| A5 | (new) `app/AGENTS.md` | Must exist before workers start (ADR-000 TD-02 step 8) | Created in T02, kept short. Contents: AI SDK 7 only; AI Elements from ui.shadcn.com; npm scripts; `server-only`; env lives in `app/.env.local`; real-photos rule |
| A6 | `assets/example-images/README.md` | Says "pracownik wgrywa zdjęcie" (a staff member uploads), while the PRD is customer self-service | Informational only; course material, not changed |

### 3.3 Remaining risks that could leave an agent unsure (handled in the plan)

| Risk | Handling |
|---|---|
| The Jev request/response schema is only known from the docs; the full schema page was not read | T03 reads https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md and the multimodal-decisions guide, then captures real responses. The T07 brief embeds those captures. |
| AI Elements registry names on ui.shadcn.com are unverified | T02 resolves the names and records them in `app/AGENTS.md` |
| `create-next-app` negation flags are unverified | T02 runs `--help` first (ADR-000 TD-02) |
| The `opencode.json` permission syntax is unverified | T02 checks the OpenCode docs; until it is verified, workers run without `--auto` and the orchestrator inspects every diff |

---

## 4. Execution model

**Orchestrator: this Claude Code session.**
- Makes architecture decisions and resolves contradictions.
- Owns the shared contracts (`lib/domain`, `lib/i18n`), `package.json` and the lockfile, configs, `app/AGENTS.md`, prompts, integration, commits and the `Status` column.
- Compiles each brief just before dispatch, reads every diff, re-runs the checks, and accepts or rejects.

**Workers** (ad hoc only; no new role files):

| Worker | Mechanism (verified available) | Used for |
|---|---|---|
| Haiku | Claude Code `Agent` tool, `subagent_type: general-purpose`, `model: haiku`, prompt "Execute `.agent-briefs/<task>.md`" | Small, well-specified modules and test specs |
| Luna | OpenCode headless, `openrouter/openai/gpt-6-luna` (§9) | Logic-heavy modules, UI, independent review |

**Rules in every brief:**
- Write the failing behavioral test first and record red output.
- Implement the minimum, then go green.
- Edit only the listed files.
- No `npm install`, no git commands, no changes to the contracts.
- Use only the real photos for uploads.
- Report contradictions instead of resolving them.
- Write the report to `.agent-briefs/<task>.report.md`.

A worker never accepts its own work.

**Concurrency:**
- At most 3 workers at once, only on disjoint files.
- Each brief lists the concurrent tasks.
- One checkout; no worktree is needed.

**Briefs:**
- Live in `.agent-briefs/<task>.md` and contain:
  - contract and source excerpts;
  - predecessor outputs;
  - the exact editable files;
  - ordered steps;
  - test inputs and expected results;
  - PRD/ADR links.
- Committed with the accepted task; raw `*.log.jsonl` files are gitignored.

**Commits:**
- One per accepted task.
- Named paths only.
- Format `Area: summary` plus the session attribution lines.

---

## 5. Dependency matrix (authoritative)

All app commands run in `app/`. Every implementation row runs: failing test → implementation → the orchestrator reproduces the checks → commit.

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff | Status |
|---|---|---|---|---|---|---|---|
| **T00** Docs and branch | PRD/ADR fixes (§3.1), the approved A1–A4 edits and this plan are committed; branch `feat/poc-app` exists | §3 of this plan | **Your approval** of §3.1, §3.2 and this plan | Orchestrator | `docs/PRD.md`, `docs/ADR/*.md`, `docs/plans/poc-implementation-plan.md`, `AGENTS.md`, `CLAUDE.md` (only approved lines) | `git log -4`; `git status` shows only `.agents/`. Commits: `Docs: PRD and ADR consistency fixes`, `Docs: agent instruction fixes`, `Docs: PoC implementation plan` | todo |
| **T01** Key | `app/.env.local` contains `OPENROUTER_API_KEY` | ADR-000 §7 | T02 | **You** | `app/.env.local` (gitignored) | The orchestrator checks presence without printing the value | todo |
| **T02** Scaffold | Next 16 app; lint, typecheck, empty test run, build, start and `/` all work. All deps installed once (incl. `@axe-core/playwright`, Chromium, Firefox, WebKit attempt). shadcn components and AI Elements patterns added. `app/AGENTS.md`; `opencode.json` (syntax verified) | ADR-000 TD-02, §3; ADR-003 §2 | T00 | Orchestrator (lockfile and configs are serialized) | `app/**` scaffold, `package*.json`, configs, `app/AGENTS.md`, `app/.env.example`, `.gitignore` (`app/var/`, `.agent-briefs/*.log.jsonl`), `opencode.json` | `npx create-next-app@16.4.6 --help` first. Then `npm run lint`, `npm run typecheck`, `npm test` (`passWithNoTests`), `npm run build`; `npm start` + `curl -sI :3000` → 200 (startup recorded separately) + screenshot. Commit `App: scaffold Next.js 16, AI SDK 7, shadcn, Vitest, Playwright` | todo |
| **T03** Model gate and captures | Verbatim captures of real responses for: Jev complaint questions (`laptop-1.png`), Jev return questions (`phone-1.jpg`), Luna vision via AI SDK + `Output.object`, Luna decision, Luna chat stream with a tool call. TD-04 updated. | ADR-000 TD-04, TAC-05; ADR-001 §2; AGENTS.md mock rule | T01, T02 | Orchestrator | `app/scripts/capture/**`, `app/tests/fixtures/captured/**`, `docs/ADR/000-main-architecture.md` (TD-04 result) | Each capture has status, headers, body and metadata, with no secrets. Jev fails → **stop**, fallback F1. Luna + `Output.object` fails → set `VISION_MODEL` per TD-04 and record it. Commit `Test: captured Jev and Luna responses` | todo |
| **T04** Contracts | Enums, Zod schemas (`CaseInput` for both types, `CaseEvent`, `DecisionOutcome` + every reason code incl. `no_rule_matched`, `description_photo_mismatch`, `llm_inconsistent`; `CaseUIMessage`, `DecisionLogEntry` incl. `case_aborted`, `revision_order_violation`); `pl.ts` with every PRD string; `server/env` incl. `fast-only` | ADR-000 §5–§7; ADR-002 §3.6, §4; ADR-003 §4; PRD AC-04…AC-13, AC-45…AC-52 | T02 | Orchestrator writes; **Haiku** writes the tests first | `app/src/lib/domain/**`, `app/src/lib/i18n/pl.ts`, `app/src/server/env/**`, `app/tests/unit/domain/**` | Red → green; TAC-003-04 string test. Commit `Shared: domain contracts, Polish strings, env` | todo |
| **T05** Images | Content-based format check; ≤ 2048 px JPEG; no EXIF in the output | ADR-002 §3.1 (step 3), §3.3, TD-202; PRD AC-12, AC-17 | T04 | **Haiku** | `app/src/server/images/**`, `app/tests/unit/images.test.ts` | ADR-002 §8 rows *Resize*, *Extension mismatch*, *Wrong format*, using real photos only. Commit `Backend: image processing` | todo |
| **T06** Rules | `computeFacts`; row-level gate; complaint table C1–C8 and return table R1–R8; always-LLM list; `fast-only` and `llm-only` semantics; `checkLlmOutcome` for both types | ADR-001 §3.3, §3.6 (hard constraints), TD-101, TD-102; PRD AC-26…AC-29 | T04 | **Luna** | `app/src/server/rules/**`, `app/tests/unit/rules/**` | Every row and boundary (TAC-001-01); ADR-001 §8 rows *Row-level gate*, *fast-only*, *Escalation precedence*, *R8 order*; policy-constants test (TAC-001-05). Commit `Backend: decision rules` | todo |
| **T07** Jev client | Question sets per case type (incl. `description_matches_photo` only when the description is non-empty); HTTP client; schema derived from the captures; normalization; `ClassifierError` | ADR-001 §3.2, TD-105; ADR-002 §3.7 | T03, T04 | **Luna** | `app/src/server/classifier/**`, `app/tests/unit/classifier/**` | Mapping tests on the **captured** fixtures; no purchase date in the state. Commit `Backend: Jev classifier client` | todo |
| **T08** Store, log, ID | Store (TTL, cap, `globalThis`); allowlist JSONL logger; `HSD-` ID | ADR-002 §3.1, §3.4, §3.5; ADR-000 TD-05, TD-07, TAC-07; PRD AC-41 | T04 | **Haiku** | `app/src/server/case-store/**`, `app/src/server/decision-log/**`, `app/src/server/case-id/**`, `app/tests/unit/store-log/**` | TTL with fake timers, eviction, sentinel not logged, ID regex. Commit `Backend: case store, decision log, case ID` | todo |
| **T09a** Prompts | `vision-complaint`, `vision-return`, `decision-complaint`, `decision-return`, `chat` (incl. tool-first revision rules, PRD §11.4–§11.8) | ADR-001 §3.5–§3.8; PRD §11 | T04 | Orchestrator | `app/src/server/prompts/*.md` | Reviewed against PRD §11 line by line. Commit with T09b. | todo |
| **T09b** Loaders | Policy and prompt loaders with startup checks | ADR-001 §3.8; ADR-002 §3.6 | T09a | **Haiku** | `app/src/server/policies/**`, `app/src/server/prompts/index.ts`, `app/tests/unit/prompts/**` | TAC-001-04 (4 labels in every prompt); complaint prompt excludes the return policy and vice versa. Commit `Backend: prompts and policy loader` | todo |
| **T10** Templates | Polish first messages for every reason code of both tables plus `no_rule_matched`, `description_photo_mismatch`, `llm_inconsistent`; finalizer with exactly one disclaimer | ADR-001 §3.4, §3.6; PRD AC-23…AC-25, AC-28, §11.7–§11.8 | T04 | **Luna** | `app/src/server/templates/**`, `app/tests/unit/templates/**` | 6 headings in order; no "Pan/Pani"; diminished-value note for R5; `nearDeadline` note. Commit `Backend: first-message templates` | todo |
| **T11** Theme | Tokens → shadcn variables; Noto Sans `latin-ext`; wordmark header | ADR-003 §3.1, §3.5; design-guidelines (Colors, Typography, Spacing, Border radius, Logo placement) | T02 | **Haiku** | `app/src/app/globals.css`, `app/src/app/layout.tsx`, `app/src/components/app-header/**`, `app/tests/unit/app-header.test.tsx` | Render test + screenshot vs `assets/homepage.png`. Commit `Frontend: brand theme and header` | todo |
| **T12** Form | All 7 fields, both case types, drop zone and preview, all validation, focus on first error, server 400 mapping, service banner with retry | ADR-003 §3.2, TD-302; PRD AC-01…AC-16, §9.1 | T04, T11 | **Luna** | `app/src/components/case-form/**`, `app/tests/unit/case-form/**` | RTL tests for every Form AC. Commit `Frontend: case form` | todo |
| **T13** LLM layer | `analyzeImage` (both prompts); `decide` with one retry via `checkLlmOutcome`; `llm_inconsistent` fallback; `finalizeFirstMessage` | ADR-001 §3.5, §3.6, TD-103, TAC-001-03 | T03, T06, T09b, T10 | **Luna** | `app/src/server/llm/**` except `chat*` | `MockLanguageModelV4` from the captures; retry and violation tests for both case types. Commit `Backend: vision and decision LLM steps` | todo |
| **T14** `/api/cases` | Validation 400/413/415; NDJSON progress; `caseId` at step 0; all 3 modes; 90 s abort; store + log; `case_aborted`; `instrumentation.ts` | ADR-002 §3.1, §4, §5, TD-201, TD-203; ADR-000 TAC-04, TAC-08; PRD AC-30, AC-45, AC-47 | T05, T07, T08, T13 | **Luna**; orchestrator integrates | `app/src/app/api/cases/**`, `app/src/server/pipeline/**`, `app/src/instrumentation.ts`, `app/tests/integration/cases/**` | ADR-002 §8 integration rows (both types, all 3 modes). Commit `Backend: case submission endpoint` | todo |
| **T15** Page and progress | Reducer (all transitions incl. New case reset); NDJSON parser; progress screen; draft kept; 95 s timeout | ADR-003 §3.1, §3.3, TD-301; PRD §9.2, AC-16, AC-42, AC-45 | T04, T12 | **Haiku** | `app/src/app/page.tsx`, `app/src/components/progress/**`, `app/src/lib/client/submit-case.ts`, `app/tests/unit/page-state/**` | Split-chunk parser test; every transition. Commit `Frontend: page state and progress` | todo |
| **T16** `/api/chat` | Body validation (index-0 rule); 404; context rebuilt from the store; `revise_decision` (tool-first, hard-constraint recheck, server guard); `data-decision` part; disclaimer appended; masked errors | ADR-002 §3.2; ADR-001 §3.7, TD-104; ADR-000 TD-05; PRD AC-34…AC-38, AC-46, AC-52 | T08, T09b, T13 | **Luna** | `app/src/app/api/chat/**`, `app/src/server/llm/chat*.ts`, `app/tests/integration/chat/**` | Mock stream with tool call; same-decision no-op; text-before-tool guard; tampered first message → 400. Commit `Backend: chat endpoint with decision revision` | todo |
| **T17** Chat view | `useChat` seeded; AI Elements thread, message and prompt input; Streamdown; badge (data part > metadata); "Zmieniona ocena" chip; typing indicator; Ponów; 404 → AC-52; Nowa sprawa dialog; `beforeunload`; summary collapsible | ADR-003 §3.4, TD-301, TD-303; ADR-000 TD-06; PRD §9.3, AC-32…AC-44, AC-50, AC-52 | T15, T16 (contract), T02 | **Luna** | `app/src/components/chat/**`, `app/src/app/page.tsx` (chat branch, after T15), `app/tests/unit/chat/**` | ADR-003 §8 RTL rows. Commit `Frontend: chat view` | todo |
| **T18** Integration check | The whole app is green and starts with the real key | ADR-000 §10, TAC-01…TAC-04 | T14, T17 | Orchestrator | none (fixes go to the owning task) | Recorded **separately**: `npm run lint`, `npm run typecheck`, `npm test` (files/tests/skips counts), `npm run build`, `npm start` + `curl`, one real `curl -F` submission per mode (check the log) | todo |
| **T19** E2E (real stack) | E1–E10 from ADR-000 §10 pass on servers S1–S5; every endpoint, model and decision method is proven by the logs | ADR-000 §10 (E2E server matrix); PRD §4.1–§4.7 | T18 | **Haiku** writes the specs; orchestrator runs them | `app/tests/e2e/**`, `app/playwright.config.ts` (`webServer` array) | `npm run test:e2e` → per-project discovered/passed/skipped counts + the coverage table in §6 filled from the logs. Commit `Test: E2E real-stack suite` | todo |
| **T20** Manual QA | Every row of §7 done with `playwright-cli`; screenshots at 360 and 1920 px; brand comparison; keyboard-only run; console clean | AGENTS.md Manual QA; design-guidelines; ADR TACs listed in §7 | T19 | Orchestrator | `docs/plans/qa/*.png`, §13 of this plan | QA report in §13. Defects become T20.x tasks for the owning worker. Commit `Docs: PoC QA evidence` | todo |
| **T21** Independent review | (a) Luna via OpenCode with a read-only agent; (b) Claude `/code-review high` on `feat/design-system...HEAD` | AGENTS.md Code Review Rules | T20 | Luna + orchestrator | Fixes in the owning task's files only | Each finding is reproduced or rejected with a reason; T18 and T19 are re-run after fixes. Commits `Fix: …` | todo |
| **T22** PR | PR to `feat/design-system` with summary, links, evidence and the checks that actually ran | AGENTS.md Completion Criteria | T21 **and your go-ahead to push** | Orchestrator | none | `gh pr create`; no merge by the agent | todo |

---

## 6. Proof that every component is really exercised

Each component must appear in at least one **real-stack** check (E2E or manual) besides unit and integration tests. T19 fills the "Evidence" column from the per-server JSONL logs: path, `models`, events and `caseId`.

| Component / method | Unit / integration | E2E (server) | Manual QA (§7) | Evidence |
|---|---|---|---|---|
| `POST /api/cases`: validation 400/413/415 | T05, T14 | E8 (S1) | M2 | HTTP status in the spec |
| `POST /api/cases`: NDJSON progress + result | T14 | E1–E5 | M1, M3 | Progress steps visible in order |
| `POST /api/cases`: timeout | T14 | E6 (S4) | M8 | `case_failed failureCode=timeout` |
| `POST /api/cases`: upstream failure | T14 | E7 (S5) | M8 | `case_failed failureCode=upstream` |
| Image processing (sharp, content-based format) | T05 | E1 (`laptop-1.png` JPEG/.png), E3 (`.webp`) | M1 | Case decided |
| Jev classifier (both question sets) | T07 | E1, E2 (fast); E3, E4 (shadow) | M1, M3 | `classifierAnswers` present |
| Rules: complaint table | T06 | E1, E5 | M1 | `path=fast`, `reasonCodes` |
| Rules: return table | T06 | E2 | M3 | `path=fast`, `caseType=return` |
| Templates + finalizer | T10 | E1, E2 | M1, M3 | 6 headings + disclaimer in the DOM |
| Vision LLM (`VISION_MODEL`) | T13 | E3, E4 | M4 | `models.vision` in the log |
| Decision LLM (`LLM_MODEL`) + `checkLlmOutcome` | T13 | E3, E4 | M4 | `models.decision`, `path=llm` |
| `auto` routing (row-level gate) | T06, T14 | E5 (S3) | M5 | `minGatingCertainty`, `gateFailedAt` |
| `POST /api/chat`: streaming reply with case context | T16 | E1, E4 | M6 | Reply contains the purchase date |
| `revise_decision` + `data-decision` + badge | T16, T17 | E3 (invariant) | M7 | `decision_revised` ↔ badge ↔ "Zmieniona ocena" |
| Insisting without facts does not revise (AC-37) | T16 | E3 | M7 | No `decision_revised` |
| Chat failure + Ponów (AC-46) | T16, T17 | — (needs a mid-chat model failure; not reproducible without mocks) | **M9** | Error and Ponów visible; no duplicate message |
| Expired case 404 (AC-52) | T16, T17 | — (needs a server restart mid-chat) | **M10** | Expired text, input disabled |
| New case, reload, `beforeunload` | T15, T17 | E9 | M11 | DOM state |
| Brand, a11y, responsive | T11, T17 | E10 | M12 | Screenshots, axe report |

---

## 7. Manual QA script (T20, `playwright-cli`, real servers)

Every row produces screenshots and a log excerpt, saved in §13.

| ID | Server | Steps | Pass criteria |
|---|---|---|---|
| M1 | S1 (`fast-only`) | Complaint with each laptop photo | Fast path in the log; message structure; Polish text; badge |
| M2 | any | Every invalid input from AC-04…AC-15; non-image file; oversize payload | Exact messages; focus on the first invalid field |
| M3 | S1 | Return with each phone photo, store and online, at 5 / 20 / 40 days | Fast path; R-rows plausible for the dates; R5 note when present |
| M4 | S2 (`llm-only`) | One complaint + one return | `path=llm`; both LLM models logged; first message passes the structure checks |
| M5 | S3 (`auto`) | All 5 photos | Each route is explained by the gate fields in the log |
| M6 | S2 | Chat: ask about the date, the policy, an off-topic question, and volunteer personal data | Correct context; off-topic deflection; personal data not repeated (PRD §11.5–§11.6) |
| M7 | S2 | Chat: insist without facts; then give a policy-relevant fact | AC-36/AC-37 invariant; tool-first (no `revision_order_violation`) |
| M8 | S4, S5 | Submit a valid case | Banner; values kept; retry works after switching to S1 |
| M9 | Manual server: `fast-only` + `LLM_MODEL=invalid/does-not-exist` | Create a case (fast path, no LLM needed) → send a chat message | Inline error + **Ponów**; no duplicated user message |
| M10 | S1 | Open a chat → restart S1 → send a message | AC-52 text, input disabled, **Nowa sprawa** works |
| M11 | S1 | Nowa sprawa cancel/confirm; reload; keyboard-only full flow | AC-42…AC-44, AC-50 |
| M12 | S1 | 360 and 1920 px on all screens; compare with `assets/homepage.png` | No horizontal scroll; brand match (AGENTS.md Manual QA step 5) |

---

## 8. Critical path, waves and hotspots

**Critical path:** T00 → T02 → T01 → T03 → T07 → T13 → T14 → T16 → T17 → T18 → T19 → T20 → T21 → T22.

**Waves** (at most 3 workers; the orchestrator works alongside):

| Wave | Tasks running together |
|---|---|
| W1 (after T04) | T05 Haiku, T06 Luna, T08 Haiku; orchestrator: T09a |
| W2 | T07 Luna, T10 Luna, T11 Haiku |
| W3 | T12 Luna, T09b Haiku |
| W4 | T13 Luna, T15 Haiku |
| W5 | T14 Luna, T16 Luna (T16 adds only `llm/chat*.ts`) |
| W6 | T17 Luna; then T19 Haiku |

**Hotspots (serialized through the orchestrator):**
- `package*.json`: T02 only; any new dependency is a separate orchestrator commit.
- `lib/domain/**` and `lib/i18n/pl.ts`: T04 only; changes come as requests in worker reports.
- `page.tsx`: T15, then T17.
- `globals.css`: T11.
- Configs, `app/AGENTS.md`, `opencode.json`, `.gitignore` and this file: orchestrator only.

---

## 9. OpenCode headless — short instructions

1. **Pre-checks** (verified 2026-11-26): `opencode --version` → 1.19.0; `opencode auth list` → OpenRouter; `opencode models openrouter | grep gpt-6-luna`.
2. **Implementation task.** Run from the repo root, in the background through the Bash tool, one process per task. The message comes **before** `-f`:

   `opencode run -m openrouter/openai/gpt-6-luna --agent build --title "T06 rules" --format json "Execute the attached brief exactly. Edit only the files it lists. Write your report to .agent-briefs/T06-rules.report.md." -f .agent-briefs/T06-rules.md > .agent-briefs/T06-rules.log.jsonl 2>&1`
3. **Follow-up in the same context:** `opencode run -s <sessionID from the JSON log> -m openrouter/openai/gpt-6-luna "…"`.
4. **Review (T21):** `--agent plan`, with a brief naming the diff range.
   - In T02, confirm that `plan` cannot edit files or run write commands. If it can, add one read-only `reviewer` agent to `opencode.json`. This is a recurring role with tool restrictions, so it justifies a custom definition.
5. **Safety:**
   - Never pass `--auto`.
   - `opencode.json` denies `git commit*`, `git push*` and `npm install*` (syntax verified in T02).
   - Acceptance comes from the orchestrator's own `git diff -- <task files>` and re-run tests, never from the worker's log.

---

## 10. Failure, rollback and smaller fallbacks

**Worker failure:**
1. Reject the result.
2. Discard only the task's files (`git restore -- <files>`, then remove the task's new paths).
3. Retry once in the same session with a sharper brief.
4. On a second failure, the orchestrator takes the task over.

**Other failures:**
- **Contradiction found during execution:** stop the affected tasks, write a proposed ADR amendment and ask you.
- **T18 or T19 failure:** bisect by task commit; the fix goes to the owner.
- **OpenRouter unavailable or out of credit:** unit and integration work continues on the captures. T03, T19 and T20 are reported as **blocked**, not skipped.
- **OpenCode unavailable:** Luna rows go to Haiku or to the orchestrator, run sequentially; the matrix stays the same.
- **Rollback:** `git revert <commit>`; no history rewriting.

**Smaller fallbacks** (each needs a proposed ADR amendment before use):
- **F1: Jev fails the T03 gate.** `DECISION_MODE=llm-only` becomes the only mode, and T07 is reduced to a stub. E1, E2 and M1 move to S2.
- **F2: revision out of time.** Drop `revise_decision`; AC-36 and AC-37 are deferred.
- **F3: minimum demo.** Both case types with the first message and the chat reply, without the E2E matrix beyond E1, E3 and E8.

---

## 11. Unresolved decisions (before T00)

1. Approve the §3.1 document fixes, the new AC-52 and the amended AC-26.
2. Approve the §3.2 agent-instruction edits A1–A4, or say which to skip.
3. Commit the agent briefs and reports with each task (planned), or keep them gitignored?
4. E2E token budget: about 10 Jev calls plus about 14 Luna calls per full run. Acceptable?
5. Can you supply a real photo close to 10 MB? Without one, the "near-limit upload accepted" check stays **not verified** (ADR-002 TAC-002-04).

## 12. Review gate

Execution starts only after you approve this plan, answer §11, and authorize T00.

- **First bounded task:** T00. Commit the approved document fixes and this plan, then create `feat/poc-app`. Evidence: `git log -4` and a clean `git status` (except `.agents/`).
- **Then:** T02 scaffold.
- **Needs your key:** T01.
- **Outward-facing steps:** push, the PR (T22) and any merge each need a separate go-ahead.

---

## 13. QA and execution log

*(Filled in during execution: acceptance notes, commands with their counts, E2E coverage evidence and screenshots.)*
