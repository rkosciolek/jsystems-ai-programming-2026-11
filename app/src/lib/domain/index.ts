import type { UIMessage } from "ai";
import { z } from "zod";
import { pl } from "../i18n/pl";

export const CASE_TYPES = ["complaint", "return"] as const;
export const CHANNELS = ["online", "store"] as const;
export const DECISIONS = ["accepted", "rejected", "needs_info", "escalated"] as const;
export const DAMAGE_CAUSES = [
  "none_visible",
  "manufacturing_defect",
  "normal_wear",
  "impact",
  "liquid",
  "heat",
  "tampering",
] as const;

export type CaseType = (typeof CASE_TYPES)[number];
export type Channel = (typeof CHANNELS)[number];
export type Decision = (typeof DECISIONS)[number];

export const CATEGORIES = [
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
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export const DECISION_LABELS: Record<Decision, string> = pl.decisions;

export const CITED_SECTION_REGEX = /^§\d+( ust\. \d+)?$/;
export const CASE_ID_REGEX = /^HSD-\d{8}-[A-Z0-9]{4}$/;

export function todayInWarsaw(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const isoDate = z.string().refine(isRealIsoDate, { message: pl.errors.purchaseDateInvalid });

/** Earliest accepted purchase date (Q4.3); anything older is a typo such as year 0326. */
export const MIN_PURCHASE_DATE = "2000-01-01";

function dateNotAfter(today: string) {
  return isoDate
    .refine((value) => value <= today || !isRealIsoDate(value), {
      message: pl.errors.purchaseDateFuture,
    })
    .refine((value) => value >= MIN_PURCHASE_DATE || !isRealIsoDate(value), {
      message: pl.errors.purchaseDateInvalid,
    });
}

export function makeCaseInputSchema(today: string) {
  return z
    .object({
      caseType: z.enum(CASE_TYPES, { error: pl.errors.caseTypeRequired }),
      category: z.enum(CATEGORY_IDS, { error: pl.errors.categoryRequired }),
      model: z.string().trim().min(2, pl.errors.model).max(100, pl.errors.model),
      purchaseDate: dateNotAfter(today),
      channel: z.enum(CHANNELS, { error: pl.errors.channelRequired }),
      description: z.string().trim(),
    })
    .superRefine((value, ctx) => {
      const length = value.description.length;
      if (length > 2000) {
        ctx.addIssue({
          code: "custom",
          path: ["description"],
          message: value.caseType === "complaint" ? pl.errors.description : pl.errors.descriptionTooLong,
        });
      } else if (value.caseType === "complaint" && length < 20) {
        ctx.addIssue({ code: "custom", path: ["description"], message: pl.errors.description });
      }
    });
}

export type CaseInput = z.infer<ReturnType<typeof makeCaseInputSchema>>;

export const DateFactsSchema = z.object({
  ageDays: z.number(),
  liabilityEnd: isoDate,
  liabilityExpired: z.boolean(),
  withdrawalOpen: z.boolean(),
  voluntaryOpen: z.boolean(),
  nearDeadline: z.enum(["liability", "withdrawal", "voluntary"]).nullable(),
});
export type DateFacts = z.infer<typeof DateFactsSchema>;

export const ImageAnalysisSchema = z.object({
  usable: z.boolean(),
  usabilityProblem: z.enum(["blurry", "dark", "not_electronics", "wrong_device", "damage_not_visible", "none"]),
  matchesCategory: z.boolean(),
  matchesModel: z.enum(["yes", "no", "unknown"]),
  conditionSummaryPl: z.string().max(600),
  damage: z
    .object({
      visible: z.boolean(),
      type: z.string(),
      location: z.string(),
      extent: z.enum(["none", "minor", "major"]),
      probableCause: z.enum(DAMAGE_CAUSES),
    })
    .optional(),
  signsOfUse: z.array(z.string()).optional(),
  resaleSuitability: z.enum(["as_new", "only_as_used", "no"]).optional(),
  packagingVisible: z.boolean().optional(),
  confidence: z.enum(["high", "medium", "low"]),
  notDeterminableFromPhoto: z.array(z.string()),
});
export type ImageAnalysis = z.infer<typeof ImageAnalysisSchema>;

export const DecisionOutcomeSchema = z.object({
  decision: z.enum(DECISIONS),
  citedSections: z.array(z.string().regex(CITED_SECTION_REGEX)).min(1),
  reasonCodes: z.array(z.string()),
  path: z.enum(["fast", "llm"]),
  messageMarkdown: z.string(),
});
export type DecisionOutcome = z.infer<typeof DecisionOutcomeSchema>;

const reviseBase = {
  newDecision: z.enum(DECISIONS),
  reason: z.string().max(300),
};

export const ReviseDecisionInputSchema = z.object({
  ...reviseBase,
  corrections: z.object({ purchaseDate: isoDate.optional(), channel: z.enum(CHANNELS).optional() }).optional(),
});

export function makeReviseDecisionInputSchema(today: string) {
  return z.object({
    ...reviseBase,
    corrections: z
      .object({ purchaseDate: dateNotAfter(today).optional(), channel: z.enum(CHANNELS).optional() })
      .optional(),
  });
}
export type ReviseDecisionInput = z.infer<typeof ReviseDecisionInputSchema>;

export const CaseSummarySchema = z.object({
  caseType: z.enum(CASE_TYPES),
  category: z.enum(CATEGORY_IDS),
  model: z.string(),
  purchaseDate: z.string(),
  channel: z.enum(CHANNELS),
});
export type CaseSummary = z.infer<typeof CaseSummarySchema>;

export const CaseEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("progress"), step: z.enum(["upload", "analysis", "decision"]) }),
  z.object({
    type: z.literal("result"),
    caseId: z.string(),
    decision: z.enum(DECISIONS),
    firstMessage: z.object({
      id: z.string(),
      role: z.literal("assistant"),
      parts: z.array(z.object({ type: z.literal("text"), text: z.string() })),
      metadata: z.object({ decision: z.enum(DECISIONS) }),
    }),
    caseSummary: CaseSummarySchema,
  }),
  z.object({ type: z.literal("error"), code: z.enum(["timeout", "upstream", "internal"]) }),
]);
export type CaseEvent = z.infer<typeof CaseEventSchema>;

