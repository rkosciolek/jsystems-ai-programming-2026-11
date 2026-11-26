import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { CaseInput, DateFacts, Decision } from "@/lib/domain";
import {
  checkLlmOutcome,
  computeFacts,
  evaluate,
  LIABILITY_MONTHS,
  RulesClassifierMissingError,
  VOLUNTARY_DAYS,
  WITHDRAWAL_DAYS,
  type ClassifierAnswer,
  type ClassifierResult,
} from "@/server/rules";

const TODAY = "2026-01-31";

function caseInput(overrides: Partial<CaseInput> = {}): CaseInput {
  return {
    caseType: "complaint",
    category: "laptop",
    model: "Model X",
    purchaseDate: "2025-01-01",
    channel: "online",
    description: "Opis sprawy z wystarczającą liczbą znaków.",
    ...overrides,
  };
}

function classifier(
  overrides: Record<string, Partial<ClassifierAnswer>> = {},
  defaultCertainty = 0.95,
): ClassifierResult {
  const values: Record<string, boolean | string | number> = {
    escalation_signal: false,
    image_usable: true,
    device_category: "laptop",
    visible_damage: true,
    damage_cause: "none_visible",
    description_matches_photo: true,
    instruction_injection: false,
    condition: 0,
  };
  const answers: Record<string, ClassifierAnswer> = {};
  for (const [id, value] of Object.entries(values)) {
    answers[id] = {
      value,
      certainty: defaultCertainty,
      ...overrides[id],
    };
  }
  return { answers, model: "unit-test" };
}

function run(
  input: CaseInput,
  answers: ClassifierResult | null = classifier(),
  facts = computeFacts(input, TODAY),
  mode: "auto" | "llm-only" | "fast-only" = "auto",
  threshold = 0.8,
) {
  return evaluate(input, answers, facts, { threshold, mode });
}

function expectFast(
  input: CaseInput,
  overrides: Record<string, Partial<ClassifierAnswer>>,
  expected: { decision: Decision; citedSections: string[]; reasonCode: string },
  facts?: DateFacts,
) {
  const result = run(input, classifier(overrides), facts);
  expect(result.route).toBe("fast");
  expect(result.outcome).toMatchObject({
    decision: expected.decision,
    citedSections: expected.citedSections,
    reasonCodes: [expected.reasonCode],
    templateKey: expected.reasonCode,
  });
  return result;
}

