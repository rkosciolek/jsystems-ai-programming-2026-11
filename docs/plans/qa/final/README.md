# PoC demo video (T23)

`poc-demo.mp4` is the final demo recording of the Hardware Service Decision Copilot PoC. It was cropped from the raw recording to remove the desktop taskbar.

## Encoding

- Tool: ffmpeg 8.0.1-3ubuntu2 (Ubuntu build, libavcodec 62.11.100, libx264 core 165).
- Source: `app/var/t23/raw.mp4` (1920x1080, 2:43.27, H.264, 393 kb/s).
- Command: `-vf crop=1920:1050:0:0 -c:v libx264 -pix_fmt yuv420p -crf 28 -preset medium -movflags +faststart`.

## ffprobe summary (`poc-demo.mp4`)

| Property | Value |
|---|---|
| Duration | 163.27 s (2:43) |
| Resolution | 1920x1050 |
| Codec | H.264, yuv420p |
| Bitrate | about 93 kb/s |
| File size | 1 899 587 bytes (about 1.9 MB) |

## Servers and modes

- S1: `DECISION_MODE=fast-only`, `http://localhost:3951`. Used for scenes 1, 3, 4 and 5.
- S2: `DECISION_MODE=llm-only`, `http://localhost:3952`. Used for scene 2.
- The browser was Chromium, headed, at window position 0,0. OpenRouter calls were real (approved by the owner).

## Scene timestamps

Times are from the demo log `app/var/t23/demo-log.json`.

| # | Time | Mode | Case | What it proves |
|---|---|---|---|---|
| 1 | 3.3-40.1 s | fast-only (3951) | HSD-20261126-8R9P (Reklamacja, Laptop, Lenovo ThinkPad T14, Sklep internetowy) | Complaint on the fast path: form filled with a 62-character Polish description, progress, first message "Wstępnie odrzucono", follow-up question about the purchase date answered from the conversation ("Podałeś datę zakupu 26.03.2026"). |
| 2 | 40.1-122.6 s | llm-only (3952) | HSD-20261126-6BL8 (Zwrot, Smartfon, Samsung Galaxy S23, Sklep stacjonarny to internetowy after correction) | LLM path: first message "Przekazano do specjalisty", then the user corrects a fact ("Pomyliłem się, kupiłem to w sklepie internetowym, nie stacjonarnym"). The decision changes to "Wymaga uzupełnienia". |
| 3 | 122.6-141.7 s | fast-only (3951) | HSD-20261126-B78M (Zwrot, Smartfon) | Return on the fast path: first message "Wstępnie zaakceptowano". |
| 4 | 141.7-148.0 s | fast-only (3951) | none (form not submitted) | Validation: empty submit shows field errors and the summary "Popraw zaznaczone pola." (12 errors recorded). |
| 5 | 148.0-152.6 s | fast-only (3951) | HSD-20261126-B78M | "Nowa sprawa" asks for confirmation and clears the form to the empty state. |

## Frame check

Six frames were extracted to `app/var/t23/frames-cropped/`, one per scene at 12, 100, 116, 130, 145 and 151 s. Each was viewed:

- No taskbar, no terminal, no `.env` content and no API key or token is visible in any frame.
- Each scene is recognisable (form, LLM chat with changed decision, return form, validation errors, new-case dialog).

## Deviations from the T23 brief

1. **Scene 2 is a return, not a laptop complaint.** The brief asked for the LLM-path complaint with `laptop-2.webp`. The recorded scene 2 is the return case 6BL8 (Samsung Galaxy S23 photo). The decision change is still shown.
2. **The badge after correction is "Wymaga uzupełnienia", not "Zmieniona ocena".** The log records the decision change to "Wymaga uzupełnienia"; the frame at 116 s shows that badge with the assistant still typing. The text "Zmieniona ocena" was not seen in the frames.
3. **Scenes 4 and 5 keep the brief order.** The log and frames show validation at 141.7-148 s (scene 4) and "Nowa sprawa" at 148-152.6 s (scene 5). The swap mentioned in the task was not reproduced in the log or the frames.
4. **Browser chrome is visible.** The Chromium tab bar and address bar (`localhost:3951` / `localhost:3952`) stay in the frame. The crop removes only the taskbar.
5. **Description length is 62 characters, not 60.** The log records `scene1DescLength: 62`.
