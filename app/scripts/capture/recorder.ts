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
    const bytes = Buffer.from(await response.clone().arrayBuffer());
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
      `${JSON.stringify({ status: response.status, statusText: response.statusText, headers: responseHeaders }, null, 2)}\n`,
    );
    writeFileSync(join(dir, "response.body"), bytes);

    let snapshot: string | null = null;
    try {
      const parsed = JSON.parse(bytes.toString("utf8")) as { model?: string };
      snapshot = parsed.model ?? null;
    } catch {
      // error bodies may not name a model
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
