# Tracking with GitHub issues (after the owner approves the plan)

Until approval, the plan's `Status` column is the only tracker. Create issues only after approval, and only after the owner has said that issues are wanted. On a public repository, issue text is public, so it must contain no secrets or personal data.

## 1. Pre-checks
- `gh auth status`: logged in.
- `gh repo view --json hasIssuesEnabled,visibility`. If issues are disabled, ask the owner to enable them; changing repository settings may need admin rights that the token lacks (HTTP 403). Do not try to bypass it.
- `gh issue create --help`: confirm `--parent` (sub-issues) and `--label` are supported.
- Creating a label proves the token can write.
- Projects need the `project` scope (`gh auth refresh -s project`). Use a project only if the owner asks.

## 2. Labels
`gh label create <name> --color <hex> --description <text> --force`

| Label | Meaning |
|---|---|
| `epic` | The parent issue |
| `task` / `qa-gate` | Kind of sub-issue |
| `phase:P0`…`phase:Pn` | Phase |
| `status:ready` | All prerequisites closed |
| `status:in-progress` | Brief dispatched or work running |
| `status:review` | The orchestrator is verifying |
| `status:blocked` | Waiting on the owner, an external service or a failed gate |

A closed issue means accepted and committed.

## 3. Issues
1. **Epic.** Purpose; source documents (with the branch); the phase table; how to track progress (the sub-issue progress bar, the status labels, `gh` commands); ground rules.
2. **One sub-issue per matrix row,** created in matrix order with `--parent <epic>`. Prerequisites always point to earlier rows, so they can be rewritten as `#n` while creating.
   - Title: `[<ID>] <descriptive title>`. Gate titles name what they check, e.g. `[Q3] QA gate: decision pipeline on real servers`.
   - Body: phase; the plan row; observable outcome; PRD/ADR links; prerequisites (`ID (#n)`); owner/model; editable files; verification; brief path; tool guidance (short form with a link to the plan section); Definition of Done.
   - Labels: phase + kind, and a status label where it already applies (e.g. `status:blocked` for an owner-only task).
3. **Script the creation** from the matrix. Parse the rows; never retype them. Check the sub-issue summary afterwards: `gh api repos/<owner>/<repo>/issues/<epic> --jq .sub_issues_summary`.
4. **Write the ID → issue map** into the plan's `Issue` column (or §5.1) and commit it.
5. **File links** in issues resolve only after the branch is pushed. Say so, and ask before pushing.

## 4. During execution
On every status change, the orchestrator:
- swaps the status label;
- comments with: the brief and report paths, the worker and session ID, the commands with counts, the screenshot folder (gates) and the accepting commit;
- closes the issue with `Closes #n` in the accepting commit, or closes it by hand with a link to that commit;
- updates the plan's `Status` column in the same commit.

The owner can follow progress with:
- `gh issue view <epic>`
- `gh issue list --label status:in-progress`
- `gh issue list --label status:blocked`
- `gh issue list --label phase:P<k> --state all`

## 5. After the Definition of Done
Close the epic once the cleanup task (plan and briefs removed) is committed and the PR is open or merged, as the owner defined.
