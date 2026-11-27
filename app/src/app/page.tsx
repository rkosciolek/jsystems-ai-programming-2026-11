"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { initialPageState, pageReducer, type FieldErrors } from "@/app/page-state";
import { CaseForm, type Draft } from "@/components/case-form";
import { ChatView } from "@/components/chat";
import { AnalysisProgress } from "@/components/progress";
import { ValidationError, submitCase } from "@/lib/client/submit-case";
import { pl } from "@/lib/i18n/pl";

/** Client safety timeout (ADR-003 section 3.3). The server budget is 90 s. */
const CLIENT_TIMEOUT_MS = 95_000;

export default function Home() {
  const [state, dispatch] = useReducer(pageReducer, initialPageState);
  const abortRef = useRef<AbortController | null>(null);
  // Thumbnail object URL shown on the progress screen. It moves to the chat state on result, otherwise it is revoked.
  const [progressThumb, setProgressThumb] = useState("");

  // Leave-page protection (AC-43): registered only while the chat is shown.
  useEffect(() => {
    if (state.kind !== "chat") return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [state.kind]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const runSubmit = useCallback(async (draft: Draft) => {
    const thumbnailUrl = draft.photo ? URL.createObjectURL(draft.photo) : "";
    setProgressThumb(thumbnailUrl);
    // Progress is shown before the request is sent (AC-16).
    dispatch({ type: "submit", draft });

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    let handedOver = false;

    try {
      for await (const event of submitCase(draft, controller.signal)) {
        if (event.type === "progress") {
          dispatch({ type: "progress", step: event.step });
        } else if (event.type === "result") {
          clearTimeout(timer);
          handedOver = true;
          setProgressThumb("");
          dispatch({ type: "result", event, thumbnailUrl });
        } else {
          dispatch({ type: "serviceError" });
        }
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        dispatch({ type: "validationError", fields: error.fields as FieldErrors });
      } else {
        dispatch({ type: "serviceError" });
      }
    } finally {
      clearTimeout(timer);
      if (abortRef.current === controller) abortRef.current = null;
      if (!handedOver) {
        if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
        setProgressThumb("");
      }
    }
  }, []);

  const handleNewCase = () => {
    if (state.kind === "chat" && state.thumbnailUrl) URL.revokeObjectURL(state.thumbnailUrl);
    dispatch({ type: "newCase" });
  };

  if (state.kind === "progress") {
    return <AnalysisProgress draft={state.draft} completedSteps={state.completedSteps} thumbnailUrl={progressThumb} />;
  }

  if (state.kind === "chat") {
    return (
      <ChatView
        caseId={state.caseId}
        caseSummary={state.caseSummary}
        thumbnailUrl={state.thumbnailUrl}
        firstMessage={state.firstMessage}
        onNewCase={handleNewCase}
      />
    );
  }

  return (
    <main>
      <div className="mx-auto w-full max-w-[720px] px-4 pt-8">
        <h1 className="text-3xl font-bold text-primary">{pl.form.title}</h1>
        <p className="mt-2 text-foreground">{pl.form.intro}</p>
      </div>
      <CaseForm
        initialDraft={state.draft}
        serviceError={state.serviceError}
        serverFieldErrors={state.serverFieldErrors}
        onSubmit={(draft) => void runSubmit(draft)}
        onRetry={(draft) => void runSubmit(draft)}
      />
    </main>
  );
}