export const DecisionDataSchema = z.object({
  decision: z.enum(DECISIONS),
  previous: z.enum(DECISIONS).optional(),
  reason: z.string().optional(),
  corrections: z.object({ purchaseDate: z.string().optional(), channel: z.enum(CHANNELS).optional() }).optional(),
});
export type DecisionData = z.infer<typeof DecisionDataSchema>;

export type CaseUIMessage = UIMessage<{ decision?: Decision; revised?: boolean }, { decision: DecisionData }>;

const MODE = z.enum(["auto", "llm-only", "fast-only"]);

export const DecisionLogEntrySchema = z.object({
  ts: z.string(),
  event: z.enum([
    "case_decided",
    "case_failed",
    "case_aborted",
    "decision_revised",
    "revision_rejected",
    "revision_order_violation",
    "llm_inconsistent",
    "chat_failed",
  ]),
  caseId: z.string().optional(),
  mode: MODE,
  caseType: z.enum(CASE_TYPES).optional(),
  category: z.enum(CATEGORY_IDS).optional(),
  channel: z.enum(CHANNELS).optional(),
  facts: DateFactsSchema.optional(),
  path: z.enum(["fast", "llm"]).optional(),
  reasons: z.array(z.string()).optional(),
  gateFailedAt: z.string().nullable().optional(),
  uncertainQuestions: z.array(z.string()).optional(),
  minGatingCertainty: z.number().nullable().optional(),
  classifierAnswers: z
    .record(
      z.string(),
      z.object({
        value: z.union([z.string(), z.number(), z.boolean()]),
        certainty: z.number(),
        confidence: z.number().optional(),
      }),
    )
    .nullable()
    .optional(),
  classifierError: z.enum(["upstream", "invalid_response"]).nullable().optional(),
  shadowFastPathDecision: z.enum(DECISIONS).nullable().optional(),
  decision: z.enum(DECISIONS).optional(),
  citedSections: z.array(z.string()).optional(),
  reasonCodes: z.array(z.string()).optional(),
  previousDecision: z.enum(DECISIONS).optional(),
  corrections: z.object({ purchaseDate: z.string().optional(), channel: z.enum(CHANNELS).optional() }).optional(),
  models: z.object({
    classifier: z.string().nullable(),
    vision: z.string().nullable(),
    decision: z.string().nullable(),
    chat: z.string().nullable(),
  }),
  failureCode: z.enum(["timeout", "upstream", "internal"]).optional(),
  step: z.enum(["upload", "analysis", "decision", "chat"]).optional(),
  latencyMs: z.object({
    total: z.number(),
    image: z.number().optional(),
    classifier: z.number().optional(),
    vision: z.number().optional(),
    decision: z.number().optional(),
    chat: z.number().optional(),
  }),
  costUsd: z
    .object({
      classifier: z.number().optional(),
      vision: z.number().optional(),
      decision: z.number().optional(),
      chat: z.number().optional(),
    })
    .optional(),
});
export type DecisionLogEntry = z.infer<typeof DecisionLogEntrySchema>;

export const LOG_FIELDS: readonly string[] = Object.keys(DecisionLogEntrySchema.shape);
