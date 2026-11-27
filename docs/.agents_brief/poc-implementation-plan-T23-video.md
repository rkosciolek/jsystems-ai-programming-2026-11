# Brief T23 — final demo video (ffmpeg)

- **Task:** T23, issue #33. Prerequisite: Q6 passed. **Worker:** Haiku subagent. Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`. Real OpenRouter calls (owner-approved).

## Read
`docs/plans/poc-implementation-plan.md` §5 "Video recording (T23)" and the T23 row. ffmpeg 8.0.1 is installed (`ffmpeg -h`, `ffmpeg -h demuxer=x11grab`). Display: `$DISPLAY` (`:10.0` on this VM; check `echo $DISPLAY` and `xdpyinfo | grep dimensions` if available).

## Do
1. `npm run build` in `app/`. Start two servers from it (never open/print/grep `.env`; pass its absolute path to `--env-file`): S1 `DECISION_MODE=fast-only` on 3951, S2 `DECISION_MODE=llm-only` on 3952, logs `app/var/t23/*.jsonl`.
2. Write a Playwright **headed** script `app/var/t23/demo.mjs` (Chromium, window 1920×1080, positioned at 0,0, `--window-position=0,0`, no devtools, browser UI minimal; slowMo / explicit pauses of 2–4 s so a viewer can read each screen) that plays:
   1. Complaint on the **fast path** (S1): `laptop-1.png`, Laptop, model "Lenovo ThinkPad T14", date 8 months ago, Sklep internetowy, a 60-char Polish description → progress → first message (scroll slowly through it) → chat follow-up "Jaką datę zakupu podałem?" → reply.
   2. Complaint on the **LLM path** (S2) with `laptop-2.webp` → first message → a message with a new fact that changes the outcome (e.g. "Pomyliłem się — kupiłem go w sklepie stacjonarnym 30 miesięcy temu?" is not allowed as date change > policy; prefer a return case for the correction: in-store return ≈ 20 days with a photo, then "Pomyliłem się, kupiłem to w sklepie internetowym, nie stacjonarnym.") → "Zmieniona ocena" visible, badge changed.
   3. A **return** first message (fast path, `phone-1.jpg`).
   4. A **validation error** (submit empty form → errors + summary).
   5. **Nowa sprawa** → confirmation → empty form.
   Use only the real photos and synthetic data. Keep everything else off screen (no terminal over the window, no `.env`).
3. Record the window area with `ffmpeg -f x11grab -framerate 30 -video_size 1920x1080 -i $DISPLAY+0,0 …` while the script runs (start ffmpeg first, stop it with `q`/SIGINT after the script ends). Encode H.264: `-c:v libx264 -pix_fmt yuv420p -crf 28 -preset medium -movflags +faststart`. Target ≤ 3 min and ≤ 25 MB (re-encode with higher CRF or trim pauses if needed).
4. Check with `ffprobe` (duration, resolution, codec). Extract 6 frames (one per scene) with ffmpeg to `app/var/t23/frames/` and look at them to confirm each scene is visible and no terminal/secret is on screen.
5. Save `docs/plans/qa/final/poc-demo.mp4` and `docs/plans/qa/final/README.md` (ffmpeg version, ffprobe summary, scene timestamps, case numbers, servers/modes, what each scene proves). Stop only your servers.

## Rules
Do not edit application files; no git; no package installs (Playwright is already in `app/node_modules`); never open `.env`; scratch only under `app/var/t23/`.

## Final answer (≤ 10 lines)
Video path, duration, size, resolution, scene timestamps, any problem.
