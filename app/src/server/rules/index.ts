import 'server-only';

import type { CaseInput, DateFacts, Decision, ImageAnalysis } from '@/lib/domain';

export type ClassifierAnswer = {
  value: boolean | string | number;
  certainty: number;
  raw?: unknown;
};

export type ClassifierResult = {
  answers: Record<string, ClassifierAnswer>;
  model: string;
  costUsd?: number;
  latencyMs?: number;
};

export const LIABILITY_MONTHS = 24; // Complaint policy §2 ust. 1: 24 months.
export const WITHDRAWAL_DAYS = 14; // Return policy §2 ust. 1: 14 days.
export const VOLUNTARY_DAYS = 30; // Return policy §3 ust. 1: 30 days.

type RuleMode = 'auto' | 'llm-only' | 'fast-only';

export type RuleOutcome = {
  decision: Decision;
  citedSections: string[];
  reasonCodes: string[];
  templateKey: string;
  notes?: { complaintHint?: boolean };
};

export type EvaluateResult = {
  route: 'fast' | 'llm';
  outcome?: RuleOutcome;
  shadowOutcome?: RuleOutcome | null;
  reasons: string[];
  minGatingCertainty: number | null;
  gateFailedAt: string | null;
  uncertainQuestions: string[];
};

export class RulesClassifierMissingError extends Error {
  constructor() {
    super('Classifier result is required in fast-only mode');
    this.name = 'RulesClassifierMissingError';
  }
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addCalendarMonthsClamped(value: string, months: number): string {
  const source = parseIsoDate(value);
  const targetMonth = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  targetMonth.setUTCDate(Math.min(source.getUTCDate(), lastDay));
  return formatIsoDate(targetMonth);
}

function calendarDaysBetween(start: string, end: string): number {
  return Math.round((parseIsoDate(end).getTime() - parseIsoDate(start).getTime()) / 86_400_000);
}

export function computeFacts(input: CaseInput, today: string): DateFacts {
  const ageDays = calendarDaysBetween(input.purchaseDate, today);
  const liabilityEnd = addCalendarMonthsClamped(input.purchaseDate, LIABILITY_MONTHS);
  const liabilityExpired = today > liabilityEnd;
  const withdrawalOpen = ageDays <= WITHDRAWAL_DAYS;
  const voluntaryOpen = ageDays <= VOLUNTARY_DAYS;
  let nearDeadline: DateFacts['nearDeadline'] = null;

  if (input.caseType === 'complaint') {
    const daysToLiabilityEnd = calendarDaysBetween(today, liabilityEnd);
    if (!liabilityExpired && daysToLiabilityEnd >= 0 && daysToLiabilityEnd <= 3) {
      nearDeadline = 'liability';
    }
  } else {
    if (input.channel === 'online' && withdrawalOpen) {
      const daysToWithdrawalEnd = WITHDRAWAL_DAYS - ageDays;
      if (daysToWithdrawalEnd >= 0 && daysToWithdrawalEnd <= 3) {
        nearDeadline = 'withdrawal';
      }
    }
    if (nearDeadline === null && voluntaryOpen) {
      const daysToVoluntaryEnd = VOLUNTARY_DAYS - ageDays;
      if (daysToVoluntaryEnd >= 0 && daysToVoluntaryEnd <= 3) {
        nearDeadline = 'voluntary';
      }
    }
  }

  return { ageDays, liabilityEnd, liabilityExpired, withdrawalOpen, voluntaryOpen, nearDeadline };
}

type EvaluationState = {
  outcome: RuleOutcome | null;
  rowId: string | null;
  gateFailedAt: string | null;
  minGatingCertainty: number | null;
  uncertainQuestions: string[];
};

function answerValue(classifier: ClassifierResult, question: string): boolean | string | number | undefined {
  return classifier.answers[question]?.value;
}

function makeOutcome(
  decision: Decision,
  citedSections: string[],
  reasonCode: string,
  notes?: RuleOutcome['notes'],
): RuleOutcome {
  return {
    decision,
    citedSections,
    reasonCodes: [reasonCode],
    templateKey: reasonCode,
    ...(notes ? { notes } : {}),
  };
}

function evaluateRows(
  input: CaseInput,
  classifier: ClassifierResult,
  facts: DateFacts,
  threshold: number,
  ignoreCertainty: boolean,
): EvaluationState {
  let minGatingCertainty: number | null = null;
  const complaint = input.caseType === 'complaint';
  const rows = complaint
    ? [
        {
          id: 'C3',
          required: ['escalation_signal'],
          match: () => answerValue(classifier, 'escalation_signal') === true,
          outcome: () => makeOutcome('escalated', ['§1 ust. 3', '§7'], 'escalation_signal'),
        },
        {
          id: 'C4',
          required: [],
          match: () => facts.liabilityExpired,
          outcome: () => makeOutcome('rejected', ['§2 ust. 1', '§2 ust. 4'], 'liability_expired'),
        },
        {
          id: 'C1',
          required: ['image_usable'],
          match: () => answerValue(classifier, 'image_usable') === false,
          outcome: () => makeOutcome('needs_info', ['§6 ust. 1'], 'photo_unusable'),
        },
        {
          id: 'C2',
          required: ['device_category'],
          match: () => {
            const category = answerValue(classifier, 'device_category');
            return category === 'not_electronics' || category !== input.category;
          },
          outcome: () => makeOutcome('needs_info', ['§6 ust. 1'], 'category_mismatch'),
        },
        {
          id: 'C3b',
          required: ['description_matches_photo'],
          match: () => answerValue(classifier, 'description_matches_photo') === false,
          outcome: () => makeOutcome('needs_info', ['§6 ust. 1'], 'description_photo_mismatch'),
          llmOnly: true,
        },
        {
          id: 'C5',
          required: ['damage_cause'],
          match: () => ['impact', 'liquid', 'heat', 'tampering'].includes(String(answerValue(classifier, 'damage_cause'))),
          outcome: () => {
            const cause = answerValue(classifier, 'damage_cause');
            const citation = cause === 'impact' ? '§4 ust. 1' : cause === 'tampering' ? '§4 ust. 3' : '§4 ust. 2';
            return makeOutcome('rejected', [citation], 'user_caused_damage');
          },
        },
        {
          id: 'C6',
          required: ['damage_cause'],
          match: () => answerValue(classifier, 'damage_cause') === 'manufacturing_defect',
          outcome: () => makeOutcome('accepted', ['§2 ust. 1', '§3 ust. 1', '§5 ust. 1'], 'defect_within_period'),
        },
        {
          id: 'C7',
          required: ['damage_cause', 'visible_damage'],
          match: () => answerValue(classifier, 'damage_cause') === 'none_visible' && answerValue(classifier, 'visible_damage') === false,
          outcome: () => makeOutcome('accepted', ['§3 ust. 2', '§5 ust. 1'], 'invisible_defect_inspection'),
        },
        {
          id: 'C8',
          required: [],
          match: () => true,
          outcome: () => makeOutcome('escalated', ['§7'], 'no_rule_matched'),
          llmOnly: true,
        },
      ]
    : [
        {
          id: 'R3',
          required: ['escalation_signal'],
          match: () => answerValue(classifier, 'escalation_signal') === true,
          outcome: () => makeOutcome('escalated', ['§7'], 'escalation_signal'),
        },
        {
          id: 'R8',
          required: [],
          match: () => !facts.voluntaryOpen,
          outcome: () => makeOutcome('rejected', ['§2 ust. 1', '§3 ust. 1'], 'return_window_expired'),
        },
        {
          id: 'R1',
          required: ['image_usable'],
          match: () => answerValue(classifier, 'image_usable') === false,
          outcome: () => makeOutcome('needs_info', ['§6 ust. 1'], 'photo_unusable'),
        },
        {
          id: 'R2',
          required: ['device_category'],
          match: () => {
            const category = answerValue(classifier, 'device_category');
            return category === 'not_electronics' || category !== input.category;
          },
          outcome: () => makeOutcome('needs_info', ['§6 ust. 1'], 'category_mismatch'),
        },
        {
          id: 'R3b',
          required: input.description.length > 0 ? ['description_matches_photo'] : [],
          match: () => input.description.length > 0 && answerValue(classifier, 'description_matches_photo') === false,
          outcome: () => makeOutcome('needs_info', ['§6 ust. 1'], 'description_photo_mismatch'),
          llmOnly: true,
        },
        {
          id: 'R4',
          required: ['condition'],
          match: () => input.channel === 'online' && facts.withdrawalOpen && Number(answerValue(classifier, 'condition')) <= 1,
          outcome: () => makeOutcome('accepted', ['§2 ust. 1'], 'withdrawal_full'),
        },
        {
          id: 'R5',
          required: ['condition'],
          match: () => input.channel === 'online' && facts.withdrawalOpen && Number(answerValue(classifier, 'condition')) >= 2,
          outcome: () => makeOutcome(
            'accepted',
            ['§2 ust. 1', '§2 ust. 4'],
            'withdrawal_with_deduction',
            Number(answerValue(classifier, 'condition')) === 4 ? { complaintHint: true } : undefined,
          ),
        },
        {
          id: 'R6',
          required: ['condition'],
          match: () => facts.voluntaryOpen && Number(answerValue(classifier, 'condition')) <= 1,
          outcome: () => makeOutcome('accepted', ['§3 ust. 1'], 'voluntary_return'),
        },
        {
          id: 'R7',
          required: ['condition'],
          match: () => facts.voluntaryOpen && Number(answerValue(classifier, 'condition')) >= 2,
          outcome: () => makeOutcome(
            'rejected',
            ['§3 ust. 1', '§3 ust. 2'],
            'used_item_voluntary',
            Number(answerValue(classifier, 'condition')) === 4 ? { complaintHint: true } : undefined,
          ),
        },
      ];

  for (const row of rows) {
    const uncertainQuestions: string[] = [];
    for (const question of row.required) {
      const certainty = classifier.answers[question]?.certainty;
      if (certainty !== undefined && Number.isFinite(certainty)) {
        minGatingCertainty = minGatingCertainty === null ? certainty : Math.min(minGatingCertainty, certainty);
      }
      if (certainty === undefined || !Number.isFinite(certainty) || certainty < threshold) {
        uncertainQuestions.push(question);
      }
    }
    if (!ignoreCertainty && uncertainQuestions.length > 0) {
      return {
        outcome: null,
        rowId: null,
        gateFailedAt: row.id,
        minGatingCertainty,
        uncertainQuestions,
      };
    }
    if (row.match()) {
      return {
        outcome: row.outcome(),
        rowId: row.id,
        gateFailedAt: null,
        minGatingCertainty,
        uncertainQuestions: [],
      };
    }
  }

  return { outcome: null, rowId: null, gateFailedAt: null, minGatingCertainty, uncertainQuestions: [] };
}

function alwaysLlmReasons(input: CaseInput, classifier: ClassifierResult | null): string[] {
  const reasons: string[] = [];
  if (!classifier) reasons.push('classifier_unavailable');
  if (input.category === 'other') reasons.push('category_other');
  const injection = classifier?.answers.instruction_injection;
  if (injection?.value === true && injection.certainty >= 0.5) reasons.push('instruction_injection');
  if (input.caseType === 'return' && input.category === 'audio') reasons.push('return_audio_hygiene');
  if (
    input.caseType === 'complaint' &&
    classifier?.answers.visible_damage?.value === false &&
    input.description.length < 40
  ) {
    reasons.push('short_invisible_defect_description');
  }
  return reasons;
}

export function evaluate(
  input: CaseInput,
  classifier: ClassifierResult | null,
  facts: DateFacts,
  config: { threshold: number; mode: RuleMode },
): EvaluateResult {
  if (config.mode === 'fast-only' && classifier === null) {
    throw new RulesClassifierMissingError();
  }

  const alwaysReasons = alwaysLlmReasons(input, classifier);
  const state = classifier
    ? evaluateRows(input, classifier, facts, config.threshold, config.mode === 'fast-only')
    : { outcome: null, rowId: null, gateFailedAt: null, minGatingCertainty: null, uncertainQuestions: [] };
  const metadata = {
    minGatingCertainty: state.minGatingCertainty,
    gateFailedAt: state.gateFailedAt,
    uncertainQuestions: state.uncertainQuestions,
  };

  if (config.mode === 'llm-only') {
    const shadowReason = state.outcome?.reasonCodes[0];
    const shadowOutcome =
      alwaysReasons.length === 0 &&
      state.gateFailedAt === null &&
      shadowReason !== 'description_photo_mismatch' &&
      shadowReason !== 'no_rule_matched'
        ? state.outcome
        : null;
    return {
      route: 'llm',
      shadowOutcome,
      reasons: ['decision_mode_llm_only', ...alwaysReasons, ...(state.gateFailedAt ? [`gate_failed:${state.gateFailedAt}`] : [])],
      ...metadata,
    };
  }

  if (config.mode === 'fast-only') {
    if (alwaysReasons.length > 0) {
      const policyPriority = state.outcome?.reasonCodes[0] === 'escalation_signal' ||
        state.outcome?.reasonCodes[0] === 'liability_expired' ||
        state.outcome?.reasonCodes[0] === 'return_window_expired';
      if (policyPriority && state.outcome) {
        return { route: 'fast', outcome: state.outcome, reasons: [...alwaysReasons, state.outcome.reasonCodes[0]!], ...metadata };
      }
      return {
        route: 'fast',
        outcome: makeOutcome('escalated', ['§7'], 'no_rule_matched'),
        reasons: [...alwaysReasons, 'no_rule_matched'],
        ...metadata,
      };
    }
    if (state.outcome?.reasonCodes[0] === 'description_photo_mismatch') {
      return { route: 'fast', outcome: state.outcome, reasons: ['description_photo_mismatch'], ...metadata };
    }
    if (state.outcome) {
      return { route: 'fast', outcome: state.outcome, reasons: [state.outcome.reasonCodes[0]!], ...metadata };
    }
    return {
      route: 'fast',
      outcome: makeOutcome('escalated', ['§7'], 'no_rule_matched'),
      reasons: ['no_rule_matched'],
      ...metadata,
    };
  }

  if (alwaysReasons.length > 0) {
    return { route: 'llm', reasons: alwaysReasons, ...metadata };
  }
  if (state.gateFailedAt !== null) {
    return {
      route: 'llm',
      reasons: [`gate_failed:${state.gateFailedAt}`],
      ...metadata,
    };
  }
  if (state.outcome?.reasonCodes[0] === 'description_photo_mismatch' || state.outcome?.reasonCodes[0] === 'no_rule_matched') {
    return { route: 'llm', reasons: [state.outcome.reasonCodes[0]!], ...metadata };
  }
  if (state.outcome) {
    return { route: 'fast', outcome: state.outcome, reasons: [state.outcome.reasonCodes[0]!], ...metadata };
  }
  return { route: 'llm', reasons: ['no_rule_matched'], ...metadata };
}

export function checkLlmOutcome(
  input: CaseInput,
  facts: DateFacts,
  classifier: ClassifierResult | null,
  outcome: { decision: Decision; citedSections: string[] },
  imageAnalysis?: Pick<ImageAnalysis, 'damage'> | null,
  threshold = 0.8,
): { ok: true } | { ok: false; violations: string[] } {
  if (outcome.decision === 'escalated') return { ok: true };

  const violations: string[] = [];
  if (input.caseType === 'complaint' && facts.liabilityExpired && outcome.decision !== 'rejected') {
    violations.push('expired_complaint_must_be_rejected_or_escalated');
  }
  if (input.caseType === 'return') {
    if (!facts.voluntaryOpen && outcome.decision !== 'rejected') {
      violations.push('expired_return_must_be_rejected_or_escalated');
    }
    const statutoryExclusion = outcome.citedSections.some((section) =>
      ['§4 ust. 1', '§4 ust. 2', '§4 ust. 3'].includes(section),
    );
    if (input.channel === 'online' && facts.withdrawalOpen && outcome.decision === 'rejected' && !statutoryExclusion) {
      violations.push('online_withdrawal_cannot_be_rejected_without_statutory_exclusion');
    }
  }
  if (input.caseType === 'complaint') {
    let probableCause: string | undefined;
    if (imageAnalysis != null) {
      probableCause = imageAnalysis.damage?.probableCause;
    } else {
      const damageAnswer = classifier?.answers.damage_cause;
      if (damageAnswer && damageAnswer.certainty >= threshold) probableCause = String(damageAnswer.value);
    }
    if (
      outcome.decision === 'accepted' &&
      ['impact', 'liquid', 'heat', 'tampering'].includes(probableCause ?? '')
    ) {
      violations.push('user_caused_damage_cannot_be_accepted');
    }
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
