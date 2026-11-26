# Brief Q1 — QA gate for phase P1 (scaffold, theme, header)

- **Gate:** Q1, issue #8. **Worker:** QA subagent (Sonnet). Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.
- Nothing else runs in parallel on port 3000.

## Read
`docs/plans/poc-implementation-plan.md` §5 (screenshot rules) and §7 (Q1 row, "Every gate also"); `docs/design-guidelines.md` (Colors, Typography, Components → Header, Primary button, Logo placement); `assets/homepage.png` and `assets/homepage-hero.png` (look at them); `app/AGENTS.md`. Memory note: `playwright-cli` is in `~/.local/bin`; headed mode works. Run `playwright-cli --help` first.

## Steps
1. **Automated checks** in `app/`, each recorded separately (pass/fail + count lines): `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
2. **Startup:** `npm start -- -p 3000` in the background; record that it reports ready. Check the HTTP status of `/` with `playwright-cli` (navigation) — do not use `curl`.
3. With `playwright-cli` on `http://localhost:3000/`:
   - viewport 1920×1080 and 360×800: full-page screenshot each;
   - check `document.documentElement.lang === 'pl'`, `scrollWidth <= innerWidth` at 360 px, computed `font-family` contains Noto Sans, header text "Hardware Service Decision Copilot" in navy `rgb(0, 57, 99)`;
   - the sample button: computed border 1px `rgb(0, 150, 224)`, radius 22px, white background, navy bold text; tab to it and screenshot the visible focus ring;
   - browser console: no errors or warnings.
4. Compare the screenshots with `assets/homepage-hero.png`: header white, navy wordmark top-left, outlined pill button, colors, typography. State each match or mismatch.
5. Save screenshots to `docs/plans/qa/Q1/` as `NN-<screen>-<viewport>.png` (e.g. `01-home-1920.png`, `02-home-360.png`, `03-button-focus-1920.png`). No terminal, no `.env`, no secrets in any image. Write `docs/plans/qa/Q1/README.md`: one row per screenshot (file, what it shows, pass/fail), the check results from steps 1–3, startup result, console result, and the brand comparison.
6. Stop only the server process you started. Delete nothing else.

## Rules
Do not edit any application file. If something fails, report it as a defect `Q1.n` with the evidence (file, measured value, expected value). No git.

## Final answer (≤ 15 lines)
Verdict PASS/FAIL, each check's result, defects `Q1.n`, the README path.
