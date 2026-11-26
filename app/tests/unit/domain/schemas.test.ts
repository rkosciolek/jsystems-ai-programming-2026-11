import { describe, expect, it } from "vitest";
import {
  CASE_ID_REGEX,
  CASE_TYPES,
  CATEGORIES,
  CHANNELS,
  CITED_SECTION_REGEX,
  CaseEventSchema,
  CaseSummarySchema,
  DECISIONS,
  DECISION_LABELS,
  DateFactsSchema,
  DecisionDataSchema,
  DecisionLogEntrySchema,
  DecisionOutcomeSchema,
  ImageAnalysisSchema,
  LOG_FIELDS,
  ReviseDecisionInputSchema,
  makeCaseInputSchema,
  makeReviseDecisionInputSchema,
  todayInWarsaw,
} from "../../../src/lib/domain";

const TODAY = "2026-11-26";
const MSG_MODEL = "Podaj nazwę lub model urządzenia (2–100 znaków).";
const MSG_INVALID_DATE = "Podaj poprawną datę zakupu.";
const MSG_FUTURE = "Data zakupu nie może być z przyszłości.";
const MSG_DESCRIPTION = "Opisz problem (min. 20 znaków).";

const validComplaint = {
  caseType: "complaint",
  category: "laptop",
  model: "Lenovo ThinkPad T14",
  purchaseDate: "2026-11-01",
  channel: "online",
  description: "Ekran miga od tygodnia po upadku.",
};

const validReturn = {
  caseType: "return",
  category: "smartphone",
  model: "Phone X",
  purchaseDate: "2026-11-20",
  channel: "store",
  description: "",
};

function schema() {
  return makeCaseInputSchema(TODAY);
}

function messagesAt(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }, key: string) {
  if (result.success || !result.error) return [];
  return result.error.issues.filter((i) => i.path[0] === key).map((i) => i.message);
}

describe("enums and fixed lists", () => {
  it("CASE_TYPES is exactly complaint then return", () => {
    expect(CASE_TYPES).toEqual(["complaint", "return"]);
  });

  it("CHANNELS is exactly online then store", () => {
    expect(CHANNELS).toEqual(["online", "store"]);
  });

  it("DECISIONS is exactly accepted, rejected, needs_info, escalated", () => {
    expect(DECISIONS).toEqual(["accepted", "rejected", "needs_info", "escalated"]);
  });

  it("CATEGORIES has the PRD section 8 ids and labels in order", () => {
    expect(CATEGORIES).toEqual([
      { id: "laptop", label: "Laptop" },
      { id: "smartphone", label: "Smartfon" },
      { id: "tablet", label: "Tablet" },
      { id: "monitor", label: "Monitor" },
      { id: "tv", label: "Telewizor" },
      { id: "audio", label: "Słuchawki i audio" },
      { id: "wearable", label: "Smartwatch i opaska sportowa" },
      { id: "console", label: "Konsola do gier" },
      { id: "camera", label: "Aparat fotograficzny" },
      { id: "other", label: "Inne" },
    ]);
  });

  it("DECISION_LABELS maps each decision to its PRD AC-22 label", () => {
    expect(DECISION_LABELS).toEqual({
      accepted: "Wstępnie zaakceptowano",
      rejected: "Wstępnie odrzucono",
      needs_info: "Wymaga uzupełnienia",
      escalated: "Przekazano do specjalisty",
    });
  });
});

