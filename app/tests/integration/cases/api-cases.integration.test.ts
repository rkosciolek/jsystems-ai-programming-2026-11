import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyMutation, createReplayFetch, loadRecording, type ReplayFetch } from "../../helpers/replay-fetch";

const PHOTO_DIR = path.resolve(process.cwd(), "../assets/example-images");
const TODAY = new Date("2026-11-26T12:00:00.000Z");
const BASE_INPUT = {
  caseType: "complaint",
  category: "laptop",
  model: "Acer Aspire 5",
  purchaseDate: "2026-09-01",
  channel: "online",
  description: "Ekran laptopa pękł w lewym rogu i pojawiły się pionowe pasy.",
};

let tempDir: string;
let logPath: string;

async function photo(name = "laptop-1.png"): Promise<File> {
  const bytes = await readFile(path.join(PHOTO_DIR, name));
  return new File([new Uint8Array(bytes)], name, { type: name.endsWith(".png") ? "image/png" : "image/jpeg" });
}

function makeForm(fields: Record<string, string> = {}, image?: File): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...BASE_INPUT, ...fields })) form.set(key, value);
  if (image) form.append("photo", image);
  return form;
}

function request(form: FormData, signal?: AbortSignal, headers?: HeadersInit): Request {
  return new Request("http://localhost/api/cases", {
    method: "POST",
    body: form,
    headers,
    ...(signal ? { signal } : {}),
  });
}

async function postCase(
  form: FormData,
  replay: ReplayFetch = createReplayFetch([]),
  signal?: AbortSignal,
  headers?: HeadersInit,
): Promise<Response> {
  const pipeline = await import("@/server/pipeline");
  pipeline.setPipelineDeps({ fetch: replay, now: () => new Date(TODAY) });
  const route = await import("@/app/api/cases/route");
  return route.POST(request(form, signal, headers));
}

