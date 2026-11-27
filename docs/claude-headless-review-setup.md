# Claude Code headless PR review: setup (subscription token)

The workflow `.github/workflows/claude-headless-review.yml` installs the Claude Code CLI on the
runner and runs `.github/scripts/claude_pr_review.sh`. The script passes the PR diff to
`claude -p` (headless mode) and posts the Markdown review as **one PR comment**, updated on every
push. The review also appears in the run's job summary.

It runs on your **Claude subscription** (Pro, Max, Team or Enterprise) with a long-lived OAuth token
in the `CLAUDE_CODE_OAUTH_TOKEN` secret. Reviews count against your plan's usage limits, not
API billing. Until the secret exists, every run logs `skipped: secret not configured` and passes.

> **Scope:** your own token on your own repositories is the documented use. For a bot shared across
> a team or company, Anthropic recommends an API key or workload identity federation instead,
> because the token is tied to the subscription of the person who created it.

## 1. Create the token

In a terminal on your machine (not inside a Claude session):

```bash
claude setup-token
```

1. A browser opens with the same sign-in as `/login`. Sign in with the account whose plan should
   cover the reviews.
2. The terminal prints a token that is valid for **one year**. It isn't saved anywhere, so copy it
   now. Don't paste it into chat, a file or a commit.
3. The token can only make model requests (no Remote Control, no claude.ai connectors). That's
   all the review needs.

## 2. Add the secret on GitHub

1. Open the repository → **Settings** (gear icon in the top menu).
2. Left sidebar: **Secrets and variables → Actions**.
3. Tab **Secrets** → **New repository secret**.
4. Name: `CLAUDE_CODE_OAUTH_TOKEN` (exactly, it's case-sensitive). Secret: paste the token.
5. Click **Add secret**. GitHub never shows the value again; you can only update or delete it.

Don't also add `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` to this workflow. Either one takes
precedence over the subscription token, so the script stops with an error if one is set.

## 3. (Optional) Variables

Same page, tab **Variables**:

| Name | Default | Note |
|---|---|---|
| `CLAUDE_MODEL` | `sonnet` | Alias (`sonnet`, `opus`, `haiku`, `fable`) or a full model ID. `opus`/`fable` use up plan limits faster |
| `CLAUDE_CODE_VERSION` | `2.1.332` | CLI version installed from npm. Pinned so a new release can't change CI unexpectedly |

## 4. Test it

1. Push a commit to a branch with an open, **non-draft** PR from this repository. Fork PRs get no
   secrets and are skipped.
2. **Actions → Claude Headless Review**: `Check Claude subscription token`, `Install Claude Code`,
   `Run headless review` and `Post or update PR comment` should all be green.
3. The PR shows a **"Claude headless review"** comment with *Blocking issues*, *Non-blocking
   issues*, *Missing tests* and *Summary*. The footer shows the model and the number of turns.

## 5. Renew the token before it expires

The token lasts one year. Add a calendar reminder, run `claude setup-token` again and update the
secret (step 2 → the secret → **Update**).

## What the workflow does for safety

- Claude gets only the read-only tools `Read`, `Grep` and `Glob`: no Bash, editing or web access.
- `persist-credentials: false` keeps the GitHub token out of `.git/config`, so Claude can't read it.
- The diff is treated as data. The prompt tells Claude to ignore instructions inside it.
- Diffs over 300 kB are skipped instead of sent (`MAX_DIFF_BYTES` in the script).
- The script doesn't use `--bare`, because `--bare` never reads `CLAUDE_CODE_OAUTH_TOKEN`. Without
  it, Claude also loads the repository's `CLAUDE.md`/`AGENTS.md` as review context.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `skipped: secret not configured` | The secret is missing or misnamed. It must be exactly `CLAUDE_CODE_OAUTH_TOKEN` |
| `Invalid API key` / `401` / `authentication_error` | The token expired, was revoked or was copied incorrectly. Run `claude setup-token` again and update the secret |
| `Unset ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN` | One of them is set in the workflow env. Remove it |
| Rate-limit or usage-limit error | Your plan's limit is used up. Wait for the reset, or set `CLAUDE_MODEL` to a smaller model |
| `Claude returned an error: error_max_turns` | Raise `--max-turns` in the script, or review a smaller PR |
| No comment, but the run is green | Check the job summary. The token needs `pull-requests: write` (Settings → Actions → General) |

Sources: <https://code.claude.com/docs/en/headless>,
<https://code.claude.com/docs/en/authentication#generate-a-long-lived-token>,
<https://code.claude.com/docs/en/legal-and-compliance>.