describe("todayInWarsaw", () => {
  it("returns the Warsaw calendar date, which is ahead of UTC after 23:00Z in November", () => {
    expect(todayInWarsaw(new Date("2026-11-25T23:30:00Z"))).toBe("2026-11-26");
  });

  it("returns the same Warsaw date before the midnight boundary", () => {
    expect(todayInWarsaw(new Date("2026-11-25T22:30:00Z"))).toBe("2026-11-25");
  });

  it("returns YYYY-MM-DD", () => {
    expect(todayInWarsaw(new Date("2026-07-01T12:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("makeCaseInputSchema", () => {
  it("accepts a valid complaint", () => {
    expect(schema().safeParse(validComplaint).success).toBe(true);
  });

  it("accepts a valid return with an empty description", () => {
    expect(schema().safeParse(validReturn).success).toBe(true);
  });

  it("rejects unknown enum values for caseType, category and channel", () => {
    expect(schema().safeParse({ ...validComplaint, caseType: "refund" }).success).toBe(false);
    expect(schema().safeParse({ ...validComplaint, category: "phone" }).success).toBe(false);
    expect(schema().safeParse({ ...validComplaint, channel: "mail" }).success).toBe(false);
  });

  describe("model (trimmed length 2-100)", () => {
    it.each([2, 100])("accepts a model of %i characters", (n) => {
      expect(schema().safeParse({ ...validComplaint, model: "a".repeat(n) }).success).toBe(true);
    });

    it.each([1, 101])("rejects a model of %i characters with the AC-04 message", (n) => {
      const result = schema().safeParse({ ...validComplaint, model: "a".repeat(n) });
      expect(result.success).toBe(false);
      expect(messagesAt(result, "model")).toContain(MSG_MODEL);
    });

    it("measures the length after trimming whitespace", () => {
      expect(schema().safeParse({ ...validComplaint, model: "  ab  " }).success).toBe(true);
      const result = schema().safeParse({ ...validComplaint, model: "  a  " });
      expect(result.success).toBe(false);
      expect(messagesAt(result, "model")).toContain(MSG_MODEL);
    });
  });

  describe("purchaseDate", () => {
    it("accepts today", () => {
      expect(schema().safeParse({ ...validComplaint, purchaseDate: TODAY }).success).toBe(true);
    });

    it("accepts dates older than the policy periods", () => {
      expect(schema().safeParse({ ...validComplaint, purchaseDate: "2019-03-04" }).success).toBe(true);
    });

    it("accepts the lower bound 2000-01-01", () => {
      expect(schema().safeParse({ ...validComplaint, purchaseDate: "2000-01-01" }).success).toBe(true);
    });

    it.each(["1999-12-31", "0326-03-04", "1900-01-01"])("rejects %s as before the lower bound with the invalid-date message", (value) => {
      const result = schema().safeParse({ ...validComplaint, purchaseDate: value });
      expect(result.success).toBe(false);
      expect(messagesAt(result, "purchaseDate")).toEqual([MSG_INVALID_DATE]);
    });

    it("rejects tomorrow with the AC-05 message", () => {
      const result = schema().safeParse({ ...validComplaint, purchaseDate: "2026-11-27" });
      expect(result.success).toBe(false);
      expect(messagesAt(result, "purchaseDate")).toContain(MSG_FUTURE);
    });

    it.each(["26.11.2026", "2026-02-30", "2026-13-01", "2026/11/26"])("rejects malformed or impossible date %s", (value) => {
      expect(schema().safeParse({ ...validReturn, purchaseDate: value }).success).toBe(false);
    });
  });

  describe("description for complaints (20-2000 chars after trim)", () => {
    it.each([20, 2000])("accepts %i characters", (n) => {
      expect(schema().safeParse({ ...validComplaint, description: "a".repeat(n) }).success).toBe(true);
    });

    it.each([19, 2001])("rejects %i characters with the AC-07 message", (n) => {
      const result = schema().safeParse({ ...validComplaint, description: "a".repeat(n) });
      expect(result.success).toBe(false);
      expect(messagesAt(result, "description")).toContain(MSG_DESCRIPTION);
    });

    it("rejects an empty description with the AC-07 message", () => {
      const result = schema().safeParse({ ...validComplaint, description: "" });
      expect(result.success).toBe(false);
      expect(messagesAt(result, "description")).toContain(MSG_DESCRIPTION);
    });

    it("measures the length after trimming whitespace", () => {
      const result = schema().safeParse({ ...validComplaint, description: `  ${"a".repeat(18)}  ` });
      expect(result.success).toBe(false);
      expect(messagesAt(result, "description")).toContain(MSG_DESCRIPTION);
    });
  });

  describe("description for returns (0-2000 chars)", () => {
    it("accepts an empty description", () => {
      expect(schema().safeParse({ ...validReturn, description: "" }).success).toBe(true);
    });

    it("accepts 2000 characters", () => {
      expect(schema().safeParse({ ...validReturn, description: "a".repeat(2000) }).success).toBe(true);
    });

    it("rejects 2001 characters", () => {
      expect(schema().safeParse({ ...validReturn, description: "a".repeat(2001) }).success).toBe(false);
    });
  });

  it("uses the supplied today value, not the wall clock", () => {
    const strict = makeCaseInputSchema("2026-01-10");
    expect(strict.safeParse({ ...validComplaint, purchaseDate: "2026-01-10" }).success).toBe(true);
    expect(strict.safeParse({ ...validComplaint, purchaseDate: "2026-01-11" }).success).toBe(false);
  });
});

describe("CITED_SECTION_REGEX and CASE_ID_REGEX", () => {
  it.each(["§3", "§3 ust. 2", "§12 ust. 10"])("accepts the citation %s", (value) => {
    expect(CITED_SECTION_REGEX.test(value)).toBe(true);
  });

  it.each(["§ 3", "3 ust. 2", "§3 ust.2", "§3 ust. 2 ", "§3 ust. 2 pkt 1"])("rejects the citation %s", (value) => {
    expect(CITED_SECTION_REGEX.test(value)).toBe(false);
  });

  it("accepts a case number in the HSD-YYYYMMDD-XXXX format", () => {
    expect(CASE_ID_REGEX.test("HSD-20261126-AB12")).toBe(true);
  });

  it.each(["HSD-2026112-AB12", "HSD-20261126-ab12", "HSD-20261126-AB1", "XYZ-20261126-AB12"])("rejects the case number %s", (value) => {
    expect(CASE_ID_REGEX.test(value)).toBe(false);
  });
});

describe("DateFactsSchema", () => {
  const facts = {
    ageDays: 10,
    liabilityEnd: "2028-11-01",
    liabilityExpired: false,
    withdrawalOpen: true,
    voluntaryOpen: true,
    nearDeadline: null,
  };

  it("accepts a full facts object", () => {
    expect(DateFactsSchema.safeParse(facts).success).toBe(true);
  });

  it.each(["liability", "withdrawal", "voluntary"])("accepts nearDeadline %s", (value) => {
    expect(DateFactsSchema.safeParse({ ...facts, nearDeadline: value }).success).toBe(true);
  });

  it("rejects an unknown nearDeadline value", () => {
    expect(DateFactsSchema.safeParse({ ...facts, nearDeadline: "warranty" }).success).toBe(false);
  });

  it("rejects a missing ageDays", () => {
    const rest: Partial<typeof facts> = { ...facts };
    delete rest.ageDays;
    expect(DateFactsSchema.safeParse(rest).success).toBe(false);
  });
});

describe("ImageAnalysisSchema (ADR-001 section 4)", () => {
  const common = {
    usable: true,
    usabilityProblem: "none",
    matchesCategory: true,
    matchesModel: "unknown",
    conditionSummaryPl: "Widoczne zarysowania na obudowie.",
    confidence: "high",
    notDeterminableFromPhoto: [],
  };

  it("accepts a complaint analysis with the damage object", () => {
    const complaint = {
      ...common,
      damage: { visible: true, type: "scratch", location: "lid", extent: "minor", probableCause: "impact" },
    };
    expect(ImageAnalysisSchema.safeParse(complaint).success).toBe(true);
  });

  it("accepts a return analysis with signsOfUse, resaleSuitability and packagingVisible", () => {
    const ret = { ...common, signsOfUse: ["minor scratches"], resaleSuitability: "only_as_used", packagingVisible: false };
    expect(ImageAnalysisSchema.safeParse(ret).success).toBe(true);
  });

  it("accepts the base fields alone, because complaint-only and return-only fields are optional", () => {
    expect(ImageAnalysisSchema.safeParse(common).success).toBe(true);
  });

  it("rejects an unknown usabilityProblem", () => {
    expect(ImageAnalysisSchema.safeParse({ ...common, usabilityProblem: "fuzzy" }).success).toBe(false);
  });

  it("rejects a conditionSummaryPl longer than 600 characters", () => {
    expect(ImageAnalysisSchema.safeParse({ ...common, conditionSummaryPl: "a".repeat(601) }).success).toBe(false);
  });

  it("rejects an unknown confidence value", () => {
    expect(ImageAnalysisSchema.safeParse({ ...common, confidence: "certain" }).success).toBe(false);
  });
});

describe("DecisionOutcomeSchema", () => {
  const outcome = {
    decision: "rejected",
    citedSections: ["§3 ust. 2"],
    reasonCodes: ["liability_expired"],
    path: "llm",
    messageMarkdown: "**Wstępna ocena**: wstępnie odrzucono.",
  };

  it("accepts a valid outcome", () => {
    expect(DecisionOutcomeSchema.safeParse(outcome).success).toBe(true);
  });

  it("accepts the fast path", () => {
    expect(DecisionOutcomeSchema.safeParse({ ...outcome, path: "fast" }).success).toBe(true);
  });

  it("accepts a citation without a sub-paragraph", () => {
    expect(DecisionOutcomeSchema.safeParse({ ...outcome, citedSections: ["§3"] }).success).toBe(true);
  });

  it("rejects an empty citedSections array", () => {
    expect(DecisionOutcomeSchema.safeParse({ ...outcome, citedSections: [] }).success).toBe(false);
  });

  it("rejects a malformed citation", () => {
    expect(DecisionOutcomeSchema.safeParse({ ...outcome, citedSections: ["§ 3"] }).success).toBe(false);
  });

  it("rejects a path other than fast or llm", () => {
    expect(DecisionOutcomeSchema.safeParse({ ...outcome, path: "shadow" }).success).toBe(false);
  });

  it("rejects a decision outside the enum", () => {
    expect(DecisionOutcomeSchema.safeParse({ ...outcome, decision: "maybe" }).success).toBe(false);
  });
});

describe("ReviseDecisionInputSchema (ADR-001 section 3.7)", () => {
  it("accepts a revision without corrections", () => {
    expect(ReviseDecisionInputSchema.safeParse({ newDecision: "escalated", reason: "Klient prosi o specjalistę." }).success).toBe(true);
  });

  it("accepts a reason of exactly 300 characters", () => {
    expect(ReviseDecisionInputSchema.safeParse({ newDecision: "needs_info", reason: "a".repeat(300) }).success).toBe(true);
  });

  it("rejects a reason of 301 characters", () => {
    expect(ReviseDecisionInputSchema.safeParse({ newDecision: "needs_info", reason: "a".repeat(301) }).success).toBe(false);
  });

  it("accepts corrections with purchaseDate and channel", () => {
    const input = {
      newDecision: "accepted",
      reason: "Klient podał właściwą datę zakupu.",
      corrections: { purchaseDate: "2026-11-20", channel: "store" },
    };
    expect(ReviseDecisionInputSchema.safeParse(input).success).toBe(true);
  });

  it("accepts corrections with only one of the two fields", () => {
    expect(ReviseDecisionInputSchema.safeParse({ newDecision: "accepted", reason: "x", corrections: { channel: "online" } }).success).toBe(true);
  });

  it("rejects a channel correction outside online and store", () => {
    expect(ReviseDecisionInputSchema.safeParse({ newDecision: "accepted", reason: "x", corrections: { channel: "mail" } }).success).toBe(false);
  });

  it("rejects a malformed purchaseDate correction", () => {
    expect(ReviseDecisionInputSchema.safeParse({ newDecision: "accepted", reason: "x", corrections: { purchaseDate: "20.11.2026" } }).success).toBe(false);
  });

  it("rejects a purchaseDate correction before 2000-01-01 with the invalid-date message", () => {
    const result = makeReviseDecisionInputSchema(TODAY).safeParse({
      newDecision: "accepted",
      reason: "x",
      corrections: { purchaseDate: "1999-12-31" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([MSG_INVALID_DATE]);
  });

  it("accepts a purchaseDate correction of exactly 2000-01-01", () => {
    expect(
      makeReviseDecisionInputSchema(TODAY).safeParse({ newDecision: "accepted", reason: "x", corrections: { purchaseDate: "2000-01-01" } }).success,
    ).toBe(true);
  });

  it("rejects a newDecision outside the enum", () => {
    expect(ReviseDecisionInputSchema.safeParse({ newDecision: "approved", reason: "x" }).success).toBe(false);
  });
});

describe("CaseSummarySchema and DecisionDataSchema", () => {
  it("accepts a case summary with the five form fields", () => {
    const summary = {
      caseType: "return",
      category: "tablet",
      model: "Tab S9",
      purchaseDate: "2026-11-20",
      channel: "online",
    };
    expect(CaseSummarySchema.safeParse(summary).success).toBe(true);
  });

  it("rejects a case summary with an unknown caseType", () => {
    expect(
      CaseSummarySchema.safeParse({ caseType: "refund", category: "tablet", model: "Tab S9", purchaseDate: "2026-11-20", channel: "online" }).success,
    ).toBe(false);
  });

  it("accepts a data part with only the decision", () => {
    expect(DecisionDataSchema.safeParse({ decision: "accepted" }).success).toBe(true);
  });

  it("accepts a data part with previous and reason", () => {
    expect(DecisionDataSchema.safeParse({ decision: "rejected", previous: "accepted", reason: "Nowe fakty." }).success).toBe(true);
  });

  it("accepts a data part with applied corrections", () => {
    expect(
      DecisionDataSchema.safeParse({ decision: "accepted", previous: "rejected", corrections: { purchaseDate: "2026-11-16", channel: "online" } }).success,
    ).toBe(true);
    expect(DecisionDataSchema.safeParse({ decision: "accepted", corrections: { channel: "online" } }).success).toBe(true);
  });

  it("rejects a data part with an invalid corrections channel", () => {
    expect(DecisionDataSchema.safeParse({ decision: "accepted", corrections: { channel: "mail" } }).success).toBe(false);
  });

  it("rejects a data part with an unknown decision", () => {
    expect(DecisionDataSchema.safeParse({ decision: "pending" }).success).toBe(false);
  });
});

describe("CaseEventSchema (NDJSON events, ADR-002 section 4)", () => {
  const firstMessage = {
    id: "msg-1",
    role: "assistant",
    parts: [{ type: "text", text: "Dzień dobry" }],
    metadata: { decision: "accepted" },
  };
  const caseSummary = {
    caseType: "complaint",
    category: "laptop",
    model: "ThinkPad T14",
    purchaseDate: "2026-11-01",
    channel: "online",
  };

  it.each(["upload", "analysis", "decision"])("accepts a progress event for step %s", (step) => {
    expect(CaseEventSchema.safeParse({ type: "progress", step }).success).toBe(true);
  });

  it("rejects a progress event with an unknown step", () => {
    expect(CaseEventSchema.safeParse({ type: "progress", step: "chat" }).success).toBe(false);
  });

  it("accepts a result event", () => {
    const result = { type: "result", caseId: "HSD-20261126-AB12", decision: "accepted", firstMessage, caseSummary };
    expect(CaseEventSchema.safeParse(result).success).toBe(true);
  });

  it("rejects a result whose firstMessage role is not assistant", () => {
    const result = {
      type: "result",
      caseId: "HSD-20261126-AB12",
      decision: "accepted",
      firstMessage: { ...firstMessage, role: "user" },
      caseSummary,
    };
    expect(CaseEventSchema.safeParse(result).success).toBe(false);
  });

  it("rejects a result without caseSummary", () => {
    const result = { type: "result", caseId: "HSD-20261126-AB12", decision: "accepted", firstMessage };
    expect(CaseEventSchema.safeParse(result).success).toBe(false);
  });

  it.each(["timeout", "upstream", "internal"])("accepts an error event with code %s", (code) => {
    expect(CaseEventSchema.safeParse({ type: "error", code }).success).toBe(true);
  });

  it("rejects an error event with an unknown code", () => {
    expect(CaseEventSchema.safeParse({ type: "error", code: "rate_limited" }).success).toBe(false);
  });

  it("rejects an event whose type is not in the union", () => {
    expect(CaseEventSchema.safeParse({ type: "done" }).success).toBe(false);
  });
});

describe("DecisionLogEntrySchema and LOG_FIELDS (ADR-000 section 5 allowlist)", () => {
  const ADR_000_FIELDS = [
    "ts",
    "event",
    "caseId",
    "mode",
    "caseType",
    "category",
    "channel",
    "facts",
    "path",
    "reasons",
    "gateFailedAt",
    "uncertainQuestions",
    "minGatingCertainty",
    "classifierAnswers",
    "classifierError",
    "shadowFastPathDecision",
    "decision",
    "citedSections",
    "reasonCodes",
    "previousDecision",
    "corrections",
    "models",
    "failureCode",
    "step",
    "latencyMs",
    "costUsd",
  ];

  it("LOG_FIELDS is exactly the ADR-000 section 5 field names, without duplicates", () => {
    expect([...LOG_FIELDS].sort()).toEqual([...ADR_000_FIELDS].sort());
    expect(new Set(LOG_FIELDS).size).toBe(LOG_FIELDS.length);
  });

  const decided = {
    ts: "2026-11-26T10:00:00.000Z",
    event: "case_decided",
    caseId: "HSD-20261126-AB12",
    mode: "auto",
    caseType: "complaint",
    category: "laptop",
    channel: "online",
    facts: {
      ageDays: 10,
      liabilityEnd: "2028-11-01",
      liabilityExpired: false,
      withdrawalOpen: true,
      voluntaryOpen: true,
      nearDeadline: null,
    },
    path: "fast",
    reasons: [],
    gateFailedAt: null,
    uncertainQuestions: [],
    minGatingCertainty: 0.93,
    classifierAnswers: { damage_cause: { value: "impact", certainty: 0.93 } },
    classifierError: null,
    shadowFastPathDecision: null,
    decision: "rejected",
    citedSections: ["§3 ust. 1"],
    reasonCodes: ["user_damage"],
    models: { classifier: "typesafe/jev-1.14", vision: null, decision: null, chat: null },
    latencyMs: { total: 812, classifier: 640 },
    costUsd: { classifier: 0.0002 },
  };

  it("accepts a full case_decided entry", () => {
    expect(DecisionLogEntrySchema.safeParse(decided).success).toBe(true);
  });

  it("accepts a case_failed entry with failureCode and step", () => {
    const failed = { ...decided, event: "case_failed", failureCode: "timeout", step: "analysis" };
    expect(DecisionLogEntrySchema.safeParse(failed).success).toBe(true);
  });

  it("rejects an unknown event name", () => {
    expect(DecisionLogEntrySchema.safeParse({ ...decided, event: "case_exploded" }).success).toBe(false);
  });

  it("rejects an unknown mode", () => {
    expect(DecisionLogEntrySchema.safeParse({ ...decided, mode: "turbo" }).success).toBe(false);
  });

  it("never lets the description through the log schema", () => {
    const leaked = { ...decided, description: "Ekran miga od tygodnia po upadku." };
    const parsed = DecisionLogEntrySchema.safeParse(leaked);
    // Either the entry is rejected or the field is stripped; it must never be kept.
    expect(parsed.success ? "description" in parsed.data : true).toBe(false);
  });
});
