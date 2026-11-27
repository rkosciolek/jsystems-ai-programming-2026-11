"use client";

import { Circle, CircleCheck, LoaderCircle } from "lucide-react";
import Image from "next/image";
import type { ProgressStep } from "@/app/page-state";
import type { Draft } from "@/components/case-form";
import { CATEGORIES } from "@/lib/domain";
import { pl } from "@/lib/i18n/pl";

const STEPS: ProgressStep[] = ["upload", "analysis", "decision"];

type StepStatus = "pending" | "active" | "done";

function statusFor(step: ProgressStep, completedSteps: ProgressStep[]): StepStatus {
  if (completedSteps.includes(step)) return "done";
  const firstOpen = STEPS.find((candidate) => !completedSteps.includes(candidate));
  return firstOpen === step ? "active" : "pending";
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") return <CircleCheck aria-hidden className="size-5 text-primary" />;
  if (status === "active") return <LoaderCircle aria-hidden className="size-5 animate-spin text-primary" />;
  return <Circle aria-hidden className="size-5 text-muted-foreground" />;
}

type AnalysisProgressProps = {
  draft: Draft;
  completedSteps: ProgressStep[];
  /** Object URL of the photo, owned by the page (it revokes it). Empty when there is no photo. */
  thumbnailUrl: string;
};

export function AnalysisProgress({ draft, completedSteps, thumbnailUrl }: AnalysisProgressProps) {
  const categoryLabel = CATEGORIES.find((category) => category.id === draft.category)?.label ?? "";
  const caseTypeLabel = draft.caseType ? pl.form.caseType[draft.caseType].label : "";

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-bold text-primary">{pl.progress.title}</h1>

      <ol aria-live="polite" className="flex flex-col gap-3">
        {STEPS.map((step) => {
          const status = statusFor(step, completedSteps);
          return (
            <li key={step} data-status={status} className="flex items-center gap-3">
              <StepIcon status={status} />
              <span className={status === "pending" ? "text-muted-foreground" : "text-foreground"}>
                {pl.progress[step]}
              </span>
            </li>
          );
        })}
      </ol>

      <dl data-testid="progress-summary" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border border-border bg-muted p-4 text-sm">
        <dt className="text-muted-foreground">{pl.form.labels.caseType}</dt>
        <dd className="text-foreground">{caseTypeLabel}</dd>
        <dt className="text-muted-foreground">{pl.form.labels.category}</dt>
        <dd className="text-foreground">{categoryLabel}</dd>
        <dt className="text-muted-foreground">{pl.form.labels.model}</dt>
        <dd className="text-foreground">{draft.model}</dd>
        {thumbnailUrl !== "" && (
          <dd className="col-span-2 mt-2">
            <Image
              src={thumbnailUrl}
              alt={draft.photo?.name ?? ""}
              width={320}
              height={180}
              unoptimized
              className="max-h-36 max-w-full rounded-md object-contain object-left"
            />
          </dd>
        )}
      </dl>
    </main>
  );
}
