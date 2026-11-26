import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const CAPTURED_DIR = fileURLToPath(new URL("../fixtures/captured/", import.meta.url));

type RecordingMeta = {
  status: number;
  statusText?: string;
  headers: Record<string, string>;
  chunkSizes?: number[];
};

export type ReplayRequest = {
  url: string;
  method: string;
  headers: Headers;
  body: string | undefined;
};

type ReplayMutation = { recordingName: string; path: string; value: unknown };

export type ReplayFetchOptions = {
  delayMs?: number;
  failWith?: "network";
  mutations?: ReplayMutation[];
};

export type ReplayFetch = typeof fetch & { requests: ReplayRequest[] };

export async function loadRecording(name: string): Promise<{ meta: RecordingMeta; body: Buffer }> {
  const recordingDir = `${CAPTURED_DIR}${name}/`;
  const [metaText, body] = await Promise.all([
    readFile(`${recordingDir}response.meta.json`, "utf8"),
    readFile(`${recordingDir}response.body`),
  ]);
  return { meta: JSON.parse(metaText) as RecordingMeta, body };
}

export function applyMutation(json: unknown, path: string, value: unknown): unknown {
  const clone = JSON.parse(JSON.stringify(json)) as unknown;
  const segments = path.split(".");
  let target: unknown = clone;

  for (const segment of segments.slice(0, -1)) {
    if (!target || typeof target !== "object") throw new Error(`Mutation path not found: ${path}`);
    target = (target as Record<string, unknown>)[segment];
  }

  const last = segments.at(-1);
  if (!last || !target || typeof target !== "object" || !(last in target)) {
    throw new Error(`Mutation path not found: ${path}`);
  }
  if (value === undefined) delete (target as Record<string, unknown>)[last];
  else (target as Record<string, unknown>)[last] = value;
  return clone;
}

function readRequest(input: RequestInfo | URL, init?: RequestInit): ReplayRequest {
  const request = input instanceof Request ? input : undefined;
  return {
    url: input instanceof URL ? input.href : request?.url ?? String(input),
    method: init?.method ?? request?.method ?? "GET",
    headers: new Headers(init?.headers ?? request?.headers),
    body: typeof init?.body === "string" ? init.body : undefined,
  };
}

function wait(delayMs: number, signal?: AbortSignal | null): Promise<void> {
  if (!signal) return new Promise((resolve) => setTimeout(resolve, delayMs));
  if (signal.aborted) return Promise.reject(signal.reason);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function responseStream(body: Buffer, chunkSizes: number[] | undefined): ReadableStream<Uint8Array> {
  const chunks: Buffer[] = [];
  if (!chunkSizes?.length) chunks.push(body);
  else {
    let offset = 0;
    for (const size of chunkSizes) {
      chunks.push(body.subarray(offset, offset + size));
      offset += size;
    }
    if (offset < body.length) chunks.push(body.subarray(offset));
  }
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      const chunk = chunks[index++];
      if (chunk) controller.enqueue(new Uint8Array(chunk));
      else controller.close();
    },
  });
}

export function createReplayFetch(recordingNames: string[], options: ReplayFetchOptions = {}): ReplayFetch {
  let index = 0;
  const requests: ReplayRequest[] = [];
  const replayFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = readRequest(input, init);
    requests.push(request);
    const recordingName = recordingNames[index++];
    if (!recordingName) throw new Error(`Unexpected exchange #${index}: only ${recordingNames.length} were expected`);

    if (options.failWith === "network") throw new TypeError("fetch failed");
    if (options.delayMs && options.delayMs > 0) await wait(options.delayMs, init?.signal);
    else if (init?.signal?.aborted) throw init.signal.reason;

    const recording = await loadRecording(recordingName);
    let body = recording.body;
    const mutation = options.mutations?.filter((candidate) => candidate.recordingName === recordingName);
    if (mutation?.length) {
      let parsed: unknown = JSON.parse(body.toString("utf8"));
      for (const change of mutation) parsed = applyMutation(parsed, change.path, change.value);
      body = Buffer.from(JSON.stringify(parsed));
    }

    return new Response(responseStream(body, recording.meta.chunkSizes), {
      status: recording.meta.status,
      statusText: recording.meta.statusText,
      headers: recording.meta.headers,
    });
  }) as ReplayFetch;
  replayFetch.requests = requests;
  return replayFetch;
}
