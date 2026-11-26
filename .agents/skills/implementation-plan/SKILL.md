---
name: implementation-plan
description: Use when the user asks for an implementation plan, execution plan, task breakdown, dependency matrix, agent briefs or multi-agent orchestration plan for an application or feature that has a PRD and ADRs. Plans the whole application by default, reviews the PRD/ADR/AGENTS.md for contradictions, defines real-stack testing and QA gates, chooses workers from the agents actually available (OpenCode headless always), and stops for the owner's review before any execution.
---

# Implementation Plan

This skill produces a reviewable implementation plan that an orchestrating agent and cheaper worker agents can execute without guessing. It **plans only**: it never implements, never dispatches workers, never pushes, publishes or merges. Execution starts only after the owner approves the plan.

Read the asset files as you reach the matching step:

| Reference | Use it for |
|---|---|
| [assets/plan-template.md](assets/plan-template.md) | Structure of the plan file, the dependency matrix and the Definition of Done |
| [assets/review-checklist.md](assets/review-checklist.md) | Contradiction review of the plan, PRD, ADRs and agent instructions |
| [assets/testing-rules.md](assets/testing-rules.md) | Real-stack E2E and manual QA, recorded mocks, QA gates, screenshots, demo video |
| [assets/workers-and-tools.md](assets/workers-and-tools.md) | Discovering workers, OpenCode headless commands, tool lookup order, research delegation |
| [assets/brief-template.md](assets/brief-template.md) | Worker briefs: location, naming, content, lifecycle |
| [assets/tracking.md](assets/tracking.md) | GitHub epic and sub-issues after approval, status labels |

---

## Defaults (apply unless the owner says otherwise)

- **Scope: the whole application** described by the PRD and ADRs. Plan a part (slice, feature, phase) only when the owner explicitly asks for one.
- **Phases deliver something runnable**, and **every phase ends with a manual QA gate** in the browser automation CLI. A failed gate blocks the next phase.
- **E2E and manual QA use the real application and real external services. No mocks, no request interception.**
- **Unit and integration tests mock external endpoints only with recorded real calls**, never with responses written from documentation or memory.
- **One authoritative dependency matrix** with a `Status` column and a Definition of Done. GitHub issue IDs are added **after approval**.
- **Workers come from what is verifiably available.** OpenCode headless is the always-available option.
- **Every agent looks facts up in the order: CLI `--help` → Context7 → web search**, and delegates research to subagents or CLI agents.
- **Briefs live in `docs/.agents_brief/`**, are committed during the work, and are **deleted together with the plan** after the Definition of Done.
- **QA evidence lives in `docs/qa/<plan-name>/`**: screenshots per gate, each folder with a README, plus the final demo video. It is committed and **kept** after the plan and briefs are deleted.
- **Stop for the owner's review** before T00, the first execution task.

---

## Process

### Step 1: Load the inputs
1. Read the project's root `AGENTS.md` / `CLAUDE.md` and any nested ones on the paths you will plan for.
2. Find the approved PRD and ADRs. Use the repository's documented paths, e.g. `docs/PRD.md` and `docs/ADR/`. Ask for paths **only** when they are missing or ambiguous.
3. Read the design guidance and any README inside test-data or fixture folders. Fixture READMEs often contain binding rules, such as "real files only" or "never assert what a model sees".
4. Do not treat teaching examples, archived plans or other projects' documents as requirements.

### Step 2: Inspect what actually exists. Never assume.
Record each of these in the plan's "What exists today" section:
1. **Git state.**
   - Run `git status --short --branch`, `git log --oneline -5`, `git worktree list` and `gh pr list`.
   - Note uncommitted work that belongs to someone else, and leave it untouched.
   - Note which branch holds the approved documents.
2. **Application state.** Entry points, build descriptor (`package.json` or equivalent), lockfile, test folders, configs. When the application folder is empty, say so: in that case there is **no** baseline.
3. **Runtimes and tools.** Check each with its version or `--help`: language runtime, package managers (if pnpm is missing, npm is fine), `gh`, `opencode`, the browser automation CLI, `ffmpeg`, Docker.
4. **Baseline.** Run the project's real build, test and start commands. Record **compile/build, test execution and startup as separate results**, with discovery counts and skips. Report any baseline failure verbatim. A green build alone does not prove startup.
5. **External services the app depends on.** Verify that each one exists and is reachable **before** writing it into the plan (see review-checklist §A).

