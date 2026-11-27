# PR-Agent review with OpenRouter: setup

The workflow `.github/workflows/pr-agent-openrouter-review.yml` runs the community
[PR-Agent](https://github.com/the-pr-agent/pr-agent) v0.47.0 on pull requests. It calls the model
`openai/gpt-6-luna` through [OpenRouter](https://openrouter.ai). Until the secret from step 2
exists, every run only logs `skipped: secret not configured (OPENROUTER_API_KEY)` and passes.

## 1. Get an OpenRouter API key

1. Sign in at <https://openrouter.ai> and add credits under **Settings → Credits**. A paid model
   such as `openai/gpt-6-luna` refuses requests when the balance is zero.
2. Open the model page <https://openrouter.ai/openai/gpt-6-luna> and check that the model exists
   and is available for your account. The model ID must match exactly.
3. Create a key under **Settings → Keys**, name it for example `github-pr-agent`, and set a
   **credit limit** on it. A runaway workflow then can't spend more than that limit.
4. Copy the key (`sk-or-v1-...`). You see it only once. Don't paste it into a file, a commit or
   chat.

## 2. Add the key to GitHub as a secret

In the GitHub UI: **Repository → Settings → Secrets and variables → Actions → Secrets →
New repository secret**

- Name: `OPENROUTER_API_KEY`
- Value: the key from step 1

Or with the GitHub CLI, which prompts for the value so it stays out of shell history:

```bash
gh secret set OPENROUTER_API_KEY
```

## 3. (Optional) Set variables

Both have defaults in the workflow, so you can skip this step.

| Variable | Default | When to change it |
|---|---|---|
| `PR_AGENT_MODEL` | `openrouter/openai/gpt-6-luna` | To use another OpenRouter model. Always keep the `openrouter/` prefix |
| `PR_AGENT_MAX_TOKENS` | `250000` | Lower it for a smaller model or a tight credit limit |

```bash
gh variable set PR_AGENT_MAX_TOKENS --body 120000
```

**Important:** the old Azure setup used `PR_AGENT_MODEL=gpt-6-luna`, with no prefix. If that
variable still exists, validation fails with "PR_AGENT_MODEL must look like openrouter/…". Delete
it or set it to `openrouter/openai/gpt-6-luna`:

```bash
gh variable list
gh variable delete PR_AGENT_MODEL
```

## 4. Remove the old Azure settings

The workflow no longer reads them. Delete them so no unused credential stays behind:

```bash
gh secret delete AZURE_OPENAI_API_KEY
gh variable delete AZURE_OPENAI_ENDPOINT
gh variable delete AZURE_OPENAI_DEPLOYMENT
gh variable delete AZURE_OPENAI_API_VERSION
```

(An error that a name doesn't exist is fine.)

## 5. Check Actions permissions

**Settings → Actions → General**

- **Actions permissions:** Actions must be allowed for this repository.
- **Workflow permissions:** the workflow asks for `issues: write` and `pull-requests: write` so it
  can post the review comment. If an organization policy caps `GITHUB_TOKEN` at read-only, the
  review runs but can't comment.

## 6. Push the workflow and test it

1. Commit and push the branch, then open a non-draft PR from a branch in this repository. Fork
   PRs are skipped on purpose, so they can't use your secret.
2. `pull_request` events use the workflow file from the PR branch, so the PR that adds this
   workflow is reviewed by it as well.
3. Open **Actions → Community PR-Agent OpenRouter Review** and check the run:
   - `Check review secret` → `configured=true`
   - `Validate OpenRouter configuration and PR` → green
   - the review step → a "PR Reviewer Guide" comment appears on the PR
4. Check the request and its cost on OpenRouter under **Activity**.

## 7. Comment commands and manual runs (after merge to `main`)

GitHub runs `issue_comment` and `workflow_dispatch` workflows only from the **default branch**.
These work only after the workflow is merged to `main`:

- Comment on a PR with `/review`, `/describe`, `/improve` or `/ask <question>`. You need write,
  maintain or admin permission on the repository.
- Run it manually for a PR number:

  ```bash
  gh workflow run pr-agent-openrouter-review.yml -f pr_number=123
  ```

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `skipped: secret not configured` | The secret is missing or misnamed. It must be exactly `OPENROUTER_API_KEY` |
| `PR_AGENT_MODEL must look like openrouter/...` | An old variable without the prefix. See step 3 |
| `401` / `AuthenticationError` in the log | The key was revoked or copied incorrectly. Create a new key and set the secret again |
| `402` / insufficient credits | Add credits or raise the key's credit limit |
| `404` / model not found | The model ID is wrong, or the model isn't available on OpenRouter. Check the model page |
| Review runs but posts no comment | `GITHUB_TOKEN` is limited to read-only. See step 5 |
| Nothing runs for a `/review` comment | The workflow isn't on `main` yet, or the commenter lacks write permission |
