import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseInput } from "@/lib/domain";
import type { CaseRecord } from "@/server/case-store";
import { buildChatSystem } from "@/server/llm/chat";

const input: CaseInput = {
  caseType: "complaint",
  category: "laptop",
  model: "Acer Aspire 5",
  purchaseDate: "2026-09-01",
  channel: "online",
  description: "Ekran laptopa pękł w lewym rogu i pojawiły się pionowe pasy.",
};

const record: CaseRecord = {
  caseId: "HSD-20261126-T3B1",
  createdAt: "2026-11-26T00:00:00.000Z",
  input,
  classifier: { answers: { damage_cause: { value: "impact", certainty: 0.9 } }, model: "recorded-jev" },
  imageAnalysis: { usable: true, conditionSummaryPl: "Pęknięty ekran", damage: { probableCause: "impact" } },
  outcome: {
    decision: "rejected",
    citedSections: ["§4 ust. 1"],
    reasonCodes: ["user_caused_damage"],
    path: "llm",
    messageMarkdown: "stored first message",
  },
  currentDecision: "rejected",
  firstMessage: {
    id: "HSD-20261126-T3B1-initial",
    role: "assistant",
    parts: [{ type: "text", text: "stored first message" }],
    metadata: { decision: "rejected" },
  },
  facts: {
    ageDays: 86,
    liabilityEnd: "2028-09-01",
    liabilityExpired: false,
    withdrawalOpen: false,
    voluntaryOpen: false,
    nearDeadline: null,
  },
  revisions: [],
};

describe("buildChatSystem", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "synthetic-test-key");
    vi.stubEnv("LLM_MODEL", "openai/gpt-6-luna");
    vi.stubEnv("POLICIES_DIR", "../docs/policies");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("includes the matching policy and server-owned facts, decision, analysis, and revision history", () => {
    const prompt = buildChatSystem(record);

    expect(prompt).toContain("<policy>");
    expect(prompt).toContain("# Regulamin reklamacji (przykład)");
    expect(prompt).toContain('"liabilityEnd":"2028-09-01"');
    expect(prompt).toContain('"currentDecision":"rejected"');
    expect(prompt).toContain('"probableCause":"impact"');
    expect(prompt).toContain("<case>");
    expect(prompt).not.toContain("<return-policy>");
  });

});
