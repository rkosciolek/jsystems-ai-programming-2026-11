# Plan template

Save the plan as `docs/plans/<plan-name>.md`, where `<plan-name>` is short kebab-case, e.g. `app-implementation-plan`. The same `<plan-name>` prefixes every brief (see brief-template.md).

Write the plan in the repository's documentation language. Link to the PRD, ADRs and design guidance by ID and section; never copy their content.

````markdown
# Implementation Plan — <Application name> (whole application)

> **Status: DRAFT, awaiting review by the repository owner.** This plan does not authorize execution, starting agents, pushing, creating issues, publishing or merging.

**Revision:** <n> (<date>). One line per revision describing what changed.

**Branches:**
- the branch with the approved documents;
- the implementation branch (planned);
- the PR chain and when each PR is retargeted.

**Tracker:** the `Status` column below until approval; afterwards the GitHub epic and sub-issues (§5.1).

**Sources of truth:** PRD, ADRs, design guidance, rule or policy documents, fixture READMEs, `AGENTS.md`/`CLAUDE.md`, each as a link.

## 1. Scope
- Whole application: every PRD flow and acceptance criterion, listed as an ID range, e.g. AC-01…AC-NN. A part only if the owner asked for one, and then name what is deferred.
- Testing principles: real-stack E2E and manual QA; recorded mocks only; a QA gate after every phase.

## 2. What exists today
| Item | Observed state |
|---|---|
| Branch / working tree | … |
| Application | … (or "empty; no baseline") |
| Test data | … (incl. fixture README rules) |
| Tools | … |

**Commands verified:** a table of command → result.

**Baseline:** build / tests / startup, recorded separately, or "none exists".

**Not verified yet:** each item with the task that verifies it.

## 3. Document review log
- Fixes applied, each with ID, file, problem and fix.
- Findings that need an owner decision.
- Proposed edits to agent instructions (not applied without approval).
- Remaining risks and how the plan handles them.

## 4. Execution model
- The orchestrator's responsibilities.
- The workers table: worker | verified mechanism | used for.
- Brief location and naming (brief-template.md).
- Tool guidance for every agent, copied verbatim into every brief (workers-and-tools.md §3).
- Concurrency rules and the commit rules.

## 5. Phases and dependency matrix (authoritative)

| Phase | Delivers (runnable) | Tasks | Closing gate |
|---|---|---|---|
| P0 | Documents committed, implementation branch | T00 | — (docs-only scoped checks) |
| P1 | … | … | Q1 |
| … | … | … | … |
| Pn | Review, regression QA, demo video, PR, cleanup | … | Qn |

| ID | Task | Observable outcome | PRD/ADR links | Prerequisites | Owner / model | Editable files | Verification and handoff | Definition of Done | Status | Issue |
|---|---|---|---|---|---|---|---|---|---|---|
| T00 | Docs and branch | … | … | Owner approval | Orchestrator | … | … | … | todo | — |
| T01 | … | … | … | T00 | Worker (Haiku / OpenCode …) | exact paths | exact commands | see DoD rules below | todo | — |
| Q1 | QA gate: P1 | … | … | T01… | Orchestrator, browser CLI | `docs/qa/<plan-name>/Q1/` | gate checklist (§7) | see DoD rules below | todo | — |
| … | | | | | | | | | | |
| TV | Demo video | … | … | last gate | Orchestrator | `docs/qa/<plan-name>/final/` | testing-rules.md §6 | video watched in full, linked in the PR | todo | — |
| TPR | Pull request | … | … | TV + owner go-ahead to push | Orchestrator | — | `gh pr create` | PR open, all checks listed | todo | — |
| TX | Cleanup | Plan and briefs removed after the plan's DoD | — | PR merged or owner confirms DoD | Orchestrator | `docs/plans/<plan-name>.md`, `docs/.agents_brief/<plan-name>-*` | `git rm` in one commit | Nothing of the plan or briefs left; evidence and video kept | todo | — |

**Column rules:**
- **ID:** stable; never renumber after approval. QA gates are `Qn`.
- **Observable outcome:** what a person or a test can see when the task is done. Never "implemented X".
- **Prerequisites:** IDs only. There must be no cycles, and every prerequisite must appear earlier in the matrix.
- **Owner / model:** a verified mechanism (workers-and-tools.md), never a hypothetical role.
- **Editable files:** exact paths or globs. Parallel tasks must have disjoint files. Shared hotspots belong to the orchestrator.
- **Verification and handoff:** the project's real commands, with counts. Startup is recorded separately from build and tests.
- **Definition of Done:** per row, with these default rules:
  - For an implementation task:
    - a failing behavioral test was written first and its red output recorded;
    - the test is green now;
    - the orchestrator reproduced the checks and reviewed the diff;
    - the brief and the report are committed;
    - for UI tasks, there was a quick browser-CLI look at the touched screen;
    - one focused commit.
  - For a QA gate:
    - checklist executed on the running app;
    - screenshots committed with a README;
    - build, tests and startup recorded separately;
    - failures turned into `Qn.x` fix tasks;
    - the gate re-run after fixes.
- **Status:** `todo` → `ready` → `in-progress` → `review` → `done`, or `blocked`. Only the orchestrator changes it, in the accepting commit. After approval it mirrors the issue, which is authoritative.
- **Issue:** empty until approval; then `#n` links (tracking.md).

### 5.1 Status tracking
- Labels, commands to view progress, and the comment the orchestrator posts on each status change.
- The ID → issue map, filled after approval.

## 6. Coverage proof
| Component / endpoint / external call / decision method | Unit/integration (recorded) | E2E (real, server config) | QA gate / manual | Evidence (log field, DOM) |
|---|---|---|---|---|

Every row needs at least one real-stack check. List the paths that cannot be produced for real, each with its recorded-mutation substitute.

## 7. QA gate checklists and manual scenarios
- The server set: one build, several runtime configurations.
- Per gate: steps and pass criteria.
- Manual scenarios with IDs `M1…`.
- Known limitations.

## 8. Critical path, waves and hotspots

## 9. Headless worker commands
Copy the verified commands from workers-and-tools.md §2.

## 10. Failure, rollback and smaller fallbacks
- A worker fails → reject, discard only its files, retry once, then the orchestrator takes over.
- A gate fails → `Qn.x` tasks and the next phase is blocked.
- A contradiction is found → stop and propose an ADR amendment.
- An external service is down → blocked, not skipped.
- Rollback with `git revert`.
- Fallbacks F1…: each needs a proposed ADR amendment first.

## 11. Decisions
| # | Question | Answer (date) |
|---|---|---|

## 12. Review gate
- What the owner must approve.
- The first bounded task.
- Which outward-facing steps need a separate go-ahead.

## 13. Execution log
Filled in during execution:
- per task: brief path, worker and session ID, acceptance, commands with counts;
- per gate: steps, screenshots, findings, verdict.
````
