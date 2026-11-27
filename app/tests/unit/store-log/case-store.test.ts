import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseUIMessage, DateFacts, DecisionOutcome } from "@/lib/domain";
import { createCaseStore, type CaseRecord } from "@/server/case-store";

function makeRecord(caseId: string): CaseRecord {
  const facts: DateFacts = {
    ageDays: 10,
    liabilityEnd: "2028-11-25",
    liabilityExpired: false,
    withdrawalOpen: false,
    voluntaryOpen: false,
    nearDeadline: null,
  };
  const outcome: DecisionOutcome = {
    decision: "accepted",
    citedSections: ["§3 ust. 2"],
    reasonCodes: [],
    path: "fast",
    messageMarkdown: "",
  };
  const firstMessage = {
    id: `msg-${caseId}`,
    role: "assistant",
    parts: [{ type: "text", text: "text" }],
    metadata: { decision: "accepted" },
  } as unknown as CaseUIMessage;
  return {
    caseId,
    createdAt: new Date(0).toISOString(),
    input: {
      caseType: "complaint",
      category: "laptop",
      model: "Model X",
      purchaseDate: "2026-11-01",
      channel: "online",
      description: "Some description of the defect.",
    },
    classifier: null,
    outcome,
    currentDecision: "accepted",
    firstMessage,
    facts,
    revisions: [],
  };
}

describe("case store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-25T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a created record and undefined for an unknown id", () => {
    const store = createCaseStore({ ttlMs: 1000 });
    store.create(makeRecord("HSD-20261125-AAAA"));
    expect(store.get("HSD-20261125-AAAA")?.caseId).toBe("HSD-20261125-AAAA");
    expect(store.get("HSD-20261125-ZZZZ")).toBeUndefined();
  });

  it("expires a record after ttlMs of idle time", () => {
    const store = createCaseStore({ ttlMs: 1000 });
    store.create(makeRecord("HSD-20261125-AAAA"));
    vi.advanceTimersByTime(999);
    expect(store.size()).toBe(1); // size() does not count as an access
    vi.advanceTimersByTime(1);
    expect(store.get("HSD-20261125-AAAA")).toBeUndefined();
    expect(store.size()).toBe(0);
  });

  it("refreshes the TTL on every access", () => {
    const store = createCaseStore({ ttlMs: 1000 });
    store.create(makeRecord("HSD-20261125-AAAA"));
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(900);
      expect(store.get("HSD-20261125-AAAA")).toBeDefined();
    }
    vi.advanceTimersByTime(1000);
    expect(store.get("HSD-20261125-AAAA")).toBeUndefined();
  });

  it("update replaces the record and refreshes its TTL", () => {
    const store = createCaseStore({ ttlMs: 1000 });
    store.create(makeRecord("HSD-20261125-AAAA"));
    vi.advanceTimersByTime(900);
    const updated = store.update("HSD-20261125-AAAA", (record) => ({ ...record, currentDecision: "rejected" }));
    expect(updated?.currentDecision).toBe("rejected");
    vi.advanceTimersByTime(900);
    expect(store.get("HSD-20261125-AAAA")?.currentDecision).toBe("rejected");
    expect(store.update("HSD-20261125-ZZZZ", (record) => record)).toBeUndefined();
  });

  it("caps at 500 records and evicts the oldest by last access", () => {
    const store = createCaseStore({ ttlMs: 60_000, maxRecords: 500 });
    for (let i = 0; i < 500; i++) {
      vi.advanceTimersByTime(1);
      store.create(makeRecord(`HSD-20261125-${i.toString(36).toUpperCase().padStart(4, "0")}`));
    }
    // Touch the oldest record so the second-oldest becomes the eviction candidate.
    const oldest = "HSD-20261125-0000";
    const second = "HSD-20261125-0001";
    vi.advanceTimersByTime(1);
    expect(store.get(oldest)).toBeDefined();

    vi.advanceTimersByTime(1);
    store.create(makeRecord("HSD-20261125-NEW1"));

    expect(store.size()).toBe(500);
    expect(store.get(second)).toBeUndefined();
    expect(store.get(oldest)).toBeDefined();
    expect(store.get("HSD-20261125-NEW1")).toBeDefined();
  });

  it("clear removes every record", () => {
    const store = createCaseStore({ ttlMs: 1000 });
    store.create(makeRecord("HSD-20261125-AAAA"));
    store.clear();
    expect(store.size()).toBe(0);
  });
});
