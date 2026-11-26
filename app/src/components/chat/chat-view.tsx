"use client";

import { useCallback, useMemo, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { CircleCheck, CircleHelp, CircleX, ChevronDown, LoaderCircle, Send, UserRound } from "lucide-react";
import { Streamdown } from "streamdown";
import type { CaseSummary, CaseUIMessage, Decision } from "@/lib/domain";
import { CATEGORIES, DECISION_LABELS, DecisionDataSchema, type CategoryId } from "@/lib/domain";
import { pl } from "@/lib/i18n/pl";
import { formatDatePl, isNearBottom } from "./scroll";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { Message, MessageContent, MessageGroup } from "@/components/ui/message";
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from "@/components/ui/message-scroller";

const DECISION_TONE: Record<Decision, { color: string; Icon: typeof CircleCheck }> = {
  accepted: { color: "#208A20", Icon: CircleCheck },
  rejected: { color: "#CC1D56", Icon: CircleX },
  needs_info: { color: "#0096E0", Icon: CircleHelp },
  escalated: { color: "#003963", Icon: UserRound },
};

type ChatViewProps = {
  caseId: string;
  caseSummary: CaseSummary;
  thumbnailUrl: string;
  firstMessage: CaseUIMessage;
  onNewCase(): void;
};

function DecisionBadge({ decision }: { decision: Decision }) {
  const { color, Icon } = DECISION_TONE[decision];
  const label = DECISION_LABELS[decision];
  return (
    <span
      role="img"
      aria-label={`Decyzja: ${label}`}
      className="order-3 inline-flex items-center gap-2 rounded-full border-2 bg-white px-2 py-0.5 text-xs font-bold sm:order-none sm:px-3 sm:py-1 sm:text-sm text-primary"
      style={{ borderColor: color }}
    >
      <Icon aria-hidden className="size-4" style={{ color }} />
      {label}
    </span>
  );
}

function messageText(message: CaseUIMessage): string {
  return message.parts
    .filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function latestDecision(messages: CaseUIMessage[], initialDecision: Decision): Decision {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    if (!message) continue;
    for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = message.parts[partIndex];
      if (part?.type === "data-decision") {
        const parsed = DecisionDataSchema.safeParse(part.data);
        if (parsed.success) return parsed.data.decision;
      }
    }
  }

  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const decision = messages[messageIndex]?.metadata?.decision;
    if (decision) return decision;
  }
  return initialDecision;
}

type Corrections = { purchaseDate?: string; channel?: CaseSummary["channel"] };

/** Corrections from the newest data-decision part (Q4.4). Read defensively: the schema field is optional. */
function latestCorrections(messages: CaseUIMessage[]): Corrections {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const parts = messages[messageIndex]?.parts ?? [];
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex];
      if (part?.type !== "data-decision") continue;
      const raw: unknown = (part.data as { corrections?: unknown }).corrections;
      if (typeof raw !== "object" || raw === null) return {};
      const { purchaseDate, channel } = raw as Record<string, unknown>;
      return {
        ...(typeof purchaseDate === "string" ? { purchaseDate } : {}),
        ...(channel === "online" || channel === "store" ? { channel } : {}),
      };
    }
  }
  return {};
}

function AgentMessage({ message }: { message: CaseUIMessage }) {
  const text = messageText(message);
  const disclaimerIndex = text.lastIndexOf(pl.disclaimer);
  const body = disclaimerIndex >= 0 ? text.slice(0, disclaimerIndex).trimEnd() : text;
  const hasRevision = message.parts.some((part) => part.type === "data-decision");

  return (
    <>
      {hasRevision && (
        <Badge variant="outline" className="h-auto w-fit border-accent px-2 py-1 text-primary">
          {pl.chat.revisedAssessment}
        </Badge>
      )}
      <div className="w-fit max-w-full rounded-2xl border border-border bg-white px-4 py-3 text-[16px] leading-7 text-foreground sm:max-w-[88%]">
        <Streamdown skipHtml>{body}</Streamdown>
        {disclaimerIndex >= 0 && <p className="mt-4 text-sm leading-6 text-muted-foreground">{pl.disclaimer}</p>}
      </div>
    </>
  );
}

const SUMMARY_COLLAPSE_QUERY = "(max-width: 767px)";

