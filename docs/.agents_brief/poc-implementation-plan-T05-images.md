# Brief T05 — image processing

- **Task:** T05, issue #14. Concurrent: T06 (Luna, `server/rules`), T08 (Haiku, store/log/id), T12 (Luna, form). Disjoint files.
- **Worker:** Haiku subagent. Repo `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Goal
`images.process(buffer)` → `ProcessedImage` per ADR-002 §3.3: content-based format detection (JPEG/PNG/WebP via sharp metadata), EXIF rotate, fit inside 2048×2048 without enlargement, flatten on white, JPEG q85 mozjpeg, no metadata kept.

## Read
`docs/ADR/002-backend-api.md` §3.3, TD-202, §8 rows "Resize", "Wrong format", "Extension mismatch", TAC-002-03; `docs/ADR/000-main-architecture.md` §5 `ProcessedImage`; `app/AGENTS.md`; `assets/example-images/README.md`.

## Contract
`app/src/server/images/index.ts` (starts with `import 'server-only'`):
- `class UnsupportedImageError extends Error`.
- `processImage(input: Buffer): Promise<{ jpegBuffer: Buffer; width: number; height: number; originalBytes: number; processedBytes: number; sourceFormat: 'jpeg'|'png'|'webp' }>`; throws `UnsupportedImageError` for any other format or undecodable data.

## Editable files
`app/src/server/images/**`, `app/tests/unit/images.test.ts`.

## Steps
1. Tests first on the **real photos** (`laptop-1.png` = JPEG content 3024×3135 → longer edge exactly 2048, `laptop-2.webp`, `phone-2.jpeg` not upscaled); all outputs JPEG (check magic bytes `FF D8`), `sharp(output).metadata()` has no `exif`; a generated plain-text buffer → `UnsupportedImageError` (owner exception for rejection tests). Red → record.
2. Implement; `npx vitest run tests/unit/images.test.ts`, lint, typecheck green.

## Tool guidance (plan §4.2)
`--help` → Context7 (`npx ctx7@latest library sharp "resize fit inside withoutEnlargement rotate"`) → web last. npm only, never install. No git. Report contradictions.

## Report
`docs/.agents_brief/poc-implementation-plan-T05-images.report.md`; final answer ≤ 10 lines.
