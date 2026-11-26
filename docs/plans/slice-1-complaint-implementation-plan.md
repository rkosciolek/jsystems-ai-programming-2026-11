# Implementation Plan — Slice 1: Complaint end-to-end

> **Status: DRAFT, awaiting review by the repository owner.** This plan does not authorize execution, starting agents, pushing, publishing or merging.

**Date:** 2026-11-25
**Branch (planned):** `feat/slice-1-complaint`, stacked on `feat/design-system` (open PR #2). The slice PR targets `feat/design-system` and is retargeted to `main` after PR #2 merges.
**Tracker:** the `Status` column of the [dependency matrix](#4-dependency-matrix-authoritative) in this file. GitHub issues are disabled for this repository. Only the orchestrator updates the column, in the same commit that accepts a task.

**Sources of truth:**
- PRD: [`docs/PRD.md`](../PRD.md)
- ADRs:
  - [`000-main-architecture`](../ADR/000-main-architecture.md)
  - [`001-ai-decision-pipeline`](../ADR/001-ai-decision-pipeline.md)
  - [`002-backend-api`](../ADR/002-backend-api.md)
  - [`003-frontend`](../ADR/003-frontend.md)
- Design: [`docs/design-guidelines.md`](../design-guidelines.md), [`assets/design-tokens.json`](../../assets/design-tokens.json), [`assets/homepage.png`](../../assets/homepage.png)
- Policies: [`docs/policies/complaint-policy.md`](../policies/complaint-policy.md)
- Rules: [`AGENTS.md`](../../AGENTS.md)

---

## 1. Slice definition

**Demo:** a customer opens the app and fills in the complaint form with a real photo. The real pipeline runs (sharp → Jev → rules/template, or LLM fallback). The progress screen shows the three real steps. The chat screen shows the case number, a decision badge and a first message with the six sections and the disclaimer. The customer then asks a follow-up question and gets a streamed answer that uses the case context.

| In this slice (PRD criteria) | Deferred to slice 2+ |
|---|---|
| Form, all fields and validation for both case types: AC-01…AC-16 | Return pipeline and rules: AC-27, AC-28 (ADR-001 §3.3, return table) |
| Complaint image handling: AC-17…AC-20 | Decision revision: AC-36, AC-37 (ADR-001 TD-104, `revise_decision`) |
| Complaint first message: AC-21…AC-26, AC-29…AC-31 | "Nowa sprawa" dialog and reset: AC-44, PRD Flow 4.6 |
| Chat basics: AC-32…AC-35, AC-38 (no attachment control), AC-39, AC-40 | `DECISION_MODE=llm-only` shadow comparison (ADR-000 TD-03); logged field only |
| Session: AC-41…AC-43 | Expired-case 404 UX beyond a plain error text |
| Errors: AC-45…AC-47 | |
| General: AC-48…AC-51 | |

**Temporary slice limitation:** submitting with case type "Zwrot" passes client validation. The server answers `501`, and the UI shows the existing service error banner. Slice 2 removes this. *(Alternative: hide the "Zwrot" tile in slice 1. This needs your decision; see §9.)*

---

## 2. What exists today (inspected 2026-11-25)

| Item | Observed state |
|---|---|
| Branch | `feat/design-system`, 2 commits ahead of origin (PRD `50695de`, policies `150a209`) |
| Working tree | `M docs/PRD.md` (§11.1 classifier update); `?? docs/ADR/` (4 ADR files); `?? .agents/` (empty `skills/`, unrelated, left untouched) |
| `app/` | Only `README.md` (course checklist). No `package.json`, no source, no tests, no entry points. |
| Docs | PRD, 4 ADRs (uncommitted), `docs/design-guidelines.md`, `docs/policies/*.md` |
| Fixtures | `assets/example-images/`: `laptop-1.png`, `laptop-2.webp`, `phone-1.jpg`, `phone-2.jpeg`, `phone-3.jpeg` |
| Env | Root `.env.example`: `OPENROUTER_API_KEY=` (empty), `LLM_MODEL=openai/gpt-6-luna`. No `app/.env.local`. |
| Custom agent roles | None (`.claude/agents/` and `.codex/agents/` absent). No `.agent-briefs/` yet. |
| GitHub | `gh` logged in as the repo owner; issues disabled; open PRs #1 and #2 |

**Commands verified:**

| Command | Result |
|---|---|
| `git status --short --branch` | Output as in the table above |
| `node -v` / `npm -v` | v24.22.3 / 11.19.1 (pnpm, bun and docker not installed) |
| `opencode --version` | 1.19.0 |
| `opencode run --help` | Flags: `-m/--model`, `--agent`, `--dir`, `-f/--file`, `--format json`, `--title`, `-s/--session`, `--variant`, `--auto` |
| `opencode auth list` | 1 credential: OpenRouter |
| `opencode models openrouter` | Lists `openrouter/openai/gpt-6-luna` |
| `opencode agent list` | Built-in `build`, `plan`, `explore`, `general`; the `build` agent allows `*` |
| `playwright-cli` | Present in `~/.local/bin` |
| `gh auth status` | Logged in; `gh pr list` works |

**Baseline build / test / start:** **none exist.** There is no application, so there is nothing to build, test or start, and no baseline failure is possible. The first application commands are created and verified in T02.

---

## 3. Execution model

**Orchestrator: this Claude Code session (Opus).**
- Owns architecture decisions and contradictions.
- Owns the shared contracts (`lib/domain`, `lib/i18n`), `package.json` and the lockfile, `app/AGENTS.md`, prompts, integration, commits and this file's `Status` column.
- Writes each brief just before dispatch, reads every diff, reproduces each worker's checks, and accepts or rejects.

**Workers** (ad hoc only; no custom role files are planned):

| Worker | Mechanism (verified to exist) | Used for |
|---|---|---|
| **Haiku** | Claude Code `Agent` tool, `subagent_type: general-purpose`, `model: haiku`. Prompt: "Execute `.agent-briefs/<task>.md`" | Small, well-specified modules and tests |
| **Luna** | OpenCode headless, `openrouter/openai/gpt-6-luna` (§8) | Logic-heavy modules, UI components, independent review |

**Worker rules** (repeated in every brief):
- Write the failing test first and record red output.
- Implement until green.
- Edit **only** the listed files.
- No `npm install`, no git commands, no edits to shared contracts.
- Report contradictions instead of resolving them.
- Write the report to `.agent-briefs/<task>.report.md`.

A worker never accepts its own work.

**Concurrency:**
- At most 3 workers run at once.
- Only tasks with disjoint editable files run in parallel.
- Each brief names the tasks running concurrently.
- Everything runs in one checkout. A worktree is not planned, because no two parallel tasks edit the same files.

**Briefs:**
- Compiled just before dispatch into `.agent-briefs/<task>.md`.
- Contents: excerpts of the contracts and source, predecessor outputs, the exact editable files, ordered steps, test inputs and expected results, plus links to the PRD/ADR sections for traceability.
- Briefs and reports are committed with the accepted task. Raw OpenCode JSON logs (`.agent-briefs/*.log.jsonl`) are gitignored.

**Commit rule** ([AGENTS.md → Commit Rules](../../AGENTS.md)):
- One commit per accepted task, made by the orchestrator.
- Named paths only (no blanket staging).
- Format `Area: summary`, with session attribution.

---

## 4. Dependency matrix (authoritative)

Every implementation row follows the same order: failing behavioral test → implementation → the row's checks, reproduced by the orchestrator → commit. All app commands run in `app/`.

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff | Status |
|---|---|---|---|---|---|---|---|
| **T00** Commit docs, branch | PRD §11.1 update and 4 ADRs are committed; branch `feat/slice-1-complaint` exists | ADR-000 §1 | Your approval of PRD+ADR | Orchestrator | `docs/PRD.md`, `docs/ADR/*.md`, this plan | `git log -3`; `git status` clean apart from `.agents/`. Commits: `Docs: ADRs and PRD classifier layer`, `Docs: slice 1 implementation plan` | todo |
| **T01** Secrets in place | `app/.env.local` holds `OPENROUTER_API_KEY` (entered by you, never read by agents) | ADR-000 §7 | T02 creates `app/` | **You** | `app/.env.local` (gitignored) | The orchestrator checks only that the variable is present (`grep -c '^OPENROUTER_API_KEY=.\+'`); the value is never printed | todo |
| **T02** Scaffold | Next 16 app builds, starts and serves `/`. Lint, typecheck and an empty-suite test run pass. All slice deps and shadcn components are installed once. | ADR-000 TD-02, §3 | T00 | Orchestrator (serialized: lockfile and config) | `app/**` scaffold, `app/package.json`, `app/package-lock.json`, configs (`tsconfig`, `vitest.config`, `playwright.config`, `eslint`), `app/AGENTS.md`, `app/.env.example`, `.gitignore`, project `opencode.json` (§8) | `npx create-next-app@16.4.6 --help` is checked before running. Then `npm run lint`, `npm run typecheck`, `npm test` (Vitest `passWithNoTests`), `npm run build`, `npm start` + `curl -sI localhost:3000` → 200, and one screenshot. Commit `App: scaffold Next.js 16 with AI SDK 7, shadcn, Vitest, Playwright` | todo |
| **T03** Model gate and captures | Real Jev decision (complaint questions, `laptop-1.png`) and a real image call to Luna are captured with metadata. ADR-000 TD-04 is updated with the outcome. | ADR-000 TD-04, TAC-05; ADR-001 §2 | T01, T02 | Orchestrator | `app/scripts/capture/*.ts`, `app/tests/fixtures/captured/**`, `docs/ADR/000-main-architecture.md` (TD-04 result) | Fixture files include date, endpoint, model, request and status, with no secrets. If Luna rejects images → set `VISION_MODEL` per TD-04. If Jev fails → **stop** and use fallback F1 (§7). Commit `Test: captured Jev and Luna responses` | todo |
| **T04** Shared contracts | Domain enums, Zod schemas (`CaseInput`, `CaseEvent`, `DecisionOutcome` incl. complaint reason codes, `CaseUIMessage`, `DecisionLogEntry`), `pl.ts` strings and `server/env` compile, and their unit tests pass | ADR-000 §5–§7; ADR-002 §3.6, §4; ADR-003 §4; PRD AC-04…AC-13 messages | T02 | Orchestrator writes contracts; **Haiku** writes the tests first | `app/src/lib/domain/**`, `app/src/lib/i18n/pl.ts`, `app/src/server/env/**`, `app/tests/unit/domain/**` | Red then green on the schema tests (AC-04…AC-13 strings verbatim). Commit `Shared: domain contracts, Polish strings, env schema` | todo |
| **T05** Image processing | `images.process` resizes to ≤ 2048 px, outputs JPEG, applies EXIF rotation, strips metadata, and rejects non-images | ADR-002 §3.3, TD-202; PRD AC-17 | T04 | **Haiku** | `app/src/server/images/**`, `app/tests/unit/images.test.ts` | ADR-002 §8 resize cases, using fixtures generated in-test plus `laptop-2.webp`. Commit `Backend: image processing with sharp` | todo |
| **T06** Complaint rules | `computeFacts`, gate, table C1–C8, always-LLM list (complaint), `checkLlmOutcome` (complaint) | ADR-001 §3.3, TD-101, TD-102, TAC-001-01/05; PRD AC-26, AC-29 | T04 | **Luna** | `app/src/server/rules/**`, `app/tests/unit/rules/**` | One test per row and per boundary (24 months ± 1 day, threshold 0.80 / 0.7999). Policy-constant test reads `docs/policies/complaint-policy.md`. Commit `Backend: complaint decision rules` | todo |
| **T07** Jev client | Question builder (complaint), HTTP client, Zod response schema, normalization, `ClassifierError` | ADR-001 §3.2, TD-105; ADR-002 §3.7 | T03, T04 | **Luna** | `app/src/server/classifier/**`, `app/tests/unit/classifier/**` | Mapping tests against the **captured** fixture; invalid-response test; request has no purchase date. Commit `Backend: Jev classifier client` | todo |
| **T08** Store, log, case ID | TTL/cap store on `globalThis`, allowlist JSONL logger, `HSD-YYYYMMDD-XXXX` generator | ADR-002 §3.4, §3.5, §3.1; ADR-000 TD-05, TD-07, TAC-07; PRD AC-41 | T04 | **Haiku** | `app/src/server/case-store/**`, `app/src/server/decision-log/**`, `app/src/server/case-id/**`, `app/tests/unit/store-log/**` | Fake-timer TTL test; 501-insert eviction; sentinel-not-logged test; ID regex with a fixed clock. Commit `Backend: case store, decision log, case ID` | todo |
| **T09** Policies and prompts | Policy loader; prompt files `vision-complaint.md`, `decision-complaint.md`, `chat.md` per PRD §11 | ADR-001 §3.5–§3.8, TAC-001-04; PRD §11.2–§11.8 | T04 | Orchestrator (prompts are product behaviour) + **Haiku** (loader and tests) | `app/src/server/policies/**`, `app/src/server/prompts/**`, `app/tests/unit/prompts/**` | Prompts contain the 4 Polish decision labels verbatim; complaint prompt excludes return policy text. Commit `Backend: policy loader and complaint prompts` | todo |
| **T10** Complaint templates and finalizer | Polish first message per reason code C1–C7 with 6 headings, case number, cited §, `nearDeadline` note; finalizer appends exactly one disclaimer | ADR-001 §3.4, §3.6 (finalizer); PRD AC-23…AC-25, §11.7, §11.8 | T04 | **Luna** | `app/src/server/templates/**`, `app/tests/unit/templates/**` | Heading order test; no "Pan/Pani"; single disclaimer. Commit `Backend: complaint first-message templates` | todo |
| **T11** Theme and layout | Tokens mapped to shadcn CSS variables, Noto Sans `latin-ext`, `AppHeader` | ADR-003 §3.5; design-guidelines → Colors, Typography, Spacing, Border radius, Logo placement | T02 | **Haiku** | `app/src/app/globals.css`, `app/src/app/layout.tsx`, `app/src/components/app-header/**`, `app/tests/unit/app-header.test.tsx` | Header render test (name, `lang="pl"`); screenshot at 1920 px compared with `assets/homepage.png`. Commit `Frontend: brand theme and app header` | todo |
| **T12** Case form | Form with the 7 fields, case-type dependent texts, photo drop zone and preview, all validation, focus on first error, server 400 mapping | ADR-003 §3.2, TD-302; PRD AC-01…AC-16, §9.1 | T04, T11 (CSS vars only) | **Luna** | `app/src/components/case-form/**`, `app/tests/unit/case-form/**` | RTL tests for AC-01…AC-15 (exact messages; AC-09 behaviour). Commit `Frontend: case form with validation` | todo |
| **T13** LLM layer (complaint) | `analyzeImage`, `decide` with one retry via `checkLlmOutcome`, `escalated/llm_inconsistent` fallback, `finalizeFirstMessage` | ADR-001 §3.5, §3.6, TD-103, TAC-001-03 | T03, T06, T09, T10 | **Luna** | `app/src/server/llm/**` (excluding `chat*`), `app/tests/integration/llm/**` | `MockLanguageModelV4` outputs derived from the T03 captures; retry and violation tests. Commit `Backend: vision and decision LLM steps` | todo |
| **T14** `/api/cases` | Multipart validation (400/413/415/501 for return), NDJSON progress, pipeline with 90 s abort, store + log, `instrumentation.ts` fail-fast | ADR-002 §3.1, §4, §5, TD-201, TD-203; ADR-000 TAC-04, TAC-08; PRD AC-30, AC-45, AC-47 | T05, T07, T08, T13 | **Luna** (orchestrator integrates) | `app/src/app/api/cases/**`, `app/src/server/pipeline/**`, `app/src/instrumentation.ts`, `app/tests/integration/cases/**` | ADR-002 §8 integration rows (complaint). Event order; masked errors; 10 MB boundary. Commit `Backend: case submission endpoint` | todo |
| **T15** Page state and progress | Reducer (form → progress → chat placeholder), `submitCase` NDJSON parser, progress screen, draft kept on error, 95 s client timeout | ADR-003 §3.1, §3.3; PRD §9.2, AC-16, AC-42, AC-45 | T04, T12 | **Haiku** | `app/src/app/page.tsx`, `app/src/components/progress/**`, `app/src/lib/client/submit-case.ts`, `app/tests/unit/page-state/**` | Parser split-chunk test; every reducer transition. Commit `Frontend: page state machine and progress screen` | todo |
| **T16** `/api/chat` | Validated body, 404 for an unknown case, server-rebuilt context (stored first message wins), streamed reply via `createUIMessageStream`, masked errors. No revision tool. | ADR-002 §3.2; ADR-001 §3.7 (without the tool); ADR-000 TD-05; PRD AC-34, AC-35, AC-46 | T08, T09, T13 | **Luna** | `app/src/app/api/chat/**`, `app/src/server/llm/chat*.ts`, `app/tests/integration/chat/**` | Mock stream test; tampered first message ignored; 400/404 rows. Commit `Backend: chat streaming endpoint` | todo |
| **T17** Chat view | `useChat` seeded with the first message, AI Elements thread/message/prompt input, Streamdown, `DecisionBadge`, summary collapsible, typing indicator, Ponów, `beforeunload`; wired into `page.tsx` | ADR-003 §3.4, TD-301, TD-303; ADR-000 TD-06; PRD §9.3, AC-32…AC-35, AC-38…AC-43, AC-50 | T15, T16 (contract), T02 (AI Elements patterns installed) | **Luna** | `app/src/components/chat/**`, `app/src/app/page.tsx` (chat branch only, after T15), `app/tests/unit/chat/**` | RTL tests from ADR-003 §8 (input, badge, retry, beforeunload). Commit `Frontend: streaming chat view` | todo |
| **T18** Integration check | Whole slice green, built and started with the real key | ADR-000 §10, TAC-01…TAC-03 | T14, T17 | Orchestrator | none (fixes go back to the owning task) | `npm run lint && npm run typecheck && npm test && npm run build`, recorded **separately** from `npm start` + `curl` + one real submission via `curl -F` | todo |
| **T19** E2E (real stack) | 4 Playwright scenarios pass against `npm start` with real OpenRouter: complaint `laptop-1.png`; WebP `laptop-2.webp`; chat follow-up about the purchase date; validation errors | ADR-000 §10 (E2E rows); PRD AC-23, AC-25, AC-30, AC-35 | T18 | **Haiku** writes the specs; orchestrator runs them (token cost) | `app/tests/e2e/**` | `npm run test:e2e`, with discovered/passed/skipped counts reported. Commit `Test: E2E complaint slice` | todo |
| **T20** Manual QA | Screenshots of form, progress and chat at 360 and 1920 px; brand comparison; Polish texts; zero console errors; keyboard-only run; 10 MB upload; fast path timing | [AGENTS.md → Manual QA](../../AGENTS.md); ADR-002 TAC-002-04; ADR-001 TAC-001-02; ADR-003 TAC-003-03/05; design-guidelines | T19 | Orchestrator with `playwright-cli` | `docs/plans/qa/slice-1/*.png` (evidence only) | QA report section appended to this plan. Defects become fix tasks (T20.x) for the owning worker. Commit `Docs: slice 1 QA evidence` | todo |
| **T21** Independent review | Two reviews of `git diff feat/design-system...HEAD`: (a) Luna via OpenCode with a read-only agent; (b) Claude `/code-review` at `high`. Only verified findings are fixed. | [AGENTS.md → Code Review Rules](../../AGENTS.md) | T20 | Luna (reviewer, did not author the reviewed files where possible) + orchestrator | Fixes: the owning task's files only | Each finding is reproduced or rejected with a reason. Checks from T18/T19 are re-run after fixes. Commits `Fix: …` per finding group | todo |
| **T22** Pull request | Branch pushed; PR to `feat/design-system` with the slice summary, PRD/ADR links, QA evidence and the checks that actually ran | AGENTS.md → Completion Criteria | T21 **and your explicit go-ahead to push** | Orchestrator | none | `gh pr create`; PR body lists commands and counts. No merge by the agent. | todo |

---

## 5. Critical path, waves and hotspots

**Critical path:** T00 → T02 → T03 → T07 → T13 → T14 → T16 → T17 → T18 → T19 → T20 → T21 → T22. T01 (key) is needed by T03.

**Parallel waves** (at most 3 workers):

| Wave | Tasks running together | Shared-file risk |
|---|---|---|
| W1 | T05 (Haiku), T06 (Luna), T08 (Haiku); orchestrator on T09 prompts | None (disjoint folders) |
| W2 | T07 (Luna), T10 (Luna), T11 (Haiku) | None |
| W3 | T12 (Luna), T09 loader (Haiku) | None |
| W4 | T13 (Luna), T15 (Haiku) | None; `page.tsx` is owned by T15 only in this wave |
| W5 | T14 (Luna), T16 (Luna) | Both import `server/llm`: T16 adds only `chat*.ts`; T13 is already merged |
| W6 | T17 (Luna) | `page.tsx`, edited after T15 is committed |

**Shared-file hotspots, serialized through the orchestrator:**
- `app/package.json` and `app/package-lock.json`: T02 only. A worker that needs a dependency reports it; the orchestrator installs it in a separate commit.
- `app/src/lib/domain/**` and `app/src/lib/i18n/pl.ts`: T04 only. Changes come as requests in worker reports.
- `app/src/app/page.tsx`: T15, then T17.
- `app/src/app/globals.css`: T11 only.
- Configs (`tsconfig`, `vitest`, `playwright`, `eslint`), `app/AGENTS.md`, `opencode.json`, `.gitignore`: orchestrator only.
- This plan's `Status` column: orchestrator only.

---

## 6. Failure and rollback handling

- **Worker fails, or its report contradicts the contracts:**
  1. The orchestrator rejects the result.
  2. It discards only that task's listed files: `git restore -- <files>` and `git clean` on the task's new paths, never repository-wide.
  3. It refines the brief and retries once, by continuing the same session (`opencode run -s <id>`, or `SendMessage` to the Haiku agent).
  4. A second failure is taken over by the orchestrator.
- **Contract gap or ADR contradiction:** stop the affected tasks, write a *proposed* ADR amendment (Status: Proposed), and ask you before continuing.
- **Integration (T18) fails:** bisect by task commit. The fix goes to the owning task; nothing is patched around inside the integration layer.
- **OpenRouter unavailable or out of credit:** unit and integration work continues on captured fixtures. T03, T19 and T20 are blocked and reported as blocked, not skipped.
- **OpenCode unavailable:** Luna tasks move to Haiku subagents, or to the orchestrator sequentially. Matrix, briefs and acceptance stay the same.
- **Rollback of an accepted task:** `git revert <task commit>`. No history rewriting on shared branches.

---

## 7. Smaller fallbacks if time, tools or model access run out

- **F1: no LLM path** (Jev fails the gate, or the time budget is short).
  - Cut: T13.
  - Effect: every non-fast-path complaint gets `escalated` with a temporary reason code `llm_path_deferred`. The fixed escalation template is already planned in T10.
  - Requires a **proposed ADR-001 amendment** first. Not assumed.
  - Demo still shows: form → Jev → template → chat.
- **F2: no follow-up chat.**
  - Cut: T16, plus the input part of T17.
  - Effect: the chat screen shows only the first message and the badge (AC-32 partly; AC-33…AC-35 deferred).
- **F3: minimum demo.** T02, T04, T05, T07, T08, T10, T12, T14, T15, with a first-message view. Pairs with F1 and F2.

---

## 8. OpenCode headless — short instructions

**Pre-checks** (run in T02; versions verified 2026-11-25):
- `opencode --version` shows 1.19.0.
- `opencode auth list` shows an OpenRouter credential.
- `opencode models openrouter | grep gpt-6-luna` lists the model.

**Implementation task:** run from the repo root, in the background through the Bash tool, one process per task:

`opencode run -m openrouter/openai/gpt-6-luna --agent build --title "T06 complaint rules" --format json -f .agent-briefs/T06-complaint-rules.md "Execute the attached brief exactly. Edit only the files it lists. Write your report to .agent-briefs/T06-complaint-rules.report.md." > .agent-briefs/T06-complaint-rules.log.jsonl 2>&1`

**Follow-up in the same context:** `opencode run -s <sessionID from the JSON log> -m openrouter/openai/gpt-6-luna "…"`.

**Review task (T21):** the same command with `--agent plan` and a review brief that names the diff range.
- In T02, first confirm that `plan` denies edits and bash writes. If it does not, add a minimal read-only `reviewer` agent to the project `opencode.json`. This is the one justified custom definition: a recurring role with tool restrictions.

**Safety:**
- Do **not** pass `--auto`.
- In T02, add a project `opencode.json` that denies `git commit*`, `git push*` and `npm install*` for workers. Verify the permission syntax against the current OpenCode docs (Context7 or `opencode.ai/docs`) before relying on it.

**Optional:** `--variant <effort>`. Check which reasoning variants the model supports before using it.

**Acceptance is never taken from the log.** The orchestrator reads `git diff -- <task files>` and re-runs the task's tests itself.

---

## 9. Unresolved decisions (need your answer before or during execution)

1. **"Zwrot" in slice 1:** keep the tile and answer with `501` plus the error banner (planned), or hide the tile until slice 2?
2. **Agent briefs and reports in Git:** commit `.agent-briefs/*.md` with each task (planned, for traceability), or keep them gitignored?
3. **Approval of the uncommitted PRD/ADR changes** (T00 prerequisite).
4. **Token budget for E2E** (T19, real calls): 4 scenarios planned. Is about 4 real runs per E2E execution acceptable?

---

## 10. Review gate

Execution starts only after you:
- (a) approve this plan, or request changes;
- (b) answer §9;
- (c) authorize T00 (the docs commit and the new branch).

Each later outward-facing step needs its own go-ahead: pushing, opening the PR (T22) and any merge.

**First bounded task after approval:** **T00.** Commit the PRD §11.1 change and the 4 ADRs, commit this plan, then create `feat/slice-1-complaint` from `feat/design-system`. Evidence: `git log -3` and a clean `git status` (except the untouched `.agents/`).

---

## 11. QA and execution log

*(Filled in by the orchestrator during execution: per-task acceptance notes, the commands run with their counts, and screenshots for T20.)*
