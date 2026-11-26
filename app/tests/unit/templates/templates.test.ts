import { describe, expect, it } from "vitest";
import type { CaseInput, DateFacts } from "@/lib/domain";
import { DECISION_LABELS } from "@/lib/domain";
import type { ClassifierResult, RuleOutcome } from "@/server/rules";
import { computeFacts } from "@/server/rules";
import { finalizeFirstMessage, renderFirstMessage, validateFirstMessage } from "@/server/templates";

const CASE_ID = "HSD-20261126-AB12";
const TODAY = "2026-11-26";
const HEADINGS = [
  "## Dzień dobry",
  "## Podsumowanie zgłoszenia",
  "## Wstępna ocena",
  "## Uzasadnienie",
  "## Co widzimy na zdjęciu",
  "## Kolejne kroki",
];

function caseInput(overrides: Partial<CaseInput> = {}): CaseInput {
  return {
    caseType: "complaint",
    category: "laptop",
    model: "ThinkPad T14",
    purchaseDate: "2026-01-01",
    channel: "online",
    description: "Urządzenie przestało prawidłowo działać.",
    ...overrides,
  };
}

function classifier(overrides: Record<string, boolean | number | string> = {}): ClassifierResult {
  return {
    model: "synthetic",
    answers: {
      image_usable: { value: true, certainty: 0.95 },
      device_category: { value: "laptop", certainty: 0.95 },
      visible_damage: { value: false, certainty: 0.95 },
      damage_cause: { value: "none_visible", certainty: 0.95 },
      condition: { value: 1, certainty: 0.95 },
      packaging_visible: { value: true, certainty: 0.95 },
      escalation_signal: { value: false, certainty: 0.95 },
      description_matches_photo: { value: true, certainty: 0.95 },
      ...Object.fromEntries(Object.entries(overrides).map(([key, value]) => [key, { value, certainty: 0.95 }])),
    },
  };
}

type TemplateCase = {
  name: string;
  input: CaseInput;
  outcome: RuleOutcome;
  answers?: ClassifierResult;
};

const complaint = (overrides: Partial<CaseInput> = {}) => caseInput(overrides);
const returnCase = (overrides: Partial<CaseInput> = {}) => caseInput({ caseType: "return", ...overrides });

