# T02 (rest) report: scaffold configuration

Status: partially verified. The `curl` HTTP 200 check was denied by the permission system, so the server-start check is not complete.

## Files changed
- `app/package.json`: scripts `typecheck`, `test`, `test:watch`, `test:e2e`, `capture` added. No install was run.
- `app/tsconfig.json`: `noUncheckedIndexedAccess: true` added; `strict` kept.
- `app/next.config.ts`: `loadEnvConfig(path.resolve(process.cwd(), ".."))` from `@next/env` added before the export; the turbopack rule is kept.
- `app/vitest.config.ts` (new): react plugin, tsconfig paths, `server-only` alias to the stub, include globs, `environment: "node"`, `setupFiles`, `passWithNoTests: true`.
- `app/tests/setup.ts` (new): imports `@testing-library/jest-dom/vitest`.
- `app/tests/server-only-stub.ts` (new): empty module.
- `app/playwright.config.ts` (new): minimal, `testDir` `./tests/e2e`, chromium project.
- `app/.env.example` (new): all ADR-000 section 7 variables, `OPENROUTER_API_KEY=` empty. No `.env` file was opened.
- `.gitignore` (root): `app/var/` added.
- `opencode.json` (root, new): bash deny for `git commit*`, `git push*`, `npm install*`, `npm i *`.
- `app/AGENTS.md` (new, about 45 lines, English).
- `app/README.md`: "Run" section added above the existing text; the checklist is unchanged.

## Checks (run in `app/`)
- `npm run lint`: PASS, exit 0, no output.
- `npm run typecheck`: first run FAIL, exit 2: `src/app/layout.tsx(20,50): Cannot find name 'LayoutProps'`. Cause: the generated Next route types do not exist before `next typegen`. Fix: script changed to `next typegen && tsc --noEmit`. Re-run: PASS, exit 0. This deviates from the brief's literal `tsc --noEmit`; the fix is in the script only, and `src/` was not touched.
- `npm test`: PASS, exit 0, "No test files found, exiting with code 0". Vitest 5.1.2 printed two warnings: ESM config loaded as CJS (the `vitest.config.ts` file), and a note that `vite-tsconfig-paths` can be replaced by `resolve.tsconfigPaths`. Neither is an error.
- `npm run build`: PASS, exit 0. Next.js 16.4.6 (Turbopack), compiled in 11.2s, TypeScript finished, static routes `/` and `/_not-found`. No `serverExternalPackages` was needed for sharp.
- `npm start -- -p 3000`: started in the background. `curl -sI http://localhost:3000` was DENIED by the permission system, so the HTTP 200 check is NOT verified. The server was stopped with TaskStop (task `bhh492t5v`).

## opencode permission evidence (CLI 1.19.0)
- `opencode debug config` shows the four bash deny rules, so the config is accepted.
- `opencode debug agent plan` shows the bash deny rules applied to the plan agent.
- The built-in `plan` agent is read-only for files only: `edit` is denied for `*` except `.opencode/plans/*.md`. `bash` is NOT denied as a whole; it is allowed by the default `*` rule except for the four patterns above. So `plan` is not read-only for shell commands.
- Context7 docs for newer opencode show a different `permissions` array format. The installed 1.19.0 accepted the `permission.bash` map form used in the brief.

## Open questions
1. Permission to run `curl -sI http://localhost:3000` (or an equivalent check) is needed to close the start check.
2. The `plan` agent can run non-denied shell commands. T21 review should not rely on it being read-only in the shell sense. Should the config also deny `rm*` or other mutating shell commands?
3. Approve the typecheck script deviation (`next typegen && tsc --noEmit`), or keep the literal `tsc --noEmit` and create the generated types another way.
4. `.env.example` lives in `app/`; the root `.env.example` was not changed, per the brief. Sync is needed if the root file should also list the optional variables.
5. Vitest `environmentMatchGlobs` is not used; jsdom is selected per file with a `// @vitest-environment jsdom` docblock (documented in `app/AGENTS.md`). The `vite-tsconfig-paths` deprecation warning is left unresolved.
6. The `capture` script points to `scripts/capture/index.ts`, which does not exist yet (expected).
7. No packages were installed and no git operations were run.
