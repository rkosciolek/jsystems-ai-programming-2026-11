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

## LLM recordings (T03b)

| Recording | Call |
|---|---|
| `llm-vision-complaint-laptop-1`, `llm-vision-return-phone-1` | `generateText` + `Output.object(ImageAnalysisSchema)`, system `vision-*`, processed JPEG (<= 2048 px) + form fields and Jev answers as "unverified hints". Sent with `structuredOutputs: { strict: false }`: with `strict: true` and an image part OpenRouter answers HTTP 200 with a 502 `provider_unavailable` body. |
| `llm-decision-complaint-laptop-1`, `llm-decision-return-phone-1` | `generateText` + `Output.object(DecisionOutcomeSchema)`, system `decision-*` + `<policy>`, user = case number, form JSON, DateFacts, ImageAnalysis (from the vision recording), Jev answers with certainty; reasoning effort `medium` |
| `llm-chat-reply` | `streamText`, system `chat` + `<policy>` + `<case>`, tool `revise_decision`, `stopWhen: stepCountIs(2)`; the tool is not called |
| `llm-chat-tool-step1`, `llm-chat-tool-step2` | One chat turn with two HTTP exchanges: step 1 streams the `revise_decision` tool call, step 2 streams the text after the tool result `{applied:true, previous:'rejected'}`. Replay in order: step1 then step2. |

Streamed bodies: `response.body` is the byte-exact SSE stream. `response.meta.json` has an extra `chunkSizes` array (byte length of every chunk as `fetch` delivered it); a replay `fetch` re-emits `response.body` sliced by these sizes. Non-streamed recordings carry the array too (usually one chunk).

`capture.json` of LLM recordings additionally holds `today` (the date used to compute DateFacts), `promptHashes` (sha256 of every prompt file used) and `policyHash` (sha256 of the policy file). Inputs derived from earlier recordings: the Jev answers come from `jev-*` recordings, the ImageAnalysis and first assistant message from the `llm-vision-*`/`llm-decision-*` recordings. Re-capture in order: `jev-*`, vision, decision, chat. `CAPTURE_ONLY=all` also re-records the Jev and error recordings (and loses the manual `user_id` redaction of `llm-error-unknown-model`): capture the LLM recordings one by one (`CAPTURE_ONLY=llm-vision-complaint-laptop-1`, ...) instead.

`llm-chat-tool` case context is hand-built input (not a response): a return from the `phone-1` form with channel `store`, purchase date 10 days before capture, current decision `rejected` citing `§3 ust. 1` and `§3 ust. 2`, and a hand-written first assistant message. The model responses are real.
