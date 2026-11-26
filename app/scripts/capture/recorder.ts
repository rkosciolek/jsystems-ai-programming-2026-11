import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Recording fetch (ADR-000 §10 rule 1): saves each exchange verbatim into
// tests/fixtures/captured/<name>/. The Authorization header is never written.
export const CAPTURE_DIR = join(process.cwd(), "tests", "fixtures", "captured");

export interface CaptureMeta {
  modelRequested: string;
  questionSetHash?: string;
  photo: string;
  [key: string]: unknown;
}

export function recordingFetch(name: string, meta: CaptureMeta): typeof fetch {
  return async (input, init) => {
    const response = await fetch(input, init);
    // Read the clone chunk by chunk so the chunk boundaries of streamed (SSE) bodies are kept.
    const chunks: Buffer[] = [];
    const reader = response.clone().body?.getReader();
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    const bytes = Buffer.concat(chunks);
    const dir = join(CAPTURE_DIR, name);
    mkdirSync(dir, { recursive: true });

    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((v, k) => {
      if (k.toLowerCase() !== "authorization") headers[k] = v;
    });
    const rawBody = typeof init?.body === "string" ? init.body : undefined;
    let body: unknown = rawBody;
    try {
      if (rawBody) body = JSON.parse(rawBody);
    } catch {
      // keep the raw string
    }
    writeFileSync(
      join(dir, "request.json"),
      `${JSON.stringify({ method: init?.method ?? "GET", url, headers, body }, null, 2)}\n`,
    );

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      responseHeaders[k] = v;
    });
    writeFileSync(
      join(dir, "response.meta.json"),
      `${JSON.stringify(
        {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          chunkSizes: chunks.map((c) => c.length),
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(join(dir, "response.body"), bytes);

    let snapshot: string | null = null;
    try {
      const parsed = JSON.parse(bytes.toString("utf8")) as { model?: string };
      snapshot = parsed.model ?? null;
    } catch {
      // not one JSON document: streamed (SSE) body, the snapshot is in the first `data:` chunk
      const m = /^data: (\{.*"model":"([^"]+)")/m.exec(bytes.toString("utf8"));
      snapshot = m?.[2] ?? null;
    }
    writeFileSync(
      join(dir, "capture.json"),
      `${JSON.stringify(
        {
          date: new Date().toISOString(),
          ...meta,
          modelSnapshot: snapshot,
          appCommit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
        },
        null,
        2,
      )}\n`,
    );
    return response;
  };
}

/** Records a multi-exchange turn (for example tool call + final text): the n-th request goes to names[n]. */
export function recordingSequence(names: string[], meta: CaptureMeta): typeof fetch {
  let index = 0;
  return async (input, init) => {
    const name = names[index++];
    if (!name) throw new Error(`Unexpected exchange #${index}: only ${names.length} were expected`);
    return recordingFetch(name, meta)(input, init);
  };
}
