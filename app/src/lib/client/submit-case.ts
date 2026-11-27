import type { Draft } from "@/components/case-form";
import { CaseEventSchema, type CaseEvent } from "@/lib/domain";

export type ValidationStatus = 400 | 413 | 415;

/** Thrown before any stream starts, when the server rejects the fields or the photo. */
export class ValidationError extends Error {
  readonly status: ValidationStatus;
  readonly fields: Record<string, string>;

  constructor(status: ValidationStatus, fields: Record<string, string>) {
    super("validation");
    this.name = "ValidationError";
    this.status = status;
    this.fields = fields;
  }
}

const INTERNAL_ERROR: CaseEvent = { type: "error", code: "internal" };
const UPSTREAM_ERROR: CaseEvent = { type: "error", code: "upstream" };

/** Parses one NDJSON line. Returns null for blank lines and `undefined` for an invalid line. */
function parseLine(line: string): CaseEvent | null | undefined {
  const trimmed = line.trim();
  if (trimmed === "") return null;
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  const parsed = CaseEventSchema.safeParse(json);
  return parsed.success ? parsed.data : undefined;
}

/**
 * Reads an NDJSON body, tolerating chunk boundaries inside a line (and inside a UTF-8
 * character, thanks to the streaming decoder). An invalid line yields an internal error
 * event and stops the stream.
 */
export async function* parseNdjson(stream: ReadableStream<Uint8Array>): AsyncIterable<CaseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const handle = (line: string): CaseEvent | "stop" | null => {
    const event = parseLine(line);
    if (event === undefined) return "stop";
    return event;
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const event = handle(line);
        if (event === "stop") {
          yield INTERNAL_ERROR;
          return;
        }
        if (event !== null) yield event;
        newline = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    const event = handle(buffer);
    if (event === "stop") {
      yield INTERNAL_ERROR;
      return;
    }
    if (event !== null) yield event;
  } finally {
    reader.releaseLock();
  }
}

function buildFormData(draft: Draft): FormData {
  const body = new FormData();
  body.append("caseType", draft.caseType ?? "");
  body.append("category", draft.category ?? "");
  body.append("model", draft.model);
  body.append("purchaseDate", draft.purchaseDate);
  body.append("channel", draft.channel ?? "");
  body.append("description", draft.description);
  if (draft.photo) body.append("photo", draft.photo);
  return body;
}

function isFieldsBody(value: unknown): value is { fields: Record<string, string> } {
  if (typeof value !== "object" || value === null || !("fields" in value)) return false;
  const fields = (value as { fields: unknown }).fields;
  return typeof fields === "object" && fields !== null && !Array.isArray(fields);
}

/**
 * Posts the case to `/api/cases` and yields its NDJSON events.
 *
 * Throws `ValidationError` for HTTP 400/413/415 with a field map. Other non-200 responses
 * yield an `upstream` error event. A network failure rejects, and the page treats it as a
 * service error. A stream that ends without `result` or `error` yields an `internal` error.
 */
export async function* submitCase(draft: Draft, signal: AbortSignal): AsyncIterable<CaseEvent> {
  const response = await fetch("/api/cases", { method: "POST", body: buildFormData(draft), signal });

  if (response.status === 200 && response.body) {
    let terminal = false;
    for await (const event of parseNdjson(response.body)) {
      if (event.type === "result" || event.type === "error") terminal = true;
      yield event;
    }
    if (!terminal) yield INTERNAL_ERROR;
    return;
  }

  if (response.status === 400 || response.status === 413 || response.status === 415) {
    const body: unknown = await response.json().catch(() => undefined);
    if (isFieldsBody(body)) {
      throw new ValidationError(response.status, body.fields);
    }
  }

  await response.body?.cancel().catch(() => undefined);
  yield UPSTREAM_ERROR;
}
