# Workers, headless commands and tool guidance

## 1. Discover workers (verify each one in this session; never assume)

| Mechanism | How to verify | Typical use |
|---|---|---|
| **The harness's own subagents** (e.g. the Claude Code `Agent` tool with a `model` override such as a small, cheap model) | The tool exists in this session and accepts a model parameter | Small, well-specified modules, test specs, read-only research (Explore / general-purpose / web-fetch types) |
| **OpenCode headless** (`opencode run`), **always available** | `opencode --version`; `opencode run --help`; `opencode auth list`; `opencode models` | Implementation with a provider model; research and second opinions with free models |
| **OpenCode free models** | `opencode models \| grep -- '-free'` and one smoke call (step 3 below) | They work right after installation with no provider. Use them for research, documentation lookups, reviews, and as a fallback worker when paid credit runs out. |
| Other CLI agents (Codex CLI, Copilot CLI, …) | `<tool> --help` and its auth status | Only when installed and authenticated |

**Rules:**
- **Ad hoc workers with an exact brief are the default.** Add a custom role definition only for a recurring role with reusable tool restrictions (e.g. a read-only reviewer), and only after checking whether a built-in agent already provides it (e.g. OpenCode's `plan` agent; verify that it is read-only).
- **Reuse an existing named role only after inspecting** its model and permissions.
- **If the harness cannot run parallel workers,** execute the same matrix sequentially with one agent.
- **The orchestrator owns:**
  - architecture decisions and contradictions;
  - shared contracts, lockfiles, configs, recordings and agent instructions;
  - integration and QA gates;
  - commits and the tracker.
- **Workers never:**
  - install packages;
  - use git;
  - change contracts;
  - accept their own work.

## 2. OpenCode headless commands (copy into the plan; re-check with `opencode run --help`)

**Pre-checks:**
- `opencode --version`
- `opencode auth list`
- `opencode models` (today's list, incl. free `opencode/*-free` models)

If a provider is missing, run `opencode` interactively and use **`/connect`** to add it (e.g. OpenRouter).

**Smoke test a model**, with no tools:

`opencode run -m <provider/model> --agent plan "Smoke test. Do not use tools. Reply with exactly: OK"`

**Implementation task.** Run from the repo root, in the background, one process per task:

`opencode run -m <provider/model> --agent build --title "<task-id> <slug>" --format json "Execute the attached brief exactly. Edit only the files it lists. Write your report to docs/.agents_brief/<plan-name>-<task-id>-<slug>.report.md." -f docs/.agents_brief/<plan-name>-<task-id>-<slug>.md > docs/.agents_brief/<plan-name>-<task-id>-<slug>.log.jsonl 2>&1`

**Follow-up in the same context:** `opencode run -s <sessionID from the JSON log> -m <provider/model> "<follow-up>"`

**Read-only research or review:**

`opencode run -m opencode/<free-model> --agent plan "<question>. Use the tool's --help and Context7 (npx ctx7@latest) before web search. Answer with sources."`

**Gotchas (each one has broken a run before):**
- `-f/--file` is an array. **Put the message before `-f`**, otherwise the message is parsed as a file name ("File not found: …").
- Parallel `opencode run` processes share a local database. **Stagger their starts** by a few seconds to avoid lock errors. Read the session ID from the JSON log.
- **Never pass `--auto`.** Restrict worker permissions in the project `opencode.json`: deny `git commit*`, `git push*` and package installs. Verify the permission syntax in the current OpenCode docs before relying on it.
- Acceptance never comes from the worker's log. The orchestrator reads `git diff -- <task files>` and re-runs the checks.

## 3. Tool guidance for every agent (copy verbatim into every brief)

1. **Look up facts in this order:**
   1. The tool's own help: `<tool> --help` or `<tool> <command> --help`. This covers build tools, scaffolders, `gh`, `opencode`, the browser automation CLI, `ffmpeg`, the package manager.
   2. **Context7** for library and framework APIs, matched to the version in the lockfile: MCP `resolve-library-id` → `query-docs`, or the CLI `npx ctx7@latest library <name> "<question>"` → `npx ctx7@latest docs <id> "<question>"`. Use the Context7 IDs already recorded in the ADRs directly. If the MCP reports a quota error, use the CLI.
   3. **Web search last,** preferring official vendor pages and their `llms.txt` indexes.
2. **Delegate research instead of doing it inline:**
   - the orchestrator sends broad lookups to subagents (read-only search, general research, web fetch);
   - workers that cannot start subagents use a CLI agent: `opencode run -m opencode/<free-model> --agent plan "<question>; answer with sources"`;
   - research results go into the report, with their sources.
3. **Package manager:** use the one the lockfile implies. If pnpm is missing, npm is fine. Workers ask the orchestrator for new dependencies instead of installing them.
4. **Available tools:** list them in the brief with what each may be used for, e.g. `git` and `gh` writes are for the orchestrator only.
5. **Sandbox denials:** never work around them. Use the sanctioned alternative (e.g. `git rm` instead of `rm`) or report the denial.
6. **TDD:** a failing behavioral test first (record the red output), then the minimum code, then green. Never weaken a test to make it pass.
7. **Contradictions** with the brief, contracts or documents are reported, not resolved.
