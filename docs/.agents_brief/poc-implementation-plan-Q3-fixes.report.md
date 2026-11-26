# Report Q3.x — description_matches_photo rewording and re-recording

## New question text (`app/src/server/classifier/questions.ts`, ID/type/semantics unchanged)

> The customer's description is consistent with the photo. Answer false ONLY when the description states something about the device's visible condition or identity that the photo clearly contradicts: for example the description says the screen is cracked but the photo shows an intact screen, says the device is undamaged but the photo shows obvious damage, or names a different kind of device than the one shown. Answer true when the description gives a reason for the case, a symptom that cannot be seen in a photo (flickering, battery life, sound, not turning on, slowness), expresses an opinion or preference, or says nothing about the device's appearance. Do not compare the description with the device's condition unless the description itself makes a claim about that condition; a reason such as unmet expectations says nothing about appearance, so it is consistent with any photo. Judge only the text of the customer's description; do not treat the model name or other form fields as part of it, and never answer false merely because the device in the photo differs from the model named in the form. If in doubt, answer true.

Tuning rounds: initial wording + 2 tunings (limit 3). Round 1 (initial) fixed the three brief cases but `jev-return-phone-3` ("Telefon nie spełnił moich oczekiwań…", form model Samsung Galaxy A54) still gave false 0.05-0.08 (Jev compared the form model with the photo). Round 2 added "if in doubt true / only the description text"; round 3 added "ignore model name and other form fields". Final wording below.

## Verification answers (real Jev, final wording; capture-tool inputs, ad-hoc script under `app/var/adhoc/`)

| Photo | Description | description_matches_photo (noul) |
|---|---|---|
| phone-1.jpg (return) | "Nie podoba mi się brzmienie, chcę oddać." | true 0.95 (earlier wording: 0.96-0.98) |
| laptop-1.png (complaint) | "Ekran migocze od tygodnia." | true 0.97 |
| laptop-1.png (complaint) | "Laptop jest nowy, bez żadnych uszkodzeń, ale nie włącza się." | false 0.04 (photo shows impact damage, visible_damage 0.98) as expected |
| phone-3.jpeg (return) | "Telefon nie spełnił moich oczekiwań, odsyłam w terminie." | true 0.95 |
| laptop-2.webp (complaint) | "Ekran laptopa pękł w lewym rogu…" | false 0.06 (photo shows no damage, a real contradiction) |
| laptop-1.png (complaint) | "Ekran laptopa pękł w lewym rogu i pojawiły się pionowe pasy." | 0.46 (was 0.57; cracked screen visible, stripes not) |

Recorded values: laptop-1 0.54 (true), laptop-2 0.04 (false), phone-3 0.96 (true); phone-1 has no description, so the question is absent.

## Recordings refreshed (one by one with `CAPTURE_ONLY=<name>`, never `all`)

`jev-complaint-laptop-1`, `jev-complaint-laptop-2`, `jev-return-phone-1`, `jev-return-phone-3`, `llm-decision-complaint-laptop-1`, `llm-decision-return-phone-1`.

Additionally (outside the listed six, necessary): `llm-vision-complaint-laptop-1` and `llm-vision-return-phone-1`. The vision request embeds the Jev answers as hints, so the integration test that replays the vision request (`toEqual(recordedRequestBody)`) failed after the Jev re-recording. The decision recordings were re-recorded again after the vision ones (order jev, vision, decision). `llm-return-phone-1` was captured 3 extra times (see finding below).

Secrets: no `.env` opened; auth stripped by the recorder; `grep -r sk-or- tests/fixtures` matches only README prose; `user_id` only in the already-redacted `llm-error-unknown-model` (`REDACTED`) and in docs text. No redaction was needed in the new recordings.

New decisions: complaint laptop-1 `rejected` (impact_damage, §4 ust. 1, §7), return phone-1 `rejected` (withdrawal window closed on day 16, damaged device, form model does not match photo).

## Tests changed

- `app/tests/unit/classifier/classifier.test.ts`: expected certainties follow the new real recordings (image_usable 0.84 -> 0.82, description_matches_photo 0.57 -> 0.54, return image_usable 0.91 -> 0.9, packaging_visible 0.9 -> 0.87). Values and meaning of the assertions unchanged.
- `app/tests/integration/llm/llm.integration.test.ts` ("decides from the $type policy recording..."): for the return case a declared mutation expands section ranges (`§3 ust. 1–2` -> `§3 ust. 1, §3 ust. 2`) in the recorded `messageMarkdown`. Reason: see finding. Declared in `MUTATIONS.md`.
- `app/tests/fixtures/captured/MUTATIONS.md`: new row for that mutation. Existing mutation paths still valid (all targeted values exist in the new recordings; the 0.9 override of `description_matches_photo.noul` in api-cases still applies).
- Freshness hashes: read from `capture.json`, refreshed by the recorder; no code change.

## Findings for the orchestrator

1. The real return decision recorded with the current `decision-return.md` writes section ranges ("§3 ust. 1–2", "§6 ust. 2–3") while `citedSections` lists each section separately; `validateFirstMessage` fails with "Cytowane postanowienie §3 ust. 2 nie występuje w treści wiadomości" in 4 of 4 captures. In production the decision would be retried once, then end `escalated/llm_inconsistent`. Fix in the prompt (forbid ranges; cite each section as `§N ust. M`) or the validator (accept ranges); then re-record `llm-decision-return-phone-1` and drop the mutation.
2. The forms in the capture inputs name devices that do not match the photos (phone-1 vs "Samsung Galaxy A54": vision says `matchesModel: no`; laptop-1 vs "Acer Aspire 5"). The decision for return phone-1 now cites `model_mismatch`. Not changed (capture inputs are shared by many tests).
3. One run of `api-cases.integration.test.ts` ("records the shadow fast-path decision in llm-only mode") failed once while T17 files were changing concurrently and passed on rerun and in the full run; not reproduced.

## Check results (final, whole `app/`)

- `npm test`: 26 files, 446 tests passed (includes the T17 chat tests, which now pass).
- `npm run lint`: no errors.
- `npm run typecheck`: OK.
- `npm run build`: OK.