### Step 3: Ask only consequential questions
Ask targeted questions when an answer changes the plan's structure. Typical topics:
- the tracker;
- the base branch and PR chain;
- whether test budgets that call paid external services are acceptable;
- product-level behaviour the documents leave contradictory.

Ask several at once and give a recommended option first. Do not ask what the code, the documents or a sensible default can answer. Record every answer in the plan's **Decisions** table, with its date.

**Product decisions belong to the owner.** When the review (Step 5) finds a contradiction whose fix changes product behaviour, propose the fix and ask. Purely technical fixes can be applied and listed.

### Step 4: Draft the plan
Use [assets/plan-template.md](assets/plan-template.md). It must contain:
- the scope (the whole application unless a part was requested), with links to the exact PRD criteria and ADR sections. **Link; do not copy their content**;
- "What exists today" with the commands you verified;
- the execution model: orchestrator, workers, concurrency, brief rules and tool guidance;
- **phases**, each with a QA gate;
- **one dependency matrix** with the columns defined in the template, incl. `Status` and per-row Definition of Done;
- coverage proof: every endpoint, external call and decision method mapped to unit/integration (recorded), E2E (real) and manual QA (real);
- the QA gate checklists and the manual scenarios;
- the critical path, the parallel waves, the shared-file hotspots;
- failure/rollback handling and smaller fallbacks;
- the headless worker commands;
- the Decisions table, the review gate and the execution log section.

**Missing architecture goes into a proposed ADR amendment, never into a plan assumption.** If the plan needs a knob the ADRs do not define (a test-only mode, a TTL env var, a log field), add it to the ADR as a proposal and list it in the review log.

### Step 5: Review before saving. Mandatory.
1. Run **every** check in [assets/review-checklist.md](assets/review-checklist.md) across the plan, PRD, ADRs, policies or rule documents, fixture READMEs and `AGENTS.md`/`CLAUDE.md`.
2. Then get a **fresh-context review**. Start one read-only subagent, or a CLI agent, that has **not** seen this session. Give it the file list and the checklist categories, **not your conclusions**. Ask for findings with severity, `file:line`, quotes, a failure scenario and a fix.
3. Re-check every reported finding against the files before acting on it.
4. Fix technical findings; ask the owner about product-level ones.
5. Re-run the mechanical cross-reference checks after the fixes.

### Step 6: Save, report and stop
1. Save the plan as `docs/plans/<plan-name>.md` (or the path the owner named), marked **"DRAFT, awaiting review"**.
2. Commit only when the owner asks. When you commit, use named paths and the repository's message format.
3. Reply with:
   - the plan link;
   - what exists, the verified commands and the baseline;
   - the review findings (fixed vs. needing a decision);
   - the unresolved decisions;
   - the **first bounded task**;
   - the review gate.
4. **Stop.** Planning does not authorize execution, starting agents, pushing, creating issues or merging.

### Step 7: After approval only
1. Create the tracker items ([assets/tracking.md](assets/tracking.md)) and write the issue IDs into the matrix.
2. Before each dispatch, compile the brief ([assets/brief-template.md](assets/brief-template.md)).
3. Run the phases. Close each phase with its QA gate.
4. When the Definition of Done is met for the whole plan, run the **cleanup task**: delete the plan and its briefs with `git rm` in one commit, after their outcome is summarized in the final PR. The QA evidence and the video stay.

---

## Hard rules (each comes from a planning failure that had to be fixed later)

### Scope and documents
1. Plan the whole application by default. A "first slice" plan that the owner then has to widen wastes a full planning round.
2. Re-inspect the git and application state right before saving. A plan that describes yesterday's branch layout sends workers to the wrong base and drops commits from the PR.
3. Keep plan documents on their own branch when the current branch belongs to another open PR. Ask before moving or rewriting existing commits.
4. Never copy PRD/ADR content into the plan; link the exact AC, section or decision IDs. After every edit, re-run the ID cross-check: each referenced ID must exist.
5. A data structure, log schema or contract is defined **once**, in one document. Every other document points to it.

