import type { Draft } from "@/components/case-form";
import type { CaseEvent, CaseSummary, Decision } from "@/lib/domain";

export type ProgressStep = "upload" | "analysis" | "decision";

export type ResultEvent = Extract<CaseEvent, { type: "result" }>;

export type FieldErrors = Partial<Record<keyof Draft, string>>;

export type PageState =
  | { kind: "form"; draft: Draft; serviceError: boolean; serverFieldErrors?: FieldErrors }
  | { kind: "progress"; draft: Draft; completedSteps: ProgressStep[] }
  | {
      kind: "chat";
      caseId: string;
      caseSummary: CaseSummary;
      thumbnailUrl: string;
      firstMessage: ResultEvent["firstMessage"];
      decision: Decision;
    };

export type PageAction =
  | { type: "submit"; draft: Draft }
  | { type: "progress"; step: ProgressStep }
  | { type: "result"; event: ResultEvent; thumbnailUrl: string }
  | { type: "serviceError" }
  | { type: "validationError"; fields: FieldErrors }
  | { type: "newCase" };

/** Same literal as `emptyDraft()` in components/case-form (not imported at runtime, to keep this module pure). */
const newDraft = (): Draft => ({ model: "", purchaseDate: "", description: "" });

export const initialPageState: PageState = { kind: "form", draft: newDraft(), serviceError: false };

/**
 * Pure transitions from ADR-003 section 3.1. Events that are not valid for the
 * current state return the same state object.
 */
export function pageReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case "submit":
      if (state.kind !== "form") return state;
      return { kind: "progress", draft: action.draft, completedSteps: [] };

    case "progress":
      if (state.kind !== "progress") return state;
      if (state.completedSteps.includes(action.step)) return state;
      return { ...state, completedSteps: [...state.completedSteps, action.step] };

    case "result":
      if (state.kind !== "progress") return state;
      return {
        kind: "chat",
        caseId: action.event.caseId,
        caseSummary: action.event.caseSummary,
        thumbnailUrl: action.thumbnailUrl,
        firstMessage: action.event.firstMessage,
        decision: action.event.decision,
      };

    case "serviceError":
      if (state.kind !== "progress") return state;
      return { kind: "form", draft: state.draft, serviceError: true };

    case "validationError":
      if (state.kind !== "progress") return state;
      return { kind: "form", draft: state.draft, serviceError: false, serverFieldErrors: action.fields };

    case "newCase":
      if (state.kind !== "chat") return state;
      return { kind: "form", draft: newDraft(), serviceError: false };
  }
}
