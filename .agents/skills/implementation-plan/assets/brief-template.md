# Worker briefs

## Location, naming and lifecycle

| Item | Rule |
|---|---|
| Folder | `docs/.agents_brief/` |
| Brief | `docs/.agents_brief/<plan-name>-<brief-name>.md`, where `<plan-name>` is the plan file name without `.md`, and `<brief-name>` is the task ID plus a kebab-case slug, e.g. `T06-rules` |
| Worker report | Next to the brief: `<plan-name>-<brief-name>.report.md` |
| Fix rounds | `<plan-name>-<brief-name>-r2.md`, `-r3`… |
| Raw CLI logs | `docs/.agents_brief/*.log.jsonl`, **gitignored** (the plan's first task adds the rule) |
| When written | **Just before dispatch**, never ahead of time, so it reflects the current contracts and predecessor outputs |
| Commit | The brief and its report go in the commit that accepts the task; the issue comment links them |
| Deletion | After the whole plan's Definition of Done, the cleanup task removes `docs/.agents_brief/<plan-name>-*` and the plan in one `git rm` commit. The outcome is summarized in the final PR first. Git history keeps them. |

## Content (in this order)

```markdown
# Brief <task-id>: <title>

**Plan:** docs/plans/<plan-name>.md, row <task-id> · **Issue:** #<n> · **Phase:** P<k>
**Concurrent tasks:** <IDs and their editable files>, so you know what not to touch
**Worker:** <mechanism and model>

## Goal and observable outcome
<from the matrix row>

## Context you need (do not rediscover the architecture)
- Links: PRD <AC IDs>, ADR <sections>, design <sections>. Link for traceability.
- Excerpts: the exact contract types, schemas, function signatures and env vars this task uses.
- Predecessor outputs: file paths and short summaries of what they export.
- Recordings to use (for external endpoints): names in tests/fixtures/captured/; any mutation must be declared in MUTATIONS.md.

## Editable files (only these)
- <exact paths>

## Tool guidance
<copied verbatim from workers-and-tools.md §3, with the concrete commands for this project>

## Steps
1. Write the failing behavioral test(s): <inputs → expected results>. Run them and record the red output.
2. Implement the minimum code.
3. Run: <exact commands>. Expected: <counts / results>.
4. <task-specific steps>

## Test data
<the real fixtures to use; any approved exception>

## Report (write to docs/.agents_brief/<plan-name>-<brief-name>.report.md)
- Changed files
- Commands run with their output summary (red, then green, then counts)
- Contradictions or gaps found (do not resolve them)
- Requests for the orchestrator (dependencies, contract changes, new mutations)
```

**Rules for brief authors (the orchestrator):**
- A small worker must be able to finish from the brief alone. Embed excerpts rather than "see ADR".
- One task, one bounded deliverable, one commit boundary.
- State the concurrent work, so the worker stays inside its files.
- Never ask a worker to accept its own result or to change the agreed scope.
