# Brief Q2 — QA gate for phase P2 (form, validation, page state, progress)

- **Gate:** Q2, issue #11. **Worker:** QA subagent (Sonnet).
- **Run in an isolated worktree** so the backend work in progress (T13) does not affect the checks:
  1. `cd /home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11 && git worktree add ../hsd-q2 feat/poc-app --detach` (HEAD of the branch; read-only use).
  2. `ln -s /home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11/app/node_modules ../hsd-q2/app/node_modules`.
  3. Work in `../hsd-q2/app`. The server needs `OPENROUTER_API_KEY` and `LLM_MODEL` at startup; **never open the `.env` file** — start with `node --env-file=/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11/.env node_modules/.bin/next start -p 3000` after `npm run build`.
  4. At the end stop your server, then `git worktree remove --force ../hsd-q2` and `git worktree prune` (from the main repo). Screenshots and the README go into the **main** checkout: `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11/docs/plans/qa/Q2/`.

## Read
`docs/plans/poc-implementation-plan.md` §5 (screenshot rules), §7 (Q2 row, M2, "Every gate also"); `docs/PRD.md` §6 Form (AC-01…AC-16), AC-45, AC-50, §9.1, §9.2; `docs/design-guidelines.md`; `assets/homepage-hero.png`; `assets/example-images/README.md`. Run `playwright-cli --help` first.

## Checks
1. In the worktree app: `npm run lint`, `npm run typecheck`, `npm test` (counts), `npm run build`; startup "Ready" line. Record each separately.
2. With `playwright-cli` at 1920×1080 and 360×800 on `http://localhost:3000/`:
   - empty form: 7 fields in PRD order, no preselection, labels visible, title + intro; screenshot both viewports;
   - click **Wyślij zgłoszenie** empty → all errors at once, summary "Popraw zaznaczone pola.", focus on the first invalid field; screenshot;
   - each invalid input from AC-04…AC-13 with the exact message (model 1 char; future date; complaint description 19 chars; AC-09 switch Zwrot → Reklamacja shows no error until blur/submit; counter `N / 2000`); return type shows "(opcjonalnie)";
   - photos: upload the **real** `assets/example-images/laptop-1.png` (thumbnail, name, size, Usuń), replace with `laptop-2.webp`, Usuń clears; a non-image file → "Dozwolone formaty: JPG, PNG, WEBP." (a text file you create in the scratch area is allowed only for this rejection check);
   - keyboard only: fill the whole form with Tab/arrows/Space/Enter incl. opening the file dialog from the drop zone (if the native dialog cannot be driven, set the file and state it);
   - valid submit (complaint, Laptop, a model name, a date 8 months ago, online, a 60-char Polish description, `laptop-1.png`) → progress screen with summary and thumbnail within 1 s (screenshot) → back to the form with the service banner "Nie udało się przeanalizować zgłoszenia. Spróbuj ponownie za chwilę." and **all values and the photo kept** (the endpoint does not exist yet: a real 404 is expected); screenshot both viewports;
   - "Spróbuj ponownie" resubmits;
   - no horizontal scroll at 360 px; console errors (the expected 404 network error may appear; nothing else); Polish UI.
3. Compare the screens with `assets/homepage-hero.png` and the design guidelines (navy text, outlined pill buttons, light-blue borders, magenta only for errors, Noto Sans).
4. Save `NN-<screen>-<viewport>.png` and `README.md` (one row per screenshot with pass/fail; check results; defects `Q2.n` with evidence). Synthetic data only; no terminal or `.env` in images.

## Rules
Do not edit application files. No git writes except the worktree add/remove/prune above. Report defects instead of fixing them.

## Final answer (≤ 15 lines)
Verdict, check results, defects `Q2.n`, README path.
