# Claude Code headless PR review: setup

The workflow `.github/workflows/claude-headless-review.yml` installs the Claude Code CLI on the
runner and runs `.github/scripts/claude_pr_review.sh`. The script passes the PR diff to
`claude -p` (headless mode) and posts the Markdown review as **one PR comment**, updated on every
push. The review also appears in the run's job summary. Until a secret exists, every run logs
`skipped: secret not configured` and passes.

## 1. Choose how Claude authenticates

| Secret | Source | Billing | When to use |
|---|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | `claude setup-token` | your Pro/Max/Team/Enterprise plan limits | your own repo, your own token (this course) |
| `ANTHROPIC_API_KEY` | [Claude Console](https://platform.claude.com) → API keys | pay per token | team or company CI, a secret shared across repos |

Anthropic's docs recommend an API key (or workload identity federation) for a secret shared
across repos, because an OAuth token is tied to the subscription of the person who created it.

If both secrets are set, the API key wins. The script then uses `--bare` and a
`--max-budget-usd` cap. `--bare` never reads `CLAUDE_CODE_OAUTH_TOKEN`, so with only the OAuth
token the script runs without `--bare`.

## 2. Create the token (OAuth option)

In a terminal on your machine (not in a Claude session):

```bash
claude setup-token
```

1. A browser opens with the same sign-in as `/login`. Sign in with the account whose plan should pay
   for the reviews.
2. The terminal prints a token that is valid for **one year**. It isn't saved anywhere, so copy it
   now. Don't paste it into chat, a file or a commit.
3. The token can only make model requests (no Remote Control, no claude.ai connectors).

## 3. Add the secret on GitHub

**Repository → Settings → Secrets and variables → Actions → Secrets → New repository secret**

- Name: `CLAUDE_CODE_OAUTH_TOKEN` (or `ANTHROPIC_API_KEY` for the API key option)
- Secret: paste the value → **Add secret**

## 4. (Optional) Variables

**Settings → Secrets and variables → Actions → Variables**

| Name | Default | Note |
|---|---|---|
| `CLAUDE_MODEL` | `sonnet` | Alias (`sonnet`, `opus`, `haiku`, `fable`) or a full model ID |
| `CLAUDE_MAX_BUDGET_USD` | `1` | Spending cap per review. Used only with `ANTHROPIC_API_KEY` |
| `CLAUDE_CODE_VERSION` | `2.1.332` | CLI version installed from npm. Pinned so a new release can't change CI unexpectedly |

## 5. Test it

1. Push any commit to a branch with an open, non-draft PR from this repository. Fork PRs get no
   secrets and are skipped.
2. **Actions → Claude Headless Review**: `Check review secret`, `Install Claude Code`,
   `Run headless review` and `Post or update PR comment` should all be green.
3. The PR shows a **"Claude headless review"** comment with the sections *Blocking issues*,
   *Non-blocking issues*, *Missing tests* and *Summary*, plus a footer with turns and the
   API-equivalent cost.

## What the workflow does for safety

- Claude gets only the read-only tools `Read`, `Grep` and `Glob`: no Bash, editing or web access.
- `persist-credentials: false` keeps the GitHub token out of `.git/config`, so Claude can't read it.
- The diff is treated as data. The prompt tells Claude to ignore instructions inside it.
- Diffs over 300 kB are skipped instead of sent (`MAX_DIFF_BYTES` in the script).

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `skipped: secret not configured` | The secret is missing or misnamed |
| `Invalid API key` / `401` with the OAuth token | The token expired or was copied incorrectly. Run `claude setup-token` again and update the secret |
| Error about auth while only the OAuth token is set | Someone added `--bare` to the script; `--bare` reads only `ANTHROPIC_API_KEY` |
| `Claude returned an error: error_max_turns` | Raise `--max-turns` in the script, or review a smaller PR |
| `Claude returned an error: error_max_budget_usd` | Raise `CLAUDE_MAX_BUDGET_USD` |
| No comment, but the run is green | Check the job summary. The token needs `pull-requests: write` (Settings → Actions → General) |

Sources: <https://code.claude.com/docs/en/headless>, <https://code.claude.com/docs/en/authentication>,
<https://code.claude.com/docs/en/github-actions>.
