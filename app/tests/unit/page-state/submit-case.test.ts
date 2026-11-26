import { afterEach, describe, expect, it, vi } from "vitest";
import { parseNdjson, submitCase, ValidationError } from "@/lib/client/submit-case";
import type { CaseEvent } from "@/lib/domain";
import type { Draft } from "@/components/case-form";

const encoder = new TextEncoder();

function streamOf(...chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
      }
      controller.close();
    },
  });
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iterable) out.push(item);
  return out;
}

const resultEvent: CaseEvent = {
  type: "result",
  caseId: "HSD-20261125-AB12",
  decision: "accepted",
  firstMessage: {
    id: "msg-1",
    role: "assistant",
    parts: [{ type: "text", text: "Dzień dobry" }],
    metadata: { decision: "accepted" },
  },
  caseSummary: {
    caseType: "complaint",
    category: "laptop",
    model: "Lenovo ThinkPad T14",
    purchaseDate: "2026-11-01",
    channel: "online",
  },
};

const progressUpload = JSON.stringify({ type: "progress", step: "upload" });
const progressAnalysis = JSON.stringify({ type: "progress", step: "analysis" });

const draft: Draft = {
  caseType: "complaint",
  category: "laptop",
  model: "Lenovo ThinkPad T14",
  purchaseDate: "2026-11-01",
  channel: "online",
  description: "Ekran nie działa po upadku.",
  photo: new File([new Uint8Array([0xff, 0xd8, 0xff])], "laptop.jpg", { type: "image/jpeg" }),
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("parseNdjson", () => {
  it("yields events in order for complete lines", async () => {
    const events = await collect(
      parseNdjson(streamOf(`${progressUpload}\n${progressAnalysis}\n${JSON.stringify(resultEvent)}\n`)),
    );
    expect(events).toEqual([{ type: "progress", step: "upload" }, { type: "progress", step: "analysis" }, resultEvent]);
  });

  it("reassembles a line split across chunk boundaries", async () => {
    const text = `${progressUpload}\n${progressAnalysis}\n`;
    const cut = 10;
    const events = await collect(parseNdjson(streamOf(text.slice(0, cut), text.slice(cut, 40), text.slice(40))));
    expect(events).toEqual([{ type: "progress", step: "upload" }, { type: "progress", step: "analysis" }]);
  });

  it("decodes a multi-byte UTF-8 character split between chunks", async () => {
    const bytes = encoder.encode(`${JSON.stringify(resultEvent)}\n`);
    const polishN = encoder.encode("ń");
    const at = bytes.findIndex((_, i) => bytes[i] === polishN[0] && bytes[i + 1] === polishN[1]);
    expect(at).toBeGreaterThan(0);
    const events = await collect(parseNdjson(streamOf(bytes.slice(0, at + 1), bytes.slice(at + 1))));
    expect(events).toEqual([resultEvent]);
  });

  it("accepts a last line without a trailing newline", async () => {
    const events = await collect(parseNdjson(streamOf(`${progressUpload}\n${progressAnalysis}`)));
    expect(events).toEqual([{ type: "progress", step: "upload" }, { type: "progress", step: "analysis" }]);
  });

  it("ignores blank lines, including an empty trailing line", async () => {
    const events = await collect(parseNdjson(streamOf(`\n${progressUpload}\n\n   \n`)));
    expect(events).toEqual([{ type: "progress", step: "upload" }]);
  });

  it("yields an internal error for invalid JSON and stops reading", async () => {
    const events = await collect(parseNdjson(streamOf(`${progressUpload}\n{not json\n${progressAnalysis}\n`)));
    expect(events).toEqual([{ type: "progress", step: "upload" }, { type: "error", code: "internal" }]);
  });

  it("yields an internal error for a line that fails the event schema and stops", async () => {
    const events = await collect(
      parseNdjson(streamOf(`${JSON.stringify({ type: "progress", step: "unknown" })}\n${progressUpload}\n`)),
    );
    expect(events).toEqual([{ type: "error", code: "internal" }]);
  });
});

describe("submitCase", () => {
  it("posts multipart FormData with the draft fields and the photo File to /api/cases", async () => {
    const fetchMock = vi.fn(async () => new Response(streamOf(`${JSON.stringify(resultEvent)}\n`), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await collect(submitCase(draft, new AbortController().signal));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/cases");
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("caseType")).toBe("complaint");
    expect(body.get("category")).toBe("laptop");
    expect(body.get("model")).toBe("Lenovo ThinkPad T14");
    expect(body.get("purchaseDate")).toBe("2026-11-01");
    expect(body.get("channel")).toBe("online");
    expect(body.get("description")).toBe("Ekran nie działa po upadku.");
    expect(body.get("photo")).toBe(draft.photo);
  });

  it("passes the abort signal to fetch", async () => {
    const fetchMock = vi.fn(async () => new Response(streamOf(), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    await collect(submitCase(draft, controller.signal));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });

  it("streams the NDJSON events of a 200 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(streamOf(`${progressUpload}\n${JSON.stringify(resultEvent)}\n`), { status: 200 })),
    );
    const events = await collect(submitCase(draft, new AbortController().signal));
    expect(events).toEqual([{ type: "progress", step: "upload" }, resultEvent]);
  });

  it.each([
    [400, "model", "Podaj nazwę lub model urządzenia (2–100 znaków)."],
    [413, "photo", "Plik przekracza limit 10 MB."],
    [415, "photo", "Dozwolone formaty: JPG, PNG, WEBP."],
  ])("throws ValidationError for HTTP %i with a fields body", async (status, field, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "validation", fields: { [field]: message } }), {
          status,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const error = await collect(submitCase(draft, new AbortController().signal)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    const validation = error as ValidationError;
    expect(validation.status).toBe(status);
    expect(validation.fields).toEqual({ [field]: message });
  });

  it("maps a 400 without a fields body to an upstream error event", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad", { status: 400 })));
    expect(await collect(submitCase(draft, new AbortController().signal))).toEqual([
      { type: "error", code: "upstream" },
    ]);
  });

  it.each([500, 502, 404, 405])("maps HTTP %i to an upstream error event", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>oops</html>", { status })));
    expect(await collect(submitCase(draft, new AbortController().signal))).toEqual([
      { type: "error", code: "upstream" },
    ]);
  });

  it("yields an internal error when the stream ends without a terminal event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(streamOf(`${progressUpload}\n`), { status: 200 })),
    );
    expect(await collect(submitCase(draft, new AbortController().signal))).toEqual([
      { type: "progress", step: "upload" },
      { type: "error", code: "internal" },
    ]);
  });

  it("lets a network failure reject so the page can show the service banner", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    await expect(collect(submitCase(draft, new AbortController().signal))).rejects.toThrow(TypeError);
  });
});