const templateCases: TemplateCase[] = [
  {
    name: "complaint escalation",
    input: complaint(),
    outcome: { decision: "escalated", citedSections: ["§1 ust. 3", "§7"], reasonCodes: ["escalation_signal"], templateKey: "escalation_signal" },
  },
  {
    name: "expired complaint liability",
    input: complaint({ purchaseDate: "2023-01-01" }),
    outcome: { decision: "rejected", citedSections: ["§2 ust. 1", "§2 ust. 4"], reasonCodes: ["liability_expired"], templateKey: "liability_expired" },
  },
  {
    name: "complaint unusable photo",
    input: complaint(),
    outcome: { decision: "needs_info", citedSections: ["§6 ust. 1"], reasonCodes: ["photo_unusable"], templateKey: "photo_unusable" },
    answers: classifier({ image_usable: false }),
  },
  {
    name: "complaint category mismatch",
    input: complaint(),
    outcome: { decision: "needs_info", citedSections: ["§6 ust. 1"], reasonCodes: ["category_mismatch"], templateKey: "category_mismatch" },
    answers: classifier({ device_category: "smartphone" }),
  },
  {
    name: "complaint description and photo mismatch",
    input: complaint(),
    outcome: { decision: "needs_info", citedSections: ["§6 ust. 1"], reasonCodes: ["description_photo_mismatch"], templateKey: "description_photo_mismatch" },
  },
  {
    name: "user-caused damage",
    input: complaint(),
    outcome: { decision: "rejected", citedSections: ["§4 ust. 1"], reasonCodes: ["user_caused_damage"], templateKey: "user_caused_damage" },
    answers: classifier({ visible_damage: true, damage_cause: "impact" }),
  },
  {
    name: "manufacturing defect within period",
    input: complaint(),
    outcome: { decision: "accepted", citedSections: ["§2 ust. 1", "§3 ust. 1", "§5 ust. 1"], reasonCodes: ["defect_within_period"], templateKey: "defect_within_period" },
    answers: classifier({ visible_damage: true, damage_cause: "manufacturing_defect" }),
  },
  {
    name: "invisible defect for service inspection",
    input: complaint(),
    outcome: { decision: "accepted", citedSections: ["§3 ust. 2", "§5 ust. 1"], reasonCodes: ["invisible_defect_inspection"], templateKey: "invisible_defect_inspection" },
  },
  {
    name: "complaint no rule matched",
    input: complaint(),
    outcome: { decision: "escalated", citedSections: ["§7"], reasonCodes: ["no_rule_matched"], templateKey: "no_rule_matched" },
  },
  {
    name: "inconsistent LLM result",
    input: complaint(),
    outcome: { decision: "escalated", citedSections: ["§7"], reasonCodes: ["llm_inconsistent"], templateKey: "llm_inconsistent" },
  },
  {
    name: "return escalation",
    input: returnCase(),
    outcome: { decision: "escalated", citedSections: ["§7"], reasonCodes: ["escalation_signal"], templateKey: "escalation_signal" },
  },
  {
    name: "expired return window",
    input: returnCase({ purchaseDate: "2026-10-01" }),
    outcome: { decision: "rejected", citedSections: ["§2 ust. 1", "§3 ust. 1"], reasonCodes: ["return_window_expired"], templateKey: "return_window_expired" },
  },
  {
    name: "return unusable photo",
    input: returnCase(),
    outcome: { decision: "needs_info", citedSections: ["§6 ust. 1"], reasonCodes: ["photo_unusable"], templateKey: "photo_unusable" },
    answers: classifier({ image_usable: false }),
  },
  {
    name: "return category mismatch",
    input: returnCase(),
    outcome: { decision: "needs_info", citedSections: ["§6 ust. 1"], reasonCodes: ["category_mismatch"], templateKey: "category_mismatch" },
    answers: classifier({ device_category: "smartphone" }),
  },
  {
    name: "return description and photo mismatch",
    input: returnCase(),
    outcome: { decision: "needs_info", citedSections: ["§6 ust. 1"], reasonCodes: ["description_photo_mismatch"], templateKey: "description_photo_mismatch" },
  },
  {
    name: "full online withdrawal",
    input: returnCase({ purchaseDate: "2026-11-20" }),
    outcome: { decision: "accepted", citedSections: ["§2 ust. 1"], reasonCodes: ["withdrawal_full"], templateKey: "withdrawal_full" },
  },
  {
    name: "online withdrawal with diminished value",
    input: returnCase({ purchaseDate: "2026-11-20" }),
    outcome: { decision: "accepted", citedSections: ["§2 ust. 1", "§2 ust. 4"], reasonCodes: ["withdrawal_with_deduction"], templateKey: "withdrawal_with_deduction" },
    answers: classifier({ condition: 4 }),
  },
  {
    name: "voluntary return in good condition",
    input: returnCase({ purchaseDate: "2026-11-01", channel: "store" }),
    outcome: { decision: "accepted", citedSections: ["§3 ust. 1"], reasonCodes: ["voluntary_return"], templateKey: "voluntary_return" },
  },
  {
    name: "used item outside statutory withdrawal",
    input: returnCase({ purchaseDate: "2026-11-01", channel: "store" }),
    outcome: { decision: "rejected", citedSections: ["§3 ust. 1", "§3 ust. 2"], reasonCodes: ["used_item_voluntary"], templateKey: "used_item_voluntary" },
    answers: classifier({ condition: 4 }),
  },
];

function render(template: TemplateCase, facts?: DateFacts): string {
  const { input, outcome } = template;
  return renderFirstMessage(input, outcome, template.answers ?? classifier(), CASE_ID, facts ?? computeFacts(input, TODAY));
}

describe("renderFirstMessage", () => {
  for (const template of templateCases) {
    it(`renders all required sections and citations for ${template.name}`, () => {
      const markdown = render(template);
      const headingPositions = HEADINGS.map((heading) => markdown.indexOf(heading));
      expect(headingPositions.every((position) => position >= 0)).toBe(true);
      expect(headingPositions).toEqual([...headingPositions].sort((a, b) => a - b));
      expect(markdown).toContain(CASE_ID);
      expect(markdown).toContain(DECISION_LABELS[template.outcome.decision]);
      for (const section of template.outcome.citedSections) expect(markdown).toContain(section);
      expect(markdown).not.toMatch(/\bPan\b|\bPani\b/);
      expect(markdown).not.toMatch(/\p{Extended_Pictographic}/u);
    });
  }

  it("formats the summary date and includes the category, model and channel labels", () => {
    const markdown = render(templateCases[0]!);
    expect(markdown).toContain("01.01.2026");
    expect(markdown).toContain("Laptop");
    expect(markdown).toContain("ThinkPad T14");
    expect(markdown).toContain("Sklep internetowy");
    expect(markdown).toContain("Reklamacja");
  });

  it("adds the purchase-date-as-delivery-date note when a deadline is near", () => {
    const template = templateCases.find(({ name }) => name === "full online withdrawal")!;
    const facts = { ...computeFacts(template.input, TODAY), nearDeadline: "withdrawal" } as DateFacts;
    expect(render(template, facts)).toContain("datę zakupu traktujemy jako datę wydania/otrzymania towaru");
  });

  it.each(["withdrawal_with_deduction", "used_item_voluntary"])(
    "suggests a complaint for damaged condition 4 on %s",
    (reasonCode) => {
      const template = templateCases.find(({ outcome }) => outcome.templateKey === reasonCode)!;
      expect(render(template)).toMatch(/reklamac/);
    },
  );

  it("describes classifier findings in plain Polish", () => {
    const markdown = render(templateCases.find(({ name }) => name === "user-caused damage")!);
    expect(markdown).toContain("Na zdjęciu widać laptop");
    expect(markdown).toMatch(/uszkodzen|widoczn/);
  });

  it("explains the return refund timeline and possible diminished-value deduction", () => {
    const fullReturn = render(templateCases.find(({ outcome }) => outcome.templateKey === "withdrawal_full")!);
    expect(fullReturn).toContain("w ciągu 14 dni od otrzymania oświadczenia");
    expect(fullReturn).toContain("koszt odesłania");

    const returnWithDeduction = render(templateCases.find(({ outcome }) => outcome.templateKey === "withdrawal_with_deduction")!);
    expect(returnWithDeduction).toContain("Kwota zwrotu może zostać pomniejszona");
    expect(returnWithDeduction).toContain("w ciągu 14 dni od otrzymania oświadczenia");
  });
});

