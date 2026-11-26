# Brief T13 — vision and decision steps (LLM layer)

- **Task:** T13, issue #22. Prerequisites T03b, T06, T09b, T10 accepted. Concurrent: other workers outside `app/src/server/llm/**`.
- **Worker:** Luna (OpenCode). Repo root `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
- `docs/ADR/001-ai-decision-pipeline.md` §3.5, §3.6 (call, user content, hard constraints, retry once, `llm_inconsistent`, finalizer), §5 (`analyzeImage`, `decide`, `finalizeFirstMessage`, `LlmError`), TD-103, §8 rows "Decision LLM retry", "Disclaimer", "Policy isolation", TAC-001-03.
- `docs/ADR/000-main-architecture.md` §10 "Mock provenance rules" (replay through the **real provider** with an injected `fetch`; `MockLanguageModelV4` only in unit tests with recorded content).
- **T03b findings (binding):** the vision call needs provider option `structuredOutputs: { strict: false }` (strict JSON schema with an image returns `200` with an `error` body); any `200` whose body carries an `error` object must be treated as an upstream error. See `app/tests/fixtures/captured/README.md` and `app/scripts/capture/llm.ts` for exactly how the recorded calls were made — production code must build the same requests (same prompts, schemas, options) so the replay matches.
- Code: `app/src/server/rules` (`checkLlmOutcome`, `ClassifierResult`), `app/src/server/templates` (`renderFirstMessage`, `finalizeFirstMessage`, `validateFirstMessage`), `app/src/server/prompts`, `app/src/server/policies`, `app/src/server/env`, `app/src/lib/domain`, `app/tests/helpers/replay-fetch.ts` (from T07; if missing, report and use a local helper with the same API), `app/tests/fixtures/captured/**`. `app/AGENTS.md`.

## Contract (`app/src/server/llm/`, every file `import 'server-only'`; **not** `chat*.ts` — T16 owns those)
- `provider.ts`: `getOpenRouter(deps?: { fetch?: typeof fetch; apiKey?: string })` via `createOpenRouter`.
- `errors.ts`: `class LlmError extends Error { kind: 'upstream'|'timeout'|'invalid_output' }`; `toLlmError(e, signal)` (abort by timer → `timeout`; provider API errors, network `TypeError`, 200-with-error → `upstream`; schema failure → `invalid_output`).
- `analyze-image.ts`: `analyzeImage(input, jpeg, classifier, signal, deps?) → ImageAnalysis` (model `VISION_MODEL`, system `vision-<caseType>`, user = image file part + text with form fields and Jev answers labelled "unverified hints"; `temperature: 0`, `maxRetries: 1`).
- `decide.ts`: `decide(input, facts, analysis, classifier, caseId, signal, deps?) → { outcome: DecisionOutcome; inconsistent: boolean }`: model `LLM_MODEL`, reasoning effort `LLM_REASONING_EFFORT` (provider options), system = `decision-<caseType>` + `<policy>` of **that** case type only; user = form JSON, DateFacts, ImageAnalysis, Jev answers with certainty, case number. After the call run `checkLlmOutcome` and `validateFirstMessage`; on a violation retry **once** with the violations listed; if it fails again return the `escalated` outcome rendered with the `llm_inconsistent` template and `inconsistent: true`. `path` is forced to `llm`.
- `index.ts` re-exports and `finalizeFirstMessage` (delegates to templates).

## Editable files
`app/src/server/llm/**` except `chat*`, `app/tests/integration/llm/**`, `app/tests/unit/llm/**`, `app/tests/fixtures/captured/MUTATIONS.md` (append rows only).

## Steps
1. Tests first:
   - Integration (replay fetch + real provider): vision complaint/return parse to `ImageAnalysis`; decision complaint/return return a validated outcome; the request body sent to the replay fetch contains the complaint policy and **not** the return policy (and vice versa); retry: first response a declared mutation that violates a hard rule (e.g. `accepted` for impact on an expired complaint), second the unmodified recording → 2 requests, outcome from the second; both mutated → `escalated` + `inconsistent`; recorded 400/401 → `LlmError('upstream')`; network `TypeError` → `upstream`; abort via an `AbortSignal.timeout` shorter than a delayed replay → `timeout`.
   - Unit: prompt assembly (system text contains the right prompt and policy), with `MockLanguageModelV4` content copied from a named recording.
   Declare every mutation in `MUTATIONS.md`. No inline response bodies. Red → record.
2. Implement; tests, lint, typecheck green.

## Tool guidance (plan §4.2)
1. `--help` → Context7 (`npx ctx7@latest docs /vercel/ai/ai_7.0.0 "generateText Output.object providerOptions"`, `npx ctx7@latest docs /openrouterteam/ai-sdk-provider "createOpenRouter fetch reasoning structuredOutputs"`) → official docs last.
2. Research via `opencode run -m opencode/deepseek-v4.1-flash-free --agent plan "<q>; answer with sources"`.
3. npm only, never install. No git. Never open `.env`; never make real API calls (replay only). Edit only the listed files. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-T13-llm-layer.report.md`: files, red/green with counts, mutations, contradictions.
