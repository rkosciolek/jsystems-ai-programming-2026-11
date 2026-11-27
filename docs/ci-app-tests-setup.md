# App tests in GitHub Actions: setup

The workflow `.github/workflows/app-tests.yml` tests `app/` on every pull request, on every
push to `main` and when started by hand:

| Job | What it runs | Needs the OpenRouter key |
|---|---|---|
| Detect app | Checks for `app/package-lock.json`. Without it the other jobs are skipped | no |
| Lint, typecheck, unit and integration tests | `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` | no (mocks and captured recordings) |
| E2E (Playwright, real OpenRouter) | `npm run build`, then `npm run test:e2e` (8 servers; Chromium and Firefox) | **yes** |

Until the PoC app (`feat/poc-app`) is merged into `main`, runs on branches without the app only
log `skipped: no app/package-lock.json on this ref`.

## Secrets (Settings → Secrets and variables → Actions → Secrets)

| Name | Required | Note |
|---|---|---|
| `OPENROUTER_API_KEY` | yes | Already set for PR-Agent. The same key is reused. E2E fails with a clear error without it |

Nothing else is secret. `GITHUB_TOKEN` is provided automatically.

## Variables (Settings → Secrets and variables → Actions → Variables)

All are optional. The defaults match `app/.env.example`.

| Name | Default | Note |
|---|---|---|
| `LLM_MODEL` | `openai/gpt-6-luna` | Chat and decision model. OpenRouter ID **without** the `openrouter/` prefix |
| `VISION_MODEL` | value of `LLM_MODEL` | Image analysis model |
| `JEV_MODEL` | `typesafe/jev-1.14` | Fast classifier model |
| `LLM_REASONING_EFFORT` | `medium` | `minimal`, `low`, `medium` or `high` |

Don't mix this up with PR-Agent's `PR_AGENT_MODEL`, which **needs** the `openrouter/` prefix.

The E2E matrix (`app/tests/e2e/servers.ts`) sets `DECISION_MODE`, `CASE_TIMEOUT_MS`,
`CASE_TTL_MS` and `DECISION_LOG_PATH` per server. Don't add them as variables, because the
workflow would ignore them.

## Cost and limits

- Every E2E run makes real paid calls. `@model` specs are retried up to 2 times. A credit limit on
  the OpenRouter key caps the cost; see `docs/pr-agent-openrouter-setup.md`.
- Fork pull requests get no secrets, so E2E is not run for them.
- On failure, `app/var/e2e/` (Playwright results and decision logs) is uploaded as the
  `e2e-results` artifact for 7 days.
