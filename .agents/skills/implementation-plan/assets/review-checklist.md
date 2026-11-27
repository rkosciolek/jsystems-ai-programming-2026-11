# Review checklist (run before saving the plan)

Review the plan **together with** the PRD, the ADRs, rule or policy documents, design guidance, fixture READMEs, `.env.example`, `.gitignore` and `AGENTS.md`/`CLAUDE.md`. Each item below has caused a real defect in an earlier plan.

Run the mechanical checks (§F) with a small script; do not eyeball them. Then get a fresh-context review (§G).

## A. External services, models and tools
- [ ] Every model or service ID exists. Check the provider's model list, the model page and one real smoke call. If a page returns 404, search before concluding, because the ID or the endpoint may differ.
- [ ] Every capability the plan relies on is verified or marked UNVERIFIED with an early verification task: image input, accepted formats, structured output, tool calls, streaming, error shapes.
- [ ] Endpoints that the main SDK does not cover have their own client in the plan.
- [ ] The package manager and runtime versions match what is installed. Prefer npm when pnpm is absent.
- [ ] Every CLI flag the plan uses was checked with `--help`. Note gotchas, e.g. array flags that swallow the following positional argument.
- [ ] Tracker prerequisites are checked: issues enabled, token permissions.

## B. Consistency between documents
- [ ] Every number appears identically everywhere: limits, deadlines, timeouts, sizes, thresholds.
- [ ] The same is true of enum values, event names, field names, status codes, UI strings and file paths.
- [ ] Every env var the plan or tests use exists in the ADR's env table, with a default and a range. Test-only knobs are labelled as such.
- [ ] Each schema (log entry, analysis result, request/response) is defined **once**; the other documents link to it. Two field lists for the same thing is a defect.
- [ ] A log allowlist contains every field that any test, dashboard or plan "evidence" column reads.
- [ ] The rule or policy documents support every rule the product applies (e.g. escalation triggers). The PRD's "do not invent rules" must hold.
- [ ] Function signatures are identical in every section that mentions them, with one section declared authoritative.
- [ ] The plan's described branch and working-tree state matches `git status` / `git log` **now**.
- [ ] Agent instructions (root and nested `AGENTS.md`/`CLAUDE.md`) do not contradict the plan. Where they do, propose an edit; do not apply it without approval, and state how workers learn the rule meanwhile (nested `AGENTS.md`, brief).
- [ ] Fixture README rules (real files only, no generated images, do not assert content) are reflected in every test rule. Exceptions are owner-approved and written where workers read them.

## C. Logic defects to look for in PRD/ADR rules
- [ ] **Date math.**
  - Calendar arithmetic, not whole-unit counting (24 months + 20 days is past 24 months).
  - Month-end clamping (Feb 29 + 24 months).
  - Explicit inclusive or exclusive boundaries.
  - One module computes the dates and every consumer receives the results.
- [ ] **Ordered rule tables.**
  - Explicit evaluation order and precedence.
  - Terminal outcomes (expired, escalated) come before rules that ask for more input.
  - Each row names the inputs it requires (row-level gating, not one global gate).
- [ ] **Confidence and threshold gating** uses a quantity with the claimed meaning (a calibrated probability, not a "concentration" score), with an inclusive boundary stated.
- [ ] **Hard constraints on model output** allow the safe outcome (e.g. escalation to a human) and the documented exceptions. Facts the user can correct are re-checked against the corrected values.
- [ ] **Fallbacks** state what does not fall back: a total timeout or client abort ends the case; it never degrades into an alternative path.
- [ ] **IDs** that downstream steps need (case or request IDs) are generated before those steps run.
- [ ] **Tool-call ordering** is defined when UI state depends on a tool result (tool first, then text), with a server-side guard.
- [ ] **Every HTTP error** the client can receive maps to a UI state transition, including errors that arrive after the UI switched to a loading state.
- [ ] **Validation tests are satisfiable.** A preflight-limit test needs a body above the preflight limit; a file-size test needs a body below it.
- [ ] **Accessibility holds for every runtime value.** Compute WCAG contrast for each color/value pair, e.g. a badge for every possible decision. Use text tokens ≥ 4.5:1; color is not the only signal.
- [ ] **Design guidance is followed literally**, e.g. "keep CTAs outlined" against framework defaults, and font subsets against the required language characters.
- [ ] **Out-of-period or expired cases** never ask the user for more input.

## D. Testing design
- [ ] No E2E or manual step mocks or intercepts anything.
- [ ] Every endpoint, external call, decision method and failure path appears in the coverage table with a real-stack check. "Not reproducible" is accepted only after trying configuration knobs.
- [ ] Every unit/integration mock of an external endpoint names its recording. No response bodies are written inline. Mutations are declared.
- [ ] Recordings are scheduled after the prompts, schemas and question sets they depend on, and include real error responses.
- [ ] Model-dependent assertions are tagged and retried; all others are deterministic.
- [ ] Every PRD acceptance criterion maps to at least one test or manual scenario. Grep the AC IDs.
- [ ] A QA gate exists after every phase, and each phase delivers something runnable that the gate can exercise. Add temporary views when a later phase owns the final UI.
- [ ] A demo-video task exists after the last gate, before the PR.

## E. Plan mechanics
- [ ] One dependency matrix with `Status`, Definition of Done and (after approval) Issue columns. No second matrix elsewhere.
- [ ] Prerequisites form a DAG, and each prerequisite appears earlier in the matrix.
- [ ] Parallel tasks have disjoint editable files. Lockfiles, shared contracts, configs, recordings and agent instructions are serialized through the orchestrator.
- [ ] Every task names a verified worker mechanism.
- [ ] Each task's tests can actually run with its own editable files (e.g. a unit task is not given route-level tests).
- [ ] Brief paths follow `docs/.agents_brief/<plan-name>-<brief-name>.md`.
- [ ] The cleanup task exists.
- [ ] The critical path, the hotspots, the failure handling and the smaller fallbacks are present.
- [ ] The first bounded task and the review gate are stated.

## F. Mechanical cross-checks (script these)
- [ ] Every referenced acceptance-criterion ID exists in the PRD, with no gaps in the sequence.
- [ ] Every referenced decision, technical-AC, section, server, scenario, task and gate ID resolves to a definition.
- [ ] Every env var name is spelled identically in all documents.
- [ ] No leftover wording from superseded revisions (old field names, removed endpoints, old paths).
- [ ] Relative links and anchors resolve.

## G. Fresh-context review
Start one read-only reviewer: a subagent, or `opencode run … --agent plan`.
- Give it **only** the file list and the categories A–E. Do not give it your conclusions.
- Ask for: severity (blocker/major/minor), `file:line`, a short quote of each conflicting passage, a concrete failure scenario and a fix. No style nits.

Re-verify every finding in the files before fixing it. Record all findings, with their resolution, in the plan's review log.