function purchaseDateAtAge(ageDays: number): string {
  const date = new Date(`${TODAY}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ageDays);
  return date.toISOString().slice(0, 10);
}

describe("computeFacts — calendar dates and boundaries", () => {
  it("calculates age as calendar days and includes day 14 and day 30", () => {
    const onlineReturn = caseInput({
      caseType: "return",
      purchaseDate: purchaseDateAtAge(14),
    });
    expect(computeFacts(onlineReturn, TODAY)).toMatchObject({
      ageDays: 14,
      withdrawalOpen: true,
      voluntaryOpen: true,
    });

    const day15 = caseInput({
      caseType: "return",
      purchaseDate: purchaseDateAtAge(15),
    });
    expect(computeFacts(day15, TODAY)).toMatchObject({
      ageDays: 15,
      withdrawalOpen: false,
      voluntaryOpen: true,
    });

    expect(
      computeFacts(
        caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(30) }),
        TODAY,
      ),
    ).toMatchObject({ ageDays: 30, voluntaryOpen: true });
    expect(
      computeFacts(
        caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(31) }),
        TODAY,
      ),
    ).toMatchObject({ ageDays: 31, voluntaryOpen: false });
  });

  it("clamps leap-day liability anniversaries and treats the end date as open", () => {
    const leapPurchase = caseInput({ purchaseDate: "2024-02-29" });
    const atEnd = computeFacts(leapPurchase, "2026-02-28");
    expect(atEnd).toMatchObject({
      liabilityEnd: "2026-02-28",
      liabilityExpired: false,
    });
    expect(computeFacts(leapPurchase, "2026-03-01")).toMatchObject({
      liabilityEnd: "2026-02-28",
      liabilityExpired: true,
    });
  });

  it("marks the complaint liability boundary inclusive and expires it the next day", () => {
    const input = caseInput({ purchaseDate: "2024-01-31" });
    expect(computeFacts(input, "2026-01-31").liabilityExpired).toBe(false);
    expect(computeFacts(input, "2026-02-01").liabilityExpired).toBe(true);
  });

  it("flags only applicable open deadlines within three days", () => {
    const complaint = caseInput({ purchaseDate: "2024-02-03" });
    expect(computeFacts(complaint, "2026-01-31").nearDeadline).toBe("liability");

    const online14 = caseInput({
      caseType: "return",
      channel: "online",
      purchaseDate: purchaseDateAtAge(11),
    });
    expect(computeFacts(online14, TODAY).nearDeadline).toBe("withdrawal");

    const store30 = caseInput({
      caseType: "return",
      channel: "store",
      purchaseDate: purchaseDateAtAge(27),
    });
    expect(computeFacts(store30, TODAY).nearDeadline).toBe("voluntary");
  });
});

describe("complaint table — first matching row", () => {
  const rows = [
    {
      name: "C3 escalation precedes every other complaint rule",
      input: caseInput({ purchaseDate: "2023-01-01" }),
      answers: { escalation_signal: { value: true } },
      expected: { decision: "escalated", citedSections: ["§1 ust. 3", "§7"], reasonCode: "escalation_signal" },
    },
    {
      name: "C4 expired complaint precedes an unusable photo",
      input: caseInput({ purchaseDate: "2023-01-01" }),
      answers: { image_usable: { value: false } },
      expected: { decision: "rejected", citedSections: ["§2 ust. 1", "§2 ust. 4"], reasonCode: "liability_expired" },
    },
    {
      name: "C1 asks for a usable photo",
      input: caseInput(),
      answers: { image_usable: { value: false } },
      expected: { decision: "needs_info", citedSections: ["§6 ust. 1"], reasonCode: "photo_unusable" },
    },
    {
      name: "C2 detects not_electronics",
      input: caseInput(),
      answers: { device_category: { value: "not_electronics" } },
      expected: { decision: "needs_info", citedSections: ["§6 ust. 1"], reasonCode: "category_mismatch" },
    },
    {
      name: "C2 detects a classifier category that differs from the form category",
      input: caseInput(),
      answers: { device_category: { value: "smartphone" } },
      expected: { decision: "needs_info", citedSections: ["§6 ust. 1"], reasonCode: "category_mismatch" },
    },
    {
      name: "C3b routes a photo-description mismatch to LLM",
      input: caseInput(),
      answers: { description_matches_photo: { value: false } },
      expected: undefined,
    },
    {
      name: "C5 rejects user-caused damage",
      input: caseInput(),
      answers: { damage_cause: { value: "impact" } },
      expected: { decision: "rejected", citedSections: ["§4 ust. 1"], reasonCode: "user_caused_damage" },
    },
    {
      name: "C6 accepts a manufacturing defect",
      input: caseInput(),
      answers: { damage_cause: { value: "manufacturing_defect" } },
      expected: { decision: "accepted", citedSections: ["§2 ust. 1", "§3 ust. 1", "§5 ust. 1"], reasonCode: "defect_within_period" },
    },
    {
      name: "C7 accepts an invisible defect for service inspection",
      input: caseInput(),
      answers: {
        damage_cause: { value: "none_visible" },
        visible_damage: { value: false },
      },
      expected: { decision: "accepted", citedSections: ["§3 ust. 2", "§5 ust. 1"], reasonCode: "invisible_defect_inspection" },
    },
    {
      name: "C8 routes normal_wear to LLM",
      input: caseInput(),
      answers: { damage_cause: { value: "normal_wear" } },
      expected: undefined,
    },
  ] as const;

  for (const row of rows) {
    it(row.name, () => {
      const result = run(row.input, classifier(row.answers));
      if (row.expected) {
        expect(result.route).toBe("fast");
        expect(result.outcome).toMatchObject({
          decision: row.expected.decision,
          citedSections: row.expected.citedSections,
          reasonCodes: [row.expected.reasonCode],
          templateKey: row.expected.reasonCode,
        });
      } else {
        expect(result.route).toBe("llm");
        expect(result.gateFailedAt).toBeNull();
        expect(result.uncertainQuestions).toEqual([]);
      }
    });
  }

  it("C5 cites the exact policy subsection for each user-caused damage category", () => {
    for (const [cause, section] of [
      ["impact", "§4 ust. 1"],
      ["liquid", "§4 ust. 2"],
      ["heat", "§4 ust. 2"],
      ["tampering", "§4 ust. 3"],
    ] as const) {
      expect(run(caseInput(), classifier({ damage_cause: { value: cause } })).outcome?.citedSections).toEqual([section]);
    }
  });

  it("does not expire at liabilityEnd, but expires at liabilityEnd + 1 day", () => {
    const input = caseInput({ purchaseDate: "2024-01-31" });
    const stillOpen = computeFacts(input, "2026-01-31");
    expectFast(input, { damage_cause: { value: "manufacturing_defect" } }, {
      decision: "accepted",
      citedSections: ["§2 ust. 1", "§3 ust. 1", "§5 ust. 1"],
      reasonCode: "defect_within_period",
    }, stillOpen);
    const expired = computeFacts(input, "2026-02-01");
    expectFast(input, { damage_cause: { value: "manufacturing_defect" } }, {
      decision: "rejected",
      citedSections: ["§2 ust. 1", "§2 ust. 4"],
      reasonCode: "liability_expired",
    }, expired);
  });
});

describe("return table — first matching row", () => {
  const rows = [
    {
      name: "R3 escalates before date or photo rules",
      input: caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(45) }),
      answers: { escalation_signal: { value: true } },
      expected: { decision: "escalated", citedSections: ["§7"], reasonCode: "escalation_signal" },
    },
    {
      name: "R8 expires before considering a blurry photo or uncertain condition",
      input: caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(40) }),
      answers: { image_usable: { value: false }, condition: { value: 4, certainty: 0.4 } },
      expected: { decision: "rejected", citedSections: ["§2 ust. 1", "§3 ust. 1"], reasonCode: "return_window_expired" },
    },
    {
      name: "R1 requests a usable photo",
      input: caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(10) }),
      answers: { image_usable: { value: false } },
      expected: { decision: "needs_info", citedSections: ["§6 ust. 1"], reasonCode: "photo_unusable" },
    },
    {
      name: "R2 detects a return category mismatch",
      input: caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(10) }),
      answers: { device_category: { value: "smartphone" } },
      expected: { decision: "needs_info", citedSections: ["§6 ust. 1"], reasonCode: "category_mismatch" },
    },
    {
      name: "R3b checks a supplied description-photo mismatch",
      input: caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(10), description: "Zarysowana obudowa telefonu." }),
      answers: { description_matches_photo: { value: false } },
      expected: undefined,
    },
    {
      name: "R4 accepts online withdrawal through day 14 in condition 0 or 1",
      input: caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(14), channel: "online" }),
      answers: { condition: { value: 1 } },
      expected: { decision: "accepted", citedSections: ["§2 ust. 1"], reasonCode: "withdrawal_full" },
    },
    {
      name: "R5 accepts online withdrawal with diminished-value note",
      input: caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(14), channel: "online" }),
      answers: { condition: { value: 2 } },
      expected: { decision: "accepted", citedSections: ["§2 ust. 1", "§2 ust. 4"], reasonCode: "withdrawal_with_deduction" },
    },
    {
      name: "R5 condition 4 carries a complaint hint",
      input: caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(14), channel: "online" }),
      answers: { condition: { value: 4 } },
      expected: { decision: "accepted", citedSections: ["§2 ust. 1", "§2 ust. 4"], reasonCode: "withdrawal_with_deduction" },
    },
    {
      name: "R6 accepts a condition 0 or 1 voluntary return on day 30",
      input: caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(30), channel: "store" }),
      answers: { condition: { value: 1 } },
      expected: { decision: "accepted", citedSections: ["§3 ust. 1"], reasonCode: "voluntary_return" },
    },
    {
      name: "R7 rejects condition 2 or worse voluntary return and includes complaint hint for condition 4",
      input: caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(30), channel: "store" }),
      answers: { condition: { value: 4 } },
      expected: { decision: "rejected", citedSections: ["§3 ust. 1", "§3 ust. 2"], reasonCode: "used_item_voluntary" },
    },
  ] as const;

  for (const row of rows) {
    it(row.name, () => {
      const result = run(row.input, classifier(row.answers));
      if (row.expected) {
        expect(result.route).toBe("fast");
        expect(result.outcome).toMatchObject({
          decision: row.expected.decision,
          citedSections: row.expected.citedSections,
          reasonCodes: [row.expected.reasonCode],
          templateKey: row.expected.reasonCode,
        });
        if (
          "condition" in row.answers &&
          row.answers.condition.value === 4 &&
          row.expected.reasonCode !== "return_window_expired"
        ) {
          expect(result.outcome?.notes).toEqual({ complaintHint: true });
        }
      } else {
        expect(result.route).toBe("llm");
        expect(result.gateFailedAt).toBeNull();
      }
    });
  }

  it("uses R7 for an in-store day-10 item with condition 2", () => {
    const input = caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(10), channel: "store" });
    expectFast(input, { condition: { value: 2 } }, {
      decision: "rejected",
      citedSections: ["§3 ust. 1", "§3 ust. 2"],
      reasonCode: "used_item_voluntary",
    });
  });

  it("has day-14/day-15 and day-30/day-31 return boundaries", () => {
    const online14 = caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(14), channel: "online" });
    expect(run(online14, classifier({ condition: { value: 0 } })).outcome?.templateKey).toBe("withdrawal_full");
    const online15 = caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(15), channel: "online" });
    expect(run(online15, classifier({ condition: { value: 0 } })).outcome?.templateKey).toBe("voluntary_return");
    const day30 = caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(30), channel: "store" });
    expect(run(day30, classifier({ condition: { value: 0 } })).outcome?.templateKey).toBe("voluntary_return");
    const day31 = caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(31), channel: "store" });
    expect(run(day31, classifier({ condition: { value: 0 } })).outcome?.templateKey).toBe("return_window_expired");
  });
});

describe("row-level certainty gate and modes", () => {
  it("fires C1 with a confident image answer without gating on unrelated low-certainty damage_cause", () => {
    const result = run(caseInput(), classifier({
      image_usable: { value: false, certainty: 0.95 },
      damage_cause: { certainty: 0.4 },
    }));
    expect(result).toMatchObject({
      route: "fast",
      gateFailedAt: null,
      minGatingCertainty: 0.95,
      outcome: { decision: "needs_info", templateKey: "photo_unusable" },
    });
  });

  it("sends C5 certainty 0.7999 to LLM and records the failed row and uncertain question", () => {
    const result = run(caseInput(), classifier({ damage_cause: { value: "impact", certainty: 0.7999 } }));
    expect(result).toMatchObject({
      route: "llm",
      gateFailedAt: "C5",
      minGatingCertainty: 0.7999,
      uncertainQuestions: ["damage_cause"],
    });
  });

  it("accepts the inclusive 0.80 certainty boundary", () => {
    const result = run(caseInput(), classifier({ damage_cause: { value: "impact", certainty: 0.8 } }));
    expect(result).toMatchObject({
      route: "fast",
      gateFailedAt: null,
      outcome: { decision: "rejected", templateKey: "user_caused_damage" },
    });
  });

  it("honors a configured threshold", () => {
    const result = run(caseInput(), classifier({ damage_cause: { value: "impact", certainty: 0.75 } }), undefined, "auto", 0.7);
    expect(result.route).toBe("fast");
  });

  it("routes all always-LLM cases with a reason", () => {
    const cases = [
      [caseInput({ category: "other" }), classifier()],
      [caseInput(), classifier({ instruction_injection: { value: true, certainty: 0.5 } })],
      [caseInput({ caseType: "return", category: "audio" }), classifier()],
      [caseInput({ description: "Za krótko." }), classifier({ visible_damage: { value: false } })],
    ] as const;
    for (const [input, answers] of cases) {
      const result = run(input, answers);
      expect(result.route).toBe("llm");
      expect(result.reasons.length).toBeGreaterThan(0);
    }
    const classifierFailure = run(caseInput(), null);
    expect(classifierFailure).toMatchObject({ route: "llm", reasons: ["classifier_unavailable"] });
  });

  it("uses fixed fast-only templates for always-LLM cases, C3b and C8", () => {
    const always = run(caseInput({ category: "other" }), classifier(), undefined, "fast-only");
    expect(always).toMatchObject({ route: "fast", outcome: { decision: "escalated", templateKey: "no_rule_matched" } });

    const injection = run(caseInput(), classifier({ instruction_injection: { value: true, certainty: 0.5 } }), undefined, "fast-only");
    expect(injection).toMatchObject({ route: "fast", outcome: { decision: "escalated", templateKey: "no_rule_matched" } });

    const audioReturn = run(caseInput({ caseType: "return", category: "audio", purchaseDate: purchaseDateAtAge(5) }), classifier(), undefined, "fast-only");
    expect(audioReturn).toMatchObject({ route: "fast", outcome: { decision: "escalated", templateKey: "no_rule_matched" } });

    const shortInvisible = run(caseInput({ description: "Krótki opis." }), classifier({ visible_damage: { value: false } }), undefined, "fast-only");
    expect(shortInvisible).toMatchObject({ route: "fast", outcome: { decision: "escalated", templateKey: "no_rule_matched" } });

    const mismatch = run(caseInput(), classifier({ description_matches_photo: { value: false } }), undefined, "fast-only");
    expect(mismatch).toMatchObject({ route: "fast", outcome: { decision: "needs_info", templateKey: "description_photo_mismatch" } });

    const noMatch = run(caseInput(), classifier({ damage_cause: { value: "normal_wear" } }), undefined, "fast-only");
    expect(noMatch).toMatchObject({ route: "fast", outcome: { decision: "escalated", templateKey: "no_rule_matched" } });
  });

  it("throws RulesClassifierMissingError in fast-only mode when the classifier is missing", () => {
    expect(() => run(caseInput(), null, undefined, "fast-only")).toThrow(RulesClassifierMissingError);
  });

  it("always routes llm-only to LLM but returns the fast result as shadow outcome", () => {
    const result = run(caseInput({ caseType: "return", purchaseDate: purchaseDateAtAge(14) }), classifier({ condition: { value: 1 } }), undefined, "llm-only");
    expect(result.route).toBe("llm");
    expect(result.shadowOutcome).toMatchObject({ decision: "accepted", templateKey: "withdrawal_full" });
  });

  it("does not report an LLM-routed no-match as a shadow fast decision", () => {
    const result = run(caseInput(), classifier({ damage_cause: { value: "normal_wear" } }), undefined, "llm-only");
    expect(result).toMatchObject({ route: "llm", shadowOutcome: null });
  });
});

describe("checkLlmOutcome — hard constraints", () => {
  const outcome = (decision: Decision, citedSections: string[]) => ({ decision, citedSections });

  it("always allows escalation", () => {
    expect(checkLlmOutcome(caseInput({ purchaseDate: "2020-01-01" }), computeFacts(caseInput({ purchaseDate: "2020-01-01" }), TODAY), null, outcome("escalated", ["§7"]))).toEqual({ ok: true });
  });

  it("rejects or escalates an expired complaint, but does not reject an open one", () => {
    const input = caseInput({ purchaseDate: "2023-01-01" });
    const facts = computeFacts(input, TODAY);
    expect(checkLlmOutcome(input, facts, classifier(), outcome("accepted", ["§2 ust. 1"]))).toMatchObject({ ok: false });
    expect(checkLlmOutcome(input, facts, classifier(), outcome("rejected", ["§2 ust. 4"]))).toEqual({ ok: true });
  });

  it("rejects accepted impact damage when classifier certainty meets threshold", () => {
    const input = caseInput();
    const answers = classifier({ damage_cause: { value: "impact", certainty: 0.8 } });
    expect(checkLlmOutcome(input, computeFacts(input, TODAY), answers, outcome("accepted", ["§2 ust. 1"]))).toMatchObject({ ok: false });
    expect(checkLlmOutcome(input, computeFacts(input, TODAY), answers, outcome("accepted", ["§2 ust. 1"]), null, 0.8001)).toEqual({ ok: true });
  });

  it("uses image-analysis cause in preference to Jev and enforces every user-caused category", () => {
    const input = caseInput();
    for (const probableCause of ["impact", "liquid", "heat", "tampering"] as const) {
      expect(checkLlmOutcome(input, computeFacts(input, TODAY), classifier(), outcome("accepted", ["§2 ust. 1"]), {
        damage: { visible: true, type: "damage", location: "casing", extent: "major", probableCause },
      })).toMatchObject({ ok: false });
    }
    expect(checkLlmOutcome(input, computeFacts(input, TODAY), classifier({ damage_cause: { value: "impact" } }), outcome("accepted", ["§2 ust. 1"]), {
      damage: { visible: false, type: "none", location: "none", extent: "none", probableCause: "manufacturing_defect" },
    })).toEqual({ ok: true });
  });

  it("rejects online withdrawal beyond day 14 unless an enumerated statutory exclusion is cited", () => {
    const input = caseInput({ caseType: "return", channel: "online", purchaseDate: purchaseDateAtAge(14) });
    const facts = computeFacts(input, TODAY);
    expect(checkLlmOutcome(input, facts, classifier(), outcome("rejected", ["§2 ust. 1"]))).toMatchObject({ ok: false });
    expect(checkLlmOutcome(input, facts, classifier(), outcome("rejected", ["§4 ust. 2"]))).toEqual({ ok: true });
  });

  it("requires returns past day 30 to be rejected or escalated, for any channel", () => {
    const input = caseInput({ caseType: "return", channel: "store", purchaseDate: purchaseDateAtAge(31) });
    const facts = computeFacts(input, TODAY);
    expect(checkLlmOutcome(input, facts, classifier(), outcome("accepted", ["§3 ust. 1"]))).toMatchObject({ ok: false });
    expect(checkLlmOutcome(input, facts, classifier(), outcome("rejected", ["§3 ust. 1"]))).toEqual({ ok: true });
  });
});

describe("checkLlmOutcome — image usability and category match (T21.8, PRD AC-20)", () => {
  const outcome = (decision: Decision) => ({ decision, citedSections: ["§7"] });
  const analysis = (overrides: { usable?: boolean; matchesCategory?: boolean }) => ({
    usable: true,
    matchesCategory: true,
    damage: { visible: true, type: "crack", location: "screen", extent: "major" as const, probableCause: "manufacturing_defect" as const },
    ...overrides,
  });

  it.each([
    ["an unusable photo", { usable: false }],
    ["a photo that does not match the category", { matchesCategory: false }],
  ])("allows only needs_info or escalated for %s on an open case", (_name, overrides) => {
    const input = caseInput();
    const facts = computeFacts(input, TODAY);
    for (const decision of ["accepted", "rejected"] as const) {
      expect(checkLlmOutcome(input, facts, classifier(), outcome(decision), analysis(overrides))).toMatchObject({
        ok: false,
        violations: [expect.stringContaining("needs_info")],
      });
    }
    expect(checkLlmOutcome(input, facts, classifier(), outcome("needs_info"), analysis(overrides))).toEqual({ ok: true });
    expect(checkLlmOutcome(input, facts, classifier(), outcome("escalated"), analysis(overrides))).toEqual({ ok: true });
  });

  it("applies the same rule to an open return", () => {
    const input = caseInput({ caseType: "return", channel: "store", purchaseDate: purchaseDateAtAge(5) });
    const facts = computeFacts(input, TODAY);
    expect(checkLlmOutcome(input, facts, classifier(), outcome("accepted"), analysis({ usable: false }))).toMatchObject({ ok: false });
    expect(checkLlmOutcome(input, facts, classifier(), outcome("needs_info"), analysis({ usable: false }))).toEqual({ ok: true });
  });

  it("does not require needs_info when the case is expired (rejected stays valid) or the photo is fine", () => {
    const expired = caseInput({ purchaseDate: "2023-01-01" });
    expect(checkLlmOutcome(expired, computeFacts(expired, TODAY), classifier(), outcome("rejected"), analysis({ usable: false }))).toEqual({ ok: true });
    const lateReturn = caseInput({ caseType: "return", channel: "store", purchaseDate: purchaseDateAtAge(31) });
    expect(checkLlmOutcome(lateReturn, computeFacts(lateReturn, TODAY), classifier(), outcome("rejected"), analysis({ matchesCategory: false }))).toEqual({ ok: true });
    const open = caseInput();
    expect(checkLlmOutcome(open, computeFacts(open, TODAY), classifier(), outcome("rejected"), analysis({}))).toEqual({ ok: true });
  });
});

describe("policy deadlines (TAC-001-05)", () => {
  it("keeps the deadline constants aligned with the policy documents", () => {
    const complaintPolicy = readFileSync(resolve(process.cwd(), "../docs/policies/complaint-policy.md"), "utf8");
    const returnPolicy = readFileSync(resolve(process.cwd(), "../docs/policies/return-policy.md"), "utf8");
    expect(LIABILITY_MONTHS).toBe(24);
    expect(WITHDRAWAL_DAYS).toBe(14);
    expect(VOLUNTARY_DAYS).toBe(30);
    expect(complaintPolicy).toMatch(/24 miesięcy/);
    expect(returnPolicy).toMatch(/14 dni/);
    expect(returnPolicy).toMatch(/30 dni/);
  });
});