describe("finalizeFirstMessage", () => {
  it("removes disclaimer variants and appends exactly one canonical disclaimer at the end", () => {
    const input = [
      "## Dzień dobry\nTreść wiadomości.",
      "To jest wstępna ocena przygotowana automatycznie i wymaga potwierdzenia.",
      "Dodatkowy akapit.",
      "Wstępna ocena przygotowana automatycznie — ostateczna decyzja później.",
    ].join("\n\n");
    const result = finalizeFirstMessage(input);
    const canonical = "To jest wstępna ocena przygotowana automatycznie. Ostateczną decyzję potwierdzi nasz zespół serwisowy w ciągu 14 dni od otrzymania zgłoszenia.";
    expect(result.split(canonical)).toHaveLength(2);
    expect(result.trimEnd().endsWith(canonical)).toBe(true);
    expect(result).not.toContain("Dodatkowy akapit.\n\nWstępna ocena");
    expect(result).toContain("Dodatkowy akapit.");
  });
});

describe("validateFirstMessage", () => {
  it("accepts an ordered six-section message with valid cited policy sections", () => {
    const markdown = `${HEADINGS.join("\nTreść sekcji.\n\n")}\n§2 ust. 1, §7`;
    expect(validateFirstMessage(markdown, ["§2 ust. 1", "§7"])).toEqual({ ok: true });
  });

  it("reports a missing heading and malformed or absent citations", () => {
    const markdown = HEADINGS.filter((heading) => heading !== "## Uzasadnienie").join("\n") + "\n§2 ust 1";
    const result = validateFirstMessage(markdown, ["§2 ust 1"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems.join(" ")).toMatch(/Uzasadnienie/);
      expect(result.problems.join(" ")).toMatch(/§2 ust 1/);
    }
  });
});

describe("validateFirstMessage section ranges", () => {
  const body = (text: string) => `${HEADINGS.join("\nTreść sekcji.\n\n")}\n${text}`;

  it("accepts a cited section covered by an en dash range in the text", () => {
    expect(validateFirstMessage(body("Zob. §3 ust. 1–2)."), ["§3 ust. 1", "§3 ust. 2"])).toEqual({ ok: true });
  });

  it("accepts a cited section covered by a hyphen range in the text", () => {
    expect(validateFirstMessage(body("Zob. §6 ust. 2-3."), ["§6 ust. 3"])).toEqual({ ok: true });
  });

  it("accepts a cited section listed by comma in the text", () => {
    expect(validateFirstMessage(body("Zob. §2 ust. 4, 6."), ["§2 ust. 6"])).toEqual({ ok: true });
    expect(validateFirstMessage(body("Zob. §2 ust. 4, §2 ust. 6."), ["§2 ust. 6"])).toEqual({ ok: true });
  });

  it("rejects a cited section outside the range written in the text", () => {
    const result = validateFirstMessage(body("Zob. §3 ust. 1–2."), ["§3 ust. 3"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.join(" ")).toMatch(/§3 ust. 3/);
  });

  it("does not let a range for another section cover the cited section", () => {
    const result = validateFirstMessage(body("Zob. §2 ust. 1–3."), ["§3 ust. 2"]);
    expect(result.ok).toBe(false);
  });

  it("still rejects a cited section that appears nowhere in the text", () => {
    const result = validateFirstMessage(body("Zob. §1 ust. 2."), ["§3 ust. 1"]);
    expect(result.ok).toBe(false);
  });
});
