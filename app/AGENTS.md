# AGENTS.md — app/ (Hardware Service Decision Copilot)

Nested rules for the Next.js application. These override the root `AGENTS.md` inside `app/`.

## Stack rules
- AI SDK 7 only (`ai@^7`, `@ai-sdk/react@^4`). Do not use `toDataStreamResponse`, `generateObject`, or v5 `useChat` input helpers.
- Chat UI: AI Elements patterns from https://ui.shadcn.com/docs/ai-elements. Registry names: `@shadcn/message`, `@shadcn/message-scroller`, `@shadcn/input-group`. Do not use the legacy `ai-elements` CLI.
- Package manager: npm only (`package-lock.json`). Do not run `npm install` without the orchestrator's approval.
- Every module under `src/server/**` starts with `import 'server-only'`.

## npm scripts
- `npm run dev` / `build` / `start` — Next.js (port 3000 by default)
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Vitest (`tests/unit/**`, `tests/integration/**`); `npm run test:watch` for watch mode
- `npm run test:e2e` — Playwright (`tests/e2e/**`), no mocks
- `npm run capture` — `scripts/capture/index.ts` (created later)

Unit tests under `tests/unit/**/*.test.tsx` need jsdom: put `// @vitest-environment jsdom` as the first line. Node is the default environment. Tests import `vitest` explicitly (no globals).

## Environment
- Load env from the repo-root `.env` or `app/.env.local`. `next.config.ts` loads the root file.
- Required: `OPENROUTER_API_KEY` and `LLM_MODEL`. Template: `app/.env.example`.
- Never commit real keys. Never print them in logs or reports.

## Test data and mock provenance
- Upload tests use real photos from `assets/example-images/` (see its README). Generated non-photo payloads are allowed only for the owner-approved 413/415 cases (ADR-000 TAC-08).
- Never hand-write an OpenRouter or Jev response. Derive mocks from fresh captures in `tests/fixtures/captured/`, following the mock provenance rules in ADR-000 §10.
- Declare every mutation in `MUTATIONS.md`.
- Integration tests replay the LLM API and Jev from recordings. This overrides the root rule "mock only the LLM API".

## Looking up facts
1. The tool's own help: `<tool> --help`.
2. Context7: `npx ctx7@latest library <name> "<question>"`, then `npx ctx7@latest docs <id> "<question>"`. Match the version in `package-lock.json`.
3. Web search last, preferring official vendor pages.