function subscribeToViewport(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const mediaQuery = window.matchMedia(SUMMARY_COLLAPSE_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function isNarrowViewport() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(SUMMARY_COLLAPSE_QUERY).matches;
}

function CaseSummaryPanel({ summary, thumbnailUrl }: { summary: CaseSummary; thumbnailUrl: string }) {
  const isNarrow = useSyncExternalStore(subscribeToViewport, isNarrowViewport, () => false);
  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  const open = openOverride ?? !isNarrow;
  const category = CATEGORIES.find((item) => item.id === summary.category as CategoryId)?.label ?? summary.category;

  return (
    <Collapsible open={open} onOpenChange={setOpenOverride} className="rounded-xl border border-border bg-white">
      <CollapsibleTrigger className="flex min-h-10 w-full items-center justify-between gap-3 px-4 py-2 sm:min-h-12 sm:py-3 text-left font-bold text-primary">
        <span>{pl.chat.ui.caseDetails}</span>
        <ChevronDown aria-hidden className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid max-h-[30dvh] gap-4 overflow-y-auto border-t border-border px-4 py-3 sm:max-h-none sm:grid-cols-[1fr_auto] sm:py-4">
          <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-4 gap-y-2 text-sm">
            <dt className="font-bold text-primary">{pl.form.labels.caseType}</dt>
            <dd>{summary.caseType === "complaint" ? pl.form.caseType.complaint.label : pl.form.caseType.return.label}</dd>
            <dt className="font-bold text-primary">{pl.form.labels.category}</dt>
            <dd>{category}</dd>
            <dt className="font-bold text-primary">{pl.form.labels.model}</dt>
            <dd>{summary.model}</dd>
            <dt className="font-bold text-primary">{pl.form.labels.purchaseDate}</dt>
            <dd>{formatDatePl(summary.purchaseDate)}</dd>
            <dt className="font-bold text-primary">{pl.form.labels.channel}</dt>
            <dd>{summary.channel === "online" ? pl.form.channel.online : pl.form.channel.store}</dd>
          </dl>
          {thumbnailUrl && (
            // This is a local object URL owned by the current case, not a remote image source.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt={pl.form.labels.photo} className="max-h-28 w-36 rounded-lg border border-border object-contain" />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ChatView({ caseId, caseSummary, thumbnailUrl, firstMessage, onNewCase }: ChatViewProps) {
  const [input, setInput] = useState("");
  const [caseExpired, setCaseExpired] = useState(false);
  // AC-40: a reply scrolls the list only while the user is at the bottom (updated on every scroll).
  // Start at the top of the first message; later scroll events and sends update this state.
  const [stickToBottom, setStickToBottom] = useState(false);
  const transport = useMemo(
    () =>
      new DefaultChatTransport<CaseUIMessage>({
        api: "/api/chat",
        body: () => ({ caseId }),
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          if (response.status === 404) {
            const body: unknown = await response.clone().json().catch(() => undefined);
            if (typeof body === "object" && body !== null && "error" in body && body.error === "case_not_found") {
              setCaseExpired(true);
            }
          }
          return response;
        },
      }),
    [caseId],
  );
  const { messages, sendMessage, regenerate, status } = useChat<CaseUIMessage>({
    id: caseId,
    messages: [firstMessage],
    transport,
    dataPartSchemas: { decision: DecisionDataSchema },
  });
  const decision = latestDecision(messages, firstMessage.metadata?.decision ?? "needs_info");
  const effectiveSummary = { ...caseSummary, ...latestCorrections(messages) };
  const visibleMessages = messages.filter((message) => message.role !== "assistant" || messageText(message).trim().length > 0);
  const isBusy = status === "submitted" || status === "streaming";
  const latestMessage = messages[messages.length - 1];
  const isAssistantWriting = isBusy && (status === "submitted" || latestMessage?.role !== "assistant" || !messageText(latestMessage));
  const lastUserIndex = messages.findLastIndex((message) => message.role === "user");
  const sendDisabled = caseExpired || status !== "ready" || input.trim().length === 0;

  const submitMessage = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!input.trim() || sendDisabled) return;
      const text = input;
      setInput("");
      setStickToBottom(true);
      void sendMessage({ text });
    },
    [input, sendDisabled, sendMessage],
  );

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    event.preventDefault();
    submitMessage();
  };

  return (
    <main className="mx-auto flex h-[calc(100dvh-4rem)] min-h-[30rem] w-full max-w-[840px] flex-col gap-2 px-4 py-2 sm:gap-4 sm:py-6 md:h-[calc(100dvh-5rem)]">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border pb-2 sm:pb-4">
        <div className="min-w-0">
          <h1 className="break-all text-lg font-bold text-primary sm:text-2xl">{caseId}</h1>
          <p className="mt-1 hidden text-sm font-medium sm:block text-muted-foreground">
            {caseSummary.caseType === "complaint" ? pl.form.caseType.complaint.label : pl.form.caseType.return.label}
          </p>
        </div>
        <div className="contents sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <DecisionBadge decision={decision} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" className="h-8 px-3 text-sm sm:h-[47px] sm:px-[50px] sm:text-[18px]">{pl.chat.newCase}</Button>
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

      <CaseSummaryPanel summary={effectiveSummary} thumbnailUrl={thumbnailUrl} />

      {caseExpired && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive px-4 py-3 text-destructive">
          <p>{pl.errors.caseExpired}</p>
        </div>
      )}

      <MessageScrollerProvider autoScroll={stickToBottom} defaultScrollPosition="start">
        <MessageScroller data-testid="chat-message-scroller" className="min-h-[14rem] flex-1">
          <MessageScrollerViewport aria-label={pl.chat.ui.conversation} tabIndex={0} onScroll={(event) => { setStickToBottom(isNearBottom(event.currentTarget)); }}>
            <MessageScrollerContent role="log" aria-label={pl.chat.ui.conversation} className="gap-4 py-3">
              {visibleMessages.map((message, index) => (
                <MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={!isAssistantWriting && index === visibleMessages.length - 1 && stickToBottom}>
                  <MessageGroup>
                    <Message align={message.role === "user" ? "end" : "start"}>
                      <MessageContent className={message.role === "user" ? "items-end" : "items-start"}>
                        {message.role === "assistant" ? (
                          <AgentMessage message={message} />
                        ) : (
                          <div className="w-fit max-w-full whitespace-pre-wrap rounded-2xl bg-muted px-4 py-3 text-[16px] leading-7 text-foreground sm:max-w-[88%]">
                            {messageText(message)}
                          </div>
                        )}
                        {status === "error" && !caseExpired && index === lastUserIndex && (
                          <div className="flex items-center gap-3 text-sm text-destructive" role="alert">
                            <span>{pl.errors.chatSend}</span>
                            <Button type="button" variant="link" className="h-auto p-0 text-destructive" onClick={() => void regenerate()}>
                              {pl.chat.retry}
                            </Button>
                          </div>
                        )}
                      </MessageContent>
                    </Message>
                  </MessageGroup>
                </MessageScrollerItem>
              ))}
              {isAssistantWriting && (
                <MessageScrollerItem scrollAnchor>
                  <div role="status" aria-label={pl.chat.ui.typingLabel} className="flex w-fit items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
                    <LoaderCircle aria-hidden className="size-4 animate-spin text-primary" />
                    <span>{pl.chat.ui.typing}</span>
                  </div>
                </MessageScrollerItem>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton direction="end" variant="outline" size="sm" className="border-accent bg-white text-primary" aria-label="Przewiń do najnowszej wiadomości">
            <ChevronDown aria-hidden className="size-4" />
            {pl.chat.ui.scrollToLatest}
          </MessageScrollerButton>
        </MessageScroller>
      </MessageScrollerProvider>

      <form onSubmit={submitMessage} className="border-t border-border bg-background pt-2 sm:pt-4">
        <label htmlFor="chat-message" className="sr-only font-bold text-primary sm:not-sr-only sm:mb-2 sm:block">{pl.chat.ui.messageLabel}</label>
        <InputGroup className="h-auto min-h-0 items-end rounded-xl bg-white p-1 sm:min-h-24 sm:p-2">
          <InputGroupTextarea
            id="chat-message"
            aria-label={pl.chat.ui.messageLabel}
            value={input}
            maxLength={2000}
            rows={1}
            placeholder={pl.chat.ui.messagePlaceholder}
            disabled={caseExpired || isBusy}
            onChange={(event) => setInput(event.currentTarget.value.slice(0, 2000))}
            onKeyDown={handleInputKeyDown}
            className="min-h-10 max-h-40 sm:min-h-16 resize-y border-0 bg-transparent px-2 text-base text-foreground shadow-none focus-visible:ring-0"
          />
          <InputGroupAddon align="block-end" className="justify-between border-t border-border px-2 py-1 sm:py-2">
            <span aria-live="polite" className="text-sm text-muted-foreground">{input.length >= 1800 ? `${input.length} / 2000` : ""}</span>
            <InputGroupButton type="submit" aria-label={pl.chat.send} disabled={sendDisabled} className="h-8 rounded-[22px] border border-accent bg-white px-4 font-bold sm:h-10 sm:px-5 text-primary hover:bg-muted">
              <Send aria-hidden className="size-4" />
              {pl.chat.send}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </main>
  );
}
