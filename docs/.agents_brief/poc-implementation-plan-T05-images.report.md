# T05 report: image processing (issue #14)

Date: 2026-11-26. Scope: `app/src/server/images/**`, `app/tests/unit/images.test.ts`.

## Result
- `processImage(input: Buffer)` implemented per ADR-002 §3.3 and the brief contract; exports `UnsupportedImageError` and `ProcessedImage`.
- Format is decided from decoded content (sharp metadata), not MIME or file name. Accepted: `jpeg`, `png`, `webp`. Anything else, or undecodable data, throws `UnsupportedImageError`.
- Pipeline: `rotate()` (EXIF orientation), `resize` fit `inside` 2048 x 2048 with `withoutEnlargement`, `flatten` on `#ffffff`, `jpeg({ quality: 85, mozjpeg: true })`. Sharp does not keep metadata unless `withMetadata()` is called, and it is not called here.
- The module starts with `import "server-only"`.

## Verification
- Red: before the implementation existed, `npx vitest run tests/unit/images.test.ts` failed at import (`Cannot find package '@/server/images'`), 0 tests run.
- Green: `npx vitest run tests/unit/images.test.ts`, 6 of 6 passed (about 5 s). Each real photo gives JPEG output (magic `FF D8`) with no EXIF in the output.
- Lint: `npx eslint src/server/images tests/unit/images.test.ts` exit 0. Only my files were linted, not the whole app.
- Typecheck: `npx tsc --noEmit` produced no errors, including the other workers' folders at the time of the run.
- One first-run test expectation was my arithmetic error (3024 x 2048 / 3135 = 1975.49, so 1975, not 1976). Fixed in the test; the implementation was not changed for it.
- Manual QA not run: this is a server module with no UI or route yet. It will be exercised through the T12/route work.

## Tests (real photos from `assets/example-images/`)
- `laptop-1.png` (JPEG content): sourceFormat `jpeg`, longer edge exactly 2048, output 1975 x 2048, byte counts correct, output metadata has no EXIF.
- `laptop-2.webp`: sourceFormat `webp`, 863 x 843 kept, JPEG output.
- `phone-2.jpeg`: 387 x 516 kept (no upscaling).
- `phone-1.jpg`: source has EXIF (precondition asserted), output 900 x 1200, no EXIF in output.
- All five real photos: JPEG magic bytes and no EXIF.
- Generated plain-text buffer: rejects with `UnsupportedImageError` (owner-approved generated payload for the 415 case).

## Gaps and contradictions to note
- Brief goal says `images.process(buffer)`, but the brief contract and the steps say `processImage(input)`. I followed the contract name `processImage`. Callers must use that name.
- No real EXIF-rotated photo exists in the set. `phone-1.jpg` has orientation 1, so its "upright" check is a no-op. A real rotated photo would be needed for a meaningful rotation test. The brief forbids generating one.
- No real PNG file and no real transparent image exist in the set, so `sourceFormat: 'png'` and the flatten-on-white path have no real-data test. Adding one needs a real PNG from the owner.
- `sharp` 0.35.5 was checked with Context7 (`/lovell/sharp/v0.35.5`): `resize` `fit: inside` with `withoutEnlargement`, `flatten({ background })`, and `rotate()`/`autoOrient()` for EXIF. `rotate()` (no angle) is used, as ADR-002 §3.3 says.
- Repo rule `app/AGENTS.md` asks for `MUTATIONS.md` entries for declared mutations. None were declared here, since no mutation testing was done.

## Files
- `app/src/server/images/index.ts` (new)
- `app/tests/unit/images.test.ts` (new)
- `docs/.agents_brief/poc-implementation-plan-T05-images.report.md` (this file)
- No changes to `app/src/components/case-form`, `app/src/server/rules`, `.env` files, or git state. Nothing committed.
