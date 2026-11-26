# Captured recordings

Verbatim HTTP exchanges with OpenRouter (chat completions through `@openrouter/ai-sdk-provider`) and the Jev Decisions API. Each directory holds:

- `request.json` - method, URL, headers (without `Authorization`) and body
- `response.meta.json` - status and all response headers
- `response.body` - the raw body as returned by `fetch` (already content-decoded)
- `capture.json` - date, requested model, model snapshot from the response, question-set hash (Jev), app commit, photo

Rules: ADR-000 section 10 "Mock provenance rules". Never edit a recording by hand; declare derived variants in `MUTATIONS.md`.

## Re-capture

From `app/`, with `OPENROUTER_API_KEY` in the repo-root `.env` or `app/.env.local` (loaded by `node --env-file-if-exists`, never printed):

```
CAPTURE_ONLY=all npm run capture                 # every recording below
CAPTURE_ONLY=jev-return-phone-1 npm run capture  # one recording
CAPTURE_ONLY=smoke npm run capture -- --disableConsoleIntercept   # gate smoke checks, nothing saved
```

The runner is Vitest (`scripts/capture/vitest.config.mts`), because plain Node type stripping cannot resolve the `server-only` import and extensionless imports. Re-capture after a change of model ID, Jev question, prompt file or provider major version. Afterwards run `grep -r "sk-or-" tests/fixtures` (must be empty).

Jev recordings send the processed JPEG shrunk to 1568 px per side (Jev limit), see the report of T03a.
