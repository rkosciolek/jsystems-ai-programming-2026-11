import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyDraft, type Draft } from "@/components/case-form";
import { submitCase } from "@/lib/client/submit-case";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AC-54 consent is a client-side gate only", () => {
  it("does not include aiConsent in the multipart body sent to /api/cases", async () => {
    let body: FormData | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        body = init?.body as FormData;
        return new Response("", { status: 500 });
      }),
    );
    const draft: Draft = {
      ...emptyDraft(),
      caseType: "complaint",
      category: "laptop",
      model: "ThinkPad T14",
      purchaseDate: "2026-11-20",
      channel: "online",
      description: "Ekran miga od tygodnia po upadku.",
      aiConsent: true,
    };
    const events = [];
    for await (const event of submitCase(draft, new AbortController().signal)) events.push(event);
    expect(events).toEqual([{ type: "error", code: "upstream" }]);
    expect(body).toBeInstanceOf(FormData);
    expect(body!.has("aiConsent")).toBe(false);
    expect(body!.get("model")).toBe("ThinkPad T14");
  });
});
