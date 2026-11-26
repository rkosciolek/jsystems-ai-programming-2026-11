import "server-only";

import sharp from "sharp";
import { makeCaseInputSchema, todayInWarsaw, type CaseInput } from "@/lib/domain";
import { pl } from "@/lib/i18n/pl";
import { getEnv } from "@/server/env";
import { runCasePipeline } from "@/server/pipeline";
import type { CaseEvent } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const SUPPORTED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);
const INPUT_FIELDS = ["caseType", "category", "model", "purchaseDate", "channel", "description"] as const;

function validationResponse(status: number, fields: Record<string, string>): Response {
  return Response.json({ error: "validation", fields }, { status });
}

function tooLarge(): Response {
  return validationResponse(413, { photo: pl.errors.imageSize });
}

function unsupportedImage(): Response {
  return validationResponse(415, { photo: pl.errors.imageFormat });
}

function collectInput(form: FormData): Record<(typeof INPUT_FIELDS)[number], string> {
  return Object.fromEntries(INPUT_FIELDS.map((name) => {
    const value = form.get(name);
    return [name, typeof value === "string" ? value : ""];
  })) as Record<(typeof INPUT_FIELDS)[number], string>;
}

function validationFields(issues: readonly { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    fields[key] ??= issue.message;
  }
  return fields;
}

async function contentFormat(buffer: Buffer): Promise<string | undefined> {
  try {
    return (await sharp(buffer).metadata()).format;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_PHOTO_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return tooLarge();
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return validationResponse(400, { photo: pl.errors.imageRequired });
  }

  const inputResult = makeCaseInputSchema(todayInWarsaw()).safeParse(collectInput(form));
  if (!inputResult.success) return validationResponse(400, validationFields(inputResult.error.issues));
  const input: CaseInput = inputResult.data;

  const photos = form.getAll("photo");
  if (photos.length !== 1 || !(photos[0] instanceof File)) {
    return validationResponse(400, { photo: pl.errors.imageRequired });
  }
  const photo = photos[0];
  if (photo.size > MAX_PHOTO_BYTES) return tooLarge();

  const originalPhoto = Buffer.from(await photo.arrayBuffer());
  const format = await contentFormat(originalPhoto);
  if (!format || !SUPPORTED_IMAGE_FORMATS.has(format)) return unsupportedImage();

  const controller = new AbortController();
  const signal = AbortSignal.any([
    request.signal,
    controller.signal,
    AbortSignal.timeout(getEnv().CASE_TIMEOUT_MS),
  ]);
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const emit = (event: CaseEvent) => {
        if (closed) return;
        streamController.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await runCasePipeline(input, originalPhoto, { signal, emit });
      } catch {
        // The pipeline owns error classification and logging; never surface raw exceptions.
        if (!signal.aborted && !closed) {
          emit({ type: "error", code: "internal" });
        }
      } finally {
        if (!closed) {
          closed = true;
          streamController.close();
        }
      }
    },
    cancel(reason) {
      closed = true;
      controller.abort(reason);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function GET(): Response {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
