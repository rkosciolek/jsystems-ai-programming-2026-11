import "server-only";
import sharp, { type Metadata } from "sharp";

// ADR-002 §3.3: content-based format check, EXIF orientation, fit inside 2048 px without
// enlargement, flatten on white, JPEG q85 (mozjpeg), no metadata kept. Images are never
// written to disk or logged.

const MAX_EDGE = 2048;
const JPEG_QUALITY = 85;
const ACCEPTED_FORMATS = ["jpeg", "png", "webp"] as const;

export type SourceFormat = (typeof ACCEPTED_FORMATS)[number];

export class UnsupportedImageError extends Error {
  constructor(message = "Dozwolone formaty: JPG, PNG, WEBP.") {
    super(message);
    this.name = "UnsupportedImageError";
  }
}

export interface ProcessedImage {
  jpegBuffer: Buffer;
  width: number;
  height: number;
  originalBytes: number;
  processedBytes: number;
  sourceFormat: SourceFormat;
}

function isAcceptedFormat(format: string | undefined): format is SourceFormat {
  return (ACCEPTED_FORMATS as readonly string[]).includes(format ?? "");
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  // The declared MIME type and file name are ignored; only the decoded content counts.
  let metadata: Metadata;
  try {
    metadata = await sharp(input).metadata();
  } catch {
    throw new UnsupportedImageError();
  }
  if (!isAcceptedFormat(metadata.format)) {
    throw new UnsupportedImageError();
  }

  let jpegBuffer: Buffer;
  let width: number;
  let height: number;
  try {
    const result = await sharp(input)
      .rotate() // apply EXIF orientation; the metadata itself is not copied to the output
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    jpegBuffer = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch {
    throw new UnsupportedImageError();
  }

  return {
    jpegBuffer,
    width,
    height,
    originalBytes: input.length,
    processedBytes: jpegBuffer.length,
    sourceFormat: metadata.format,
  };
}
