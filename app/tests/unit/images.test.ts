import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processImage, UnsupportedImageError } from "@/server/images";

// Real photos only (app/AGENTS.md, ADR-002 §8 "Resize" row). No generated images.
const photosDir = fileURLToPath(new URL("../../../assets/example-images/", import.meta.url));
const photo = (name: string) => readFile(`${photosDir}${name}`);

const isJpeg = (buf: Buffer) => buf[0] === 0xff && buf[1] === 0xd8;

describe("processImage", { timeout: 30_000 }, () => {
  it("resizes the longer edge of laptop-1 (JPEG content, .png name) to exactly 2048", async () => {
    const input = await photo("laptop-1.png");
    const result = await processImage(input);

    expect(result.sourceFormat).toBe("jpeg");
    expect(Math.max(result.width, result.height)).toBe(2048);
    expect(result.height).toBe(2048);
    expect(result.width).toBe(1975); // 3024 * 2048 / 3135 = 1975.49, rounded down
    expect(result.originalBytes).toBe(input.length);
    expect(result.processedBytes).toBe(result.jpegBuffer.length);
    expect(isJpeg(result.jpegBuffer)).toBe(true);

    const meta = await sharp(result.jpegBuffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(result.width);
    expect(meta.height).toBe(result.height);
    expect(meta.exif).toBeUndefined();
  });

  it("re-encodes laptop-2 (WebP) as JPEG without enlarging it", async () => {
    const input = await photo("laptop-2.webp");
    const result = await processImage(input);

    expect(result.sourceFormat).toBe("webp");
    expect({ width: result.width, height: result.height }).toEqual({ width: 863, height: 843 });
    expect(isJpeg(result.jpegBuffer)).toBe(true);

    const meta = await sharp(result.jpegBuffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
  });

  it("does not upscale a small JPEG photo (phone-2)", async () => {
    const input = await photo("phone-2.jpeg");
    const result = await processImage(input);

    expect(result.sourceFormat).toBe("jpeg");
    expect({ width: result.width, height: result.height }).toEqual({ width: 387, height: 516 });
    expect(isJpeg(result.jpegBuffer)).toBe(true);
  });

  it("keeps an upright portrait photo with an EXIF block (phone-1) and strips the metadata", async () => {
    const input = await photo("phone-1.jpg");
    const sourceMeta = await sharp(input).metadata();
    expect(sourceMeta.exif).toBeDefined(); // precondition: the source does carry EXIF

    const result = await processImage(input);

    expect(result.sourceFormat).toBe("jpeg");
    expect({ width: result.width, height: result.height }).toEqual({ width: 900, height: 1200 });
    expect(isJpeg(result.jpegBuffer)).toBe(true);

    const meta = await sharp(result.jpegBuffer).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it("returns JPEG output for every real photo, with no EXIF block", async () => {
    for (const name of ["phone-3.jpeg", "phone-1.jpg", "phone-2.jpeg", "laptop-2.webp", "laptop-1.png"]) {
      const result = await processImage(await photo(name));
      expect(isJpeg(result.jpegBuffer), name).toBe(true);
      expect((await sharp(result.jpegBuffer).metadata()).exif, name).toBeUndefined();
    }
  });

  it("rejects a plain-text payload with UnsupportedImageError", async () => {
    // Owner-approved generated payload for the 415 case (ADR-000 TAC-08, app/AGENTS.md).
    const input = Buffer.from("this is not an image, just plain text\n", "utf8");

    await expect(processImage(input)).rejects.toBeInstanceOf(UnsupportedImageError);
  });
});
