"use client";

import { CircleCheck, CircleHelp, CircleX, UserRound, type LucideIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import type { ResultEvent } from "@/app/page-state";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DECISION_LABELS, type Decision } from "@/lib/domain";
import { pl } from "@/lib/i18n/pl";

// Decorative border and icon colors from ADR-003 section 3.5. The label is always navy.
const DECISION_TONE: Record<Decision, { color: string; icon: LucideIcon }> = {
  accepted: { color: "#208A20", icon: CircleCheck },
  rejected: { color: "#CC1D56", icon: CircleX },
  needs_info: { color: "#0096E0", icon: CircleHelp },
  escalated: { color: "#003963", icon: UserRound },
};

function DecisionBadge({ decision }: { decision: Decision }) {
  const label = DECISION_LABELS[decision];
  const { color, icon: Icon } = DECISION_TONE[decision];
  return (
    <span
      role="img"
      aria-label={`Decyzja: ${label}`}
      className="inline-flex items-center gap-2 rounded-full border-2 bg-white px-3 py-1 text-sm font-bold text-primary"
      style={{ borderColor: color }}
    >
      <Icon aria-hidden className="size-4" style={{ color }} />
      {label}
    </span>
  );
}

type FirstMessageViewProps = {
  caseId: string;
  decision: Decision;
  firstMessage: ResultEvent["firstMessage"];
  onNewCase(): void;
};

/** Temporary chat-state view (T15). T17 replaces it with the streaming chat. */
export function FirstMessageView({ caseId, decision, firstMessage, onNewCase }: FirstMessageViewProps) {
  const text = firstMessage.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  return (
    <section className="mx-auto flex w-full max-w-[840px] flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">{caseId}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <DecisionBadge decision={decision} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline">
                {pl.chat.newCase}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{pl.chat.newCase}</AlertDialogTitle>
                <AlertDialogDescription>{pl.chat.newCaseConfirm}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{pl.common.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={onNewCase}>{pl.chat.newCase}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <article className="text-[18px] leading-[28.8px] text-foreground">
        <Streamdown skipHtml>{text}</Streamdown>
      </article>
    </section>
  );
}