async function events(response: Response): Promise<Record<string, unknown>[]> {
  const text = await response.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

async function readLog(): Promise<string> {
  try {
    return await readFile(logPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

async function resetCaseStore(): Promise<void> {
  const { getCaseStore } = await import("@/server/case-store");
  getCaseStore().clear();
}

describe("POST /api/cases replay integration", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("OPENROUTER_API_KEY", "synthetic-test-key");
    vi.stubEnv("LLM_MODEL", "openai/gpt-6-luna");
    vi.stubEnv("VISION_MODEL", "openai/gpt-6-luna");
    vi.stubEnv("JEV_MODEL", "typesafe/jev-1.14");
    vi.stubEnv("DECISION_MODE", "auto");
    vi.stubEnv("CASE_TIMEOUT_MS", "90000");
    vi.stubEnv("POLICIES_DIR", "../docs/policies");
    tempDir = await mkdtemp(path.join(os.tmpdir(), "t14-cases-"));
    logPath = path.join(tempDir, "decisions.jsonl");
    vi.stubEnv("DECISION_LOG_PATH", logPath);
    await resetCaseStore();
  });

  afterEach(async () => {
    await resetCaseStore();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("accepts laptop-1.png by content and streams fast-path progress before one result", async () => {
    const replay = createReplayFetch(["jev-complaint-laptop-1"], {
      mutations: [{ recordingName: "jev-complaint-laptop-1", path: "answers.description_matches_photo.noul", value: 0.9 }],
    });
    const description = "ZZ-SENTINEL-ZZ Ekran laptopa pękł i pojawiły się pionowe pasy.";
    const response = await postCase(makeForm({ description }, await photo()), replay);
    const lines = await events(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(lines.map((line) => line.type === "progress" ? line.step : line.type)).toEqual([
      "upload", "analysis", "decision", "result",
    ]);
    expect(lines.at(-1)).toMatchObject({
      type: "result",
      decision: "rejected",
      firstMessage: { role: "assistant", parts: [{ type: "text" }], metadata: { decision: "rejected" } },
      caseSummary: { caseType: "complaint", category: "laptop", model: "Acer Aspire 5" },
    });
    expect(replay.requests).toHaveLength(1);
    const log = await readLog();
    expect(log.trim().split("\n")).toHaveLength(1);
    expect(log).not.toContain("ZZ-SENTINEL-ZZ");
    expect(log).toContain('"event":"case_decided"');
    const { getCaseStore } = await import("@/server/case-store");
    expect(getCaseStore().size()).toBe(1);
  });

  it("returns exact Polish field errors for invalid input", async () => {
    const response = await postCase(makeForm({ model: "", description: "1234567890123456789", purchaseDate: "2099-01-01" }, await photo()));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "validation",
      fields: {
        model: "Podaj nazwę lub model urządzenia (2–100 znaków).",
        purchaseDate: "Data zakupu nie może być z przyszłości.",
        description: "Opisz problem (min. 20 znaków).",
      },
    });
  });

  it("rejects a photo over 10 MiB after reading multipart data", async () => {
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
    const response = await postCase(makeForm({}, oversized));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "validation", fields: { photo: "Plik przekracza limit 10 MB." } });
  });

  it("rejects an oversized Content-Length before request.formData() is called", async () => {
    const incoming = request(makeForm({}, await photo()), undefined, { "content-length": String(10 * 1024 * 1024 + 64 * 1024 + 1) });
    const formData = vi.spyOn(incoming, "formData");
    const pipeline = await import("@/server/pipeline");
    pipeline.setPipelineDeps({ fetch: createReplayFetch([]), now: () => new Date(TODAY) });
    const route = await import("@/app/api/cases/route");
    const response = await route.POST(incoming);

    expect(response.status).toBe(413);
    expect(formData).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "validation", fields: { photo: "Plik przekracza limit 10 MB." } });
  });

  it("rejects text content named fake.png with 415", async () => {
    const fake = new File(["not an image"], "fake.png", { type: "image/png" });
    const response = await postCase(makeForm({}, fake));

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({ error: "validation", fields: { photo: "Dozwolone formaty: JPG, PNG, WEBP." } });
  });

  it("accepts a real JPEG whose filename and MIME type say PNG", async () => {
    const replay = createReplayFetch(["jev-complaint-laptop-1"], {
      mutations: [{ recordingName: "jev-complaint-laptop-1", path: "answers.description_matches_photo.noul", value: 0.9 }],
    });
    const image = await photo();
    const mismatched = new File([await image.arrayBuffer()], "laptop-1.png", { type: "image/png" });
    const response = await postCase(makeForm({}, mismatched), replay);

    expect(response.status).toBe(200);
    expect((await events(response)).at(-1)?.type).toBe("result");
    expect(replay.requests).toHaveLength(1);
  });

  it("times out a delayed Jev replay and does not call the LLM", async () => {
    vi.stubEnv("CASE_TIMEOUT_MS", "500");
    const replay = createReplayFetch(["jev-complaint-laptop-1", "llm-vision-complaint-laptop-1"], { delayMs: 1000 });
    const started = performance.now();
    const response = await postCase(makeForm({}, await photo("phone-2.jpeg")), replay);
    const lines = await events(response);

    expect(performance.now() - started).toBeLessThan(1000);
    expect(lines.at(-1)).toEqual({ type: "error", code: "timeout" });
    expect(replay.requests).toHaveLength(1);
    expect(await readLog()).toContain('"failureCode":"timeout"');
  });

  it("falls back from a recorded Jev 401 to the recorded vision and decision calls", async () => {
    const replay = createReplayFetch([
      "jev-error-401",
      "llm-vision-complaint-laptop-1",
      "llm-decision-complaint-laptop-1",
    ]);
    const response = await postCase(makeForm({}, await photo()), replay);

    expect((await events(response)).at(-1)?.type).toBe("result");
    expect(replay.requests).toHaveLength(3);
    expect(await readLog()).toContain('"classifierError":"upstream"');
  });

  it("E2E.1: a Jev 400 plus one invalid vision output still ends in the LLM path (vision retried once)", async () => {
    const inner = createReplayFetch([
      "jev-error-unknown-model",
      "llm-vision-complaint-laptop-1",
      "llm-vision-complaint-laptop-1",
      "llm-decision-complaint-laptop-1",
    ]);
    let call = 0;
    const flaky = (async (input: RequestInfo | URL, init?: RequestInit) => {
      call += 1;
      if (call !== 2) return inner(input, init);
      // Declared mutation (MUTATIONS.md): first vision reply carries content that fails ImageAnalysisSchema.
      await inner(input, init);
      const recording = await loadRecording("llm-vision-complaint-laptop-1");
      const mutated = applyMutation(JSON.parse(recording.body.toString("utf8")), "choices.0.message.content", "{\"usable\":\"maybe\"}");
      return new Response(JSON.stringify(mutated), { status: recording.meta.status, headers: recording.meta.headers });
    }) as ReplayFetch;
    flaky.requests = inner.requests;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await postCase(makeForm({}, await photo()), flaky);

    expect((await events(response)).at(-1)?.type).toBe("result");
    const log = await readLog();
    expect(log).toContain('"classifierError":"upstream"');
    expect(log).toContain('"path":"llm"');
  });

  it("E2E.1: an unexpected error stays internal, logs classifierError and the error class to stderr", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const replay = createReplayFetch(["jev-error-unknown-model", "llm-vision-complaint-laptop-1", "llm-vision-complaint-laptop-1"], {
      mutations: [{ recordingName: "llm-vision-complaint-laptop-1", path: "choices.0.message.content", value: "{\"usable\":\"maybe\"}" }],
    });
    const response = await postCase(makeForm({}, await photo()), replay);

    expect((await events(response)).at(-1)).toEqual({ type: "error", code: "internal" });
    const log = await readLog();
    expect(log).toContain('"failureCode":"internal"');
    expect(log).toContain('"classifierError":"upstream"');
    expect(errorSpy.mock.calls.flat().join(" ")).toContain("LlmError");
  });

  it("routes a low-certainty Jev answer to the LLM using the declared recording mutation", async () => {
    const replay = createReplayFetch([
      "jev-complaint-laptop-1",
      "llm-vision-complaint-laptop-1",
      "llm-decision-complaint-laptop-1",
    ], {
      mutations: [{ recordingName: "jev-complaint-laptop-1", path: "answers.image_usable.noul", value: 0.5 }],
    });
    const response = await postCase(makeForm({}, await photo()), replay);

    expect((await events(response)).at(-1)?.type).toBe("result");
    expect(replay.requests).toHaveLength(3);
    expect(await readLog()).toContain('"path":"llm"');
  });

  it("masks a recorded LLM 401 and never includes provider, model, or stack details", async () => {
    const replay = createReplayFetch(["jev-complaint-laptop-1", "llm-error-401"]);
    const response = await postCase(makeForm({}, await photo()), replay);
    const body = await response.text();

    expect(body).toContain('"type":"error","code":"upstream"');
    expect(body.toLowerCase()).not.toContain("openrouter");
    expect(body).not.toContain("openai/gpt-6-luna");
    expect(body).not.toContain("TypeError");
    expect(replay.requests).toHaveLength(2);
  });

  it("maps network TypeErrors to upstream without leaking the error text", async () => {
    const replay = createReplayFetch(["jev-complaint-laptop-1", "llm-vision-complaint-laptop-1"], { failWith: "network" });
    const response = await postCase(makeForm({}, await photo()), replay);
    const body = await response.text();

    expect(body).toContain('"type":"error","code":"upstream"');
    expect(body).not.toContain("fetch failed");
    expect(body.toLowerCase()).not.toContain("openrouter");
    expect(replay.requests).toHaveLength(2);
  });

  it("treats Jev failure as upstream in fast-only mode", async () => {
    vi.stubEnv("DECISION_MODE", "fast-only");
    const replay = createReplayFetch(["jev-error-401"]);
    const response = await postCase(makeForm({}, await photo()), replay);

    expect((await events(response)).at(-1)).toEqual({ type: "error", code: "upstream" });
    expect(replay.requests).toHaveLength(1);
  });

  it("logs client disconnect as case_aborted without persisting a case or emitting an error", async () => {
    const controller = new AbortController();
    const replay = createReplayFetch(["jev-complaint-laptop-1"], { delayMs: 500 });
    const response = await postCase(makeForm({}, await photo()), replay, controller.signal);
    const reader = response.body!.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain('"step":"upload"');
    controller.abort();
    let rest = "";
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      rest += new TextDecoder().decode(part.value);
    }

    expect(rest).not.toContain('"type":"error"');
    expect(await readLog()).toContain('"event":"case_aborted"');
    const { getCaseStore } = await import("@/server/case-store");
    expect(getCaseStore().size()).toBe(0);
    await reader.cancel().catch(() => undefined);
  });

  it("records the shadow fast-path decision in llm-only mode", async () => {
    vi.stubEnv("DECISION_MODE", "llm-only");
    const replay = createReplayFetch([
      "jev-complaint-laptop-1",
      "llm-vision-complaint-laptop-1",
      "llm-decision-complaint-laptop-1",
    ], {
      mutations: [{ recordingName: "jev-complaint-laptop-1", path: "answers.description_matches_photo.noul", value: 0.9 }],
    });
    const response = await postCase(makeForm({}, await photo()), replay);

    expect((await events(response)).at(-1)?.type).toBe("result");
    expect(replay.requests).toHaveLength(3);
    expect(await readLog()).toContain('"shadowFastPathDecision":"rejected"');
  });

  it("returns 405 for non-POST requests", async () => {
    const route = await import("@/app/api/cases/route");
    const response = await route.GET();

    expect(response.status).toBe(405);
  });
});