### External services and models
6. Verify every model or service ID the plan relies on: the provider's model list, the model page, and one real smoke call (e.g. `opencode run -m <provider/model> "<question>" -f <file>`). One 404 is not proof that a model does not exist; search, then try the alternative endpoint or naming before concluding.
7. Verify capabilities, not just existence: image input, structured output, tool calls, streaming, accepted file formats. Mark anything unverified as **UNVERIFIED**, with a verification task early in the plan.
8. A service with a non-standard API (e.g. a decisions or classification endpoint that the app's SDK does not cover) gets its own client, response schema and recordings.

### Testing (details in assets/testing-rules.md)
9. E2E and manual QA never mock. Make every path reproducible **for real** through configuration rather than interception:
   - test-only modes that force one decision path;
   - short TTLs;
   - an invalid model ID to cause a real upstream failure;
   - a tiny timeout.
10. Never write "not reproducible without mocks" before trying such a configuration knob. List the paths that truly cannot be produced for real, each with its recorded-mutation substitute.
11. Mocks of external endpoints come only from recorded real calls, saved verbatim: status, headers, body or stream, and metadata.
    - Record **after** the prompts, schemas and question sets they depend on exist, and store their hashes so a test detects stale recordings.
    - Record real error responses too.
    - Mutations of recordings are declared in a file such as `MUTATIONS.md`.
12. Assertions that depend on what a real model writes or decides are tagged (e.g. `@model`) and retried. Failures are reported as model-quality findings; the assertion is never weakened. Never assert what a model "should see" in a real fixture.
13. Follow fixture README rules literally. If the plan needs an exception (e.g. generated payloads for size-limit rejection tests), get the owner's approval and state the exception wherever workers will read it.
14. Every phase has a manual QA gate with the browser automation CLI on the running app. Screenshots are committed in the repository with a README per folder. A final demo video, recorded with ffmpeg after the last gate, goes into the final PR.

### Logic in the plan and ADRs (see the review checklist for how to find these)
15. Date and deadline math must be specified exactly: calendar arithmetic, month-end clamping, inclusive or exclusive boundaries. Whole-month counting is a classic defect.
16. Ordered rule tables need an explicit order and precedence. Show that a "terminal" rule (expired, escalated) cannot be preceded by a rule that asks for more input.
17. Every fallback must state what does **not** fall back. A total timeout or a client abort must never be swallowed by a degrade-to-alternative path.
18. Every error status the client can receive needs a UI state transition. A 400/413/415 arriving after the UI moved to a "loading" state must lead somewhere.
19. Validation constraints must be satisfiable by the stated test (e.g. a "rejected before reading the body" test must use a body above the preflight limit).
20. Accessibility claims must hold for every possible runtime value (e.g. badge colors for every decision). Compute contrast; do not assume it.

### Workers and tools (details in assets/workers-and-tools.md)
21. Choose workers only from mechanisms you verified in this session. OpenCode headless (`opencode run`) is always available: its free models work right after installation (list them with `opencode models`), and `/connect` adds providers.
22. Document the exact headless command and its gotchas in the plan. For example, with an array-valued `-f` flag, the message must come **before** `-f`. Stagger parallel `opencode run` starts, because they share a local database lock.
23. Every agent looks up facts in the order: tool `--help` → Context7 (MCP or `npx ctx7@latest`, matched to the lockfile version) → official web pages. Research goes to subagents or a CLI agent; workers that cannot start subagents use `opencode run … --agent plan`.
24. Workers never install packages, never use git, never change shared contracts, and never accept their own work. The orchestrator reviews the diff and re-runs the checks before committing.
25. When the sandbox denies an action (e.g. `rm`, reading `.env`), do not work around it. Use the sanctioned alternative (`git rm`, asking the owner) or report it.

### Tracking and lifecycle
26. Before creating issues, check `gh repo view --json hasIssuesEnabled` and that the token can write issues. A 403 is the owner's to fix; do not try to bypass it.
27. Product decisions, pushes, PRs, issue creation on a public repository and merges each need the owner's explicit go-ahead.
