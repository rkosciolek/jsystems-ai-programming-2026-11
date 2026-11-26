import { describe, expect, it } from "vitest";
import { initialPageState, pageReducer, type PageState } from "@/app/page-state";
import type { Draft } from "@/components/case-form";
import type { CaseEvent } from "@/lib/domain";

const photo = new File([new Uint8Array([0xff, 0xd8])], "laptop.jpg", { type: "image/jpeg" });
const draft: Draft = {
  caseType: "complaint",
  category: "laptop",
  model: "Lenovo ThinkPad T14",
  purchaseDate: "2026-11-01",
  channel: "online",
  description: "Ekran nie działa po upadku.",
  photo,
};

const result: Extract<CaseEvent, { type: "result" }> = {
  type: "result",
  caseId: "HSD-20261125-AB12",
  decision: "needs_info",
  firstMessage: {
    id: "msg-1",
    role: "assistant",
    parts: [{ type: "text", text: "Dzień dobry" }],
    metadata: { decision: "needs_info" },
  },
  caseSummary: {
    caseType: "complaint",
    category: "laptop",
    model: "Lenovo ThinkPad T14",
    purchaseDate: "2026-11-01",
    channel: "online",
  },
};

const formState = (overrides: Partial<Extract<PageState, { kind: "form" }>> = {}): PageState => ({
  kind: "form",
  draft,
  serviceError: false,
  ...overrides,
});

const progressState = (completedSteps: ("upload" | "analysis" | "decision")[] = []): PageState => ({
  kind: "progress",
  draft,
  completedSteps,
});

const chatState: PageState = {
  kind: "chat",
  caseId: result.caseId,
  caseSummary: result.caseSummary,
  thumbnailUrl: "blob:thumb",
  firstMessage: result.firstMessage,
  decision: "needs_info",
};

describe("initialPageState", () => {
  it("starts on an empty form with no service error", () => {
    expect(initialPageState).toEqual({ kind: "form", draft: { model: "", purchaseDate: "", description: "" }, serviceError: false });
  });
});

describe("pageReducer transitions (ADR-003 section 3.1)", () => {
  it("form + submit moves to progress with the draft kept and no completed steps", () => {
    expect(pageReducer(formState(), { type: "submit", draft })).toEqual({
      kind: "progress",
      draft,
      completedSteps: [],
    });
  });

  it("submit clears a previous service error and server field errors", () => {
    const state = formState({ serviceError: true, serverFieldErrors: { model: "x" } });
    const next = pageReducer(state, { type: "submit", draft });
    expect(next.kind).toBe("progress");
    expect(next).not.toHaveProperty("serverFieldErrors");
  });

  it("progress + progress event records the completed step once, in order", () => {
    let state = progressState();
    state = pageReducer(state, { type: "progress", step: "upload" });
    state = pageReducer(state, { type: "progress", step: "upload" });
    state = pageReducer(state, { type: "progress", step: "analysis" });
    expect(state).toEqual({ kind: "progress", draft, completedSteps: ["upload", "analysis"] });
  });

  it("progress + result moves to chat with the case data and the thumbnail URL", () => {
    expect(pageReducer(progressState(["upload", "analysis"]), { type: "result", event: result, thumbnailUrl: "blob:thumb" })).toEqual({
      kind: "chat",
      caseId: result.caseId,
      caseSummary: result.caseSummary,
      thumbnailUrl: "blob:thumb",
      firstMessage: result.firstMessage,
      decision: "needs_info",
    });
  });

  it("progress + serviceError returns to form with the draft kept and the banner set", () => {
    expect(pageReducer(progressState(["upload"]), { type: "serviceError" })).toEqual({
      kind: "form",
      draft,
      serviceError: true,
    });
  });

  it("the kept draft keeps the same File reference after a service error", () => {
    const next = pageReducer(progressState(), { type: "serviceError" });
    expect(next.kind === "form" && next.draft.photo).toBe(photo);
  });

  it("progress + validationError returns to form with field errors and no banner", () => {
    const fields = { model: "Podaj nazwę lub model urządzenia (2–100 znaków)." };
    expect(pageReducer(progressState(), { type: "validationError", fields })).toEqual({
      kind: "form",
      draft,
      serviceError: false,
      serverFieldErrors: fields,
    });
  });

  it("chat + newCase resets to an empty form", () => {
    expect(pageReducer(chatState, { type: "newCase" })).toEqual({
      kind: "form",
      draft: { model: "", purchaseDate: "", description: "" },
      serviceError: false,
    });
  });
});

describe("pageReducer ignores events that are not valid for the current state", () => {
  it.each<[string, PageState, Parameters<typeof pageReducer>[1]]>([
    ["form + progress", formState(), { type: "progress", step: "upload" }],
    ["form + result", formState(), { type: "result", event: result, thumbnailUrl: "blob:x" }],
    ["form + serviceError", formState(), { type: "serviceError" }],
    ["form + validationError", formState(), { type: "validationError", fields: {} }],
    ["form + newCase", formState(), { type: "newCase" }],
    ["progress + submit", progressState(), { type: "submit", draft }],
    ["progress + newCase", progressState(), { type: "newCase" }],
    ["chat + submit", chatState, { type: "submit", draft }],
    ["chat + progress", chatState, { type: "progress", step: "upload" }],
    ["chat + serviceError", chatState, { type: "serviceError" }],
    ["chat + result", chatState, { type: "result", event: result, thumbnailUrl: "blob:x" }],
  ])("%s returns the same state object", (_name, state, action) => {
    expect(pageReducer(state, action)).toBe(state);
  });
});
