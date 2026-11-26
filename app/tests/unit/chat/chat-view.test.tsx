// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseUIMessage } from "@/lib/domain";
import { pl } from "@/lib/i18n/pl";

const chatMocks = vi.hoisted(() => ({
  useChat: vi.fn(),
  sendMessage: vi.fn(),
  regenerate: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({ useChat: chatMocks.useChat }));

import { ChatView } from "@/components/chat";

const firstMessage: CaseUIMessage = {
  id: "assistant-first",
  role: "assistant",
  parts: [{ type: "text", text: `Dzień dobry. **Wstępnie zaakceptowano.**\n\n${pl.disclaimer}` }],
  metadata: { decision: "accepted" },
};

const caseSummary = {
  caseType: "complaint" as const,
  category: "laptop" as const,
  model: "Lenovo ThinkPad T14",
  purchaseDate: "2026-11-01",
  channel: "online" as const,
};

function userMessage(text: string, id = "user-1"): CaseUIMessage {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

function assistantMessage(
  text: string,
  decision: "accepted" | "rejected" = "accepted",
  id = "assistant-next",
): CaseUIMessage {
  return { id, role: "assistant", parts: [{ type: "text", text }], metadata: { decision } };
}

function renderChat(props: Partial<React.ComponentProps<typeof ChatView>> = {}) {
  return render(
    <ChatView
      caseId="HSD-20261125-AB12"
      caseSummary={caseSummary}
      thumbnailUrl="blob:case-thumb"
      firstMessage={firstMessage}
      onNewCase={vi.fn()}
      {...props}
    />,
  );
}

function setChatState(
  overrides: Partial<{
    messages: CaseUIMessage[];
    status: "submitted" | "streaming" | "ready" | "error";
    error: Error;
  }> = {},
) {
  chatMocks.useChat.mockReturnValue({
    messages: [firstMessage],
    status: "ready",
    error: undefined,
    sendMessage: chatMocks.sendMessage,
    regenerate: chatMocks.regenerate,
    ...overrides,
  });
}

beforeEach(() => {
  chatMocks.sendMessage.mockReset();
  chatMocks.regenerate.mockReset();
  chatMocks.useChat.mockReset();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("max-width: 767px"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  setChatState();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ChatView", () => {
  it("seeds useChat with the first assistant message and sends caseId through the transport body", () => {
    renderChat();

    expect(chatMocks.useChat).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "HSD-20261125-AB12",
        messages: [firstMessage],
        transport: expect.objectContaining({}),
        dataPartSchemas: { decision: expect.anything() },
      }),
    );
    const chatOptions = chatMocks.useChat.mock.calls[0]?.[0];
    expect(chatOptions.transport.body()).toEqual({ caseId: "HSD-20261125-AB12" });
    expect(screen.getByText("Dzień dobry.")).toBeInTheDocument();
    expect(screen.getByRole("log", { name: pl.chat.ui.conversation })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: `Decyzja: ${pl.decisions.accepted}` })).toBeInTheDocument();
  });

  it("renders assistant Markdown without rendering raw HTML", () => {
    setChatState({
      messages: [
        {
          ...firstMessage,
          parts: [{ type: "text", text: '**Ocena**\n\n<img src="x" onerror="alert(1)">nie renderuj HTML' }],
        },
      ],
    });
    const { container } = renderChat();
    const message = container.querySelector('[data-message-id="assistant-first"]');

    expect(message?.querySelector('[data-streamdown="strong"]')).toHaveTextContent("Ocena");
    expect(message?.querySelector("img")).toBeNull();
    expect(message?.textContent).not.toContain("<img");
  });

  it("uses the newest data-decision before message metadata and the seed metadata", () => {
    setChatState({ messages: [firstMessage, assistantMessage("Ocena w metadanych.", "rejected")] });
    const { rerender } = renderChat();
    expect(screen.getByRole("img", { name: `Decyzja: ${pl.decisions.rejected}` })).toBeInTheDocument();

    setChatState({
      messages: [
        firstMessage,
        {
          ...assistantMessage("Ocena w części danych.", "rejected"),
          parts: [
            { type: "text", text: "Ocena w części danych." },
            { type: "data-decision", id: "decision-1", data: { decision: "accepted" } },
          ],
        },
      ],
    });
    rerender(
      <ChatView
        caseId="HSD-20261125-AB12"
        caseSummary={caseSummary}
        thumbnailUrl="blob:case-thumb"
        firstMessage={firstMessage}
        onNewCase={vi.fn()}
      />,
    );
    expect(screen.getByRole("img", { name: `Decyzja: ${pl.decisions.accepted}` })).toBeInTheDocument();
  });

  it("marks a message containing data-decision as a revised assessment", () => {
    setChatState({
      messages: [
        firstMessage,
        {
          ...assistantMessage("Nowa ocena.", "rejected"),
          parts: [
            { type: "data-decision", id: "decision-1", data: { decision: "rejected", previous: "accepted", reason: "Nowe fakty" } },
            { type: "text", text: "Nowa ocena." },
          ],
        },
      ],
    });

    renderChat();

    expect(screen.getByText(pl.chat.revisedAssessment)).toBeInTheDocument();
  });

  it("does not mark a corrected case as revised when its decision stays the same", async () => {
    setChatState({
      messages: [
        firstMessage,
        {
          ...assistantMessage("Ta sama ocena po korekcie kanału.", "rejected"),
          parts: [
            {
              type: "data-decision",
              id: "decision-unchanged",
              data: {
                decision: "rejected",
                previous: "rejected",
                decisionChanged: false,
                corrections: { channel: "online" },
              },
            },
            { type: "text", text: "Ta sama ocena po korekcie kanału." },
          ],
        },
      ],
    });

    renderChat();

    expect(screen.queryByText(pl.chat.revisedAssessment)).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Szczegóły sprawy" }));
    expect(screen.getByText(pl.form.channel.online)).toBeInTheDocument();
    expect(screen.queryByText(pl.form.channel.store)).not.toBeInTheDocument();
  });

  it.each([
    ["accepted", "#208A20"],
    ["rejected", "#CC1D56"],
    ["needs_info", "#0096E0"],
    ["escalated", "#003963"],
  ] as const)("uses an accessible icon and the designated border for %s", (decision, color) => {
    setChatState({ messages: [{ ...firstMessage, metadata: { decision } }] });
    renderChat();
    const badge = screen.getByRole("img", { name: `Decyzja: ${pl.decisions[decision]}` });

    expect(badge).toHaveTextContent(pl.decisions[decision]);
    expect(badge.querySelector("svg")).not.toBeNull();
    expect(badge).toHaveStyle({ borderColor: color });
  });

  it("disables sending whitespace-only input and enforces the 2000-character limit", () => {
    renderChat();
    const input = screen.getByRole("textbox", { name: "Wiadomość" });
    const send = screen.getByRole("button", { name: pl.chat.send });

    expect(send).toBeDisabled();
    fireEvent.change(input, { target: { value: "   \n  " } });
    expect(send).toBeDisabled();

    fireEvent.change(input, { target: { value: "a".repeat(2001) } });
    expect(input).toHaveAttribute("maxLength", "2000");
    expect(input).toHaveValue("a".repeat(2000));
    expect(send).toBeEnabled();
  });

  it("sends on Enter, inserts a newline on Shift+Enter, and does not send during IME composition", () => {
    renderChat();
    const input = screen.getByRole("textbox", { name: "Wiadomość" });

    fireEvent.change(input, { target: { value: " Jaka jest data zakupu? " } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(chatMocks.sendMessage).toHaveBeenCalledWith({ text: " Jaka jest data zakupu? " });

    fireEvent.change(input, { target: { value: "pierwsza linia" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", shiftKey: true });
    expect(input).toHaveValue("pierwsza linia");
    expect(chatMocks.sendMessage).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: "wiadomość IME" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", isComposing: true });
    expect(chatMocks.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("shows the counter starting at 1800 characters", () => {
    renderChat();
    const input = screen.getByRole("textbox", { name: "Wiadomość" });

    fireEvent.change(input, { target: { value: "a".repeat(1799) } });
    expect(screen.queryByText("1799 / 2000")).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "a".repeat(1800) } });
    expect(screen.getByText("1800 / 2000")).toBeInTheDocument();
  });

  it.each(["submitted", "streaming"] as const)("shows the typing indicator for %s before reply text", (status) => {
    setChatState({ messages: [firstMessage, userMessage("Dopytanie")], status });
    renderChat();

    expect(screen.getByRole("status", { name: "Asystent przygotowuje odpowiedź" })).toBeInTheDocument();
  });

  it("hides the typing indicator once streamed assistant text is present", () => {
    setChatState({ messages: [firstMessage, userMessage("Dopytanie"), assistantMessage("Pierwsze słowa odpowiedzi")], status: "streaming" });
    renderChat();

    expect(screen.queryByRole("status", { name: "Asystent przygotowuje odpowiedź" })).not.toBeInTheDocument();
  });

  it("shows a retry under the last user message and retries without resending it", async () => {
    setChatState({ messages: [firstMessage, userMessage("Dopytanie")], status: "error", error: new Error("failed") });
    renderChat();

    const error = screen.getByText(pl.errors.chatSend);
    const lastUserMessage = screen.getByText("Dopytanie");
    expect(lastUserMessage.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Wiadomość" }), { target: { value: "Nowe pytanie" } });
    expect(screen.getByRole("button", { name: pl.chat.send })).toBeDisabled();
    await userEvent.setup().click(screen.getByRole("button", { name: pl.chat.retry }));
    expect(chatMocks.regenerate).toHaveBeenCalledTimes(1);
    expect(chatMocks.sendMessage).not.toHaveBeenCalled();
    expect(screen.getAllByText("Dopytanie")).toHaveLength(1);
  });

  it("detects an expired case from the 404 response body and disables input", async () => {
    renderChat();
    const transport = chatMocks.useChat.mock.calls[0]?.[0].transport;
    const originalFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "case_not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", originalFetch);

    await act(async () => {
      await transport.fetch("/api/chat", { method: "POST" });
    });

    expect(await screen.findByText(pl.errors.caseExpired)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Wiadomość" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: pl.chat.newCase }).length).toBeGreaterThan(0);
  });

  it("does not show the generic send error or retry when the case expired (Q4.7)", async () => {
    setChatState({ messages: [firstMessage, userMessage("Dopytanie")], status: "error", error: new Error("404") });
    renderChat();
    expect(screen.getByText(pl.errors.chatSend)).toBeInTheDocument();
    const transport = chatMocks.useChat.mock.calls[0]?.[0].transport;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "case_not_found" }), { status: 404, headers: { "Content-Type": "application/json" } })),
    );

    await act(async () => {
      await transport.fetch("/api/chat", { method: "POST" });
    });

    expect(await screen.findByText(pl.errors.caseExpired)).toBeInTheDocument();
    expect(screen.queryByText(pl.errors.chatSend)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: pl.chat.retry })).not.toBeInTheDocument();
  });

  it("keeps the message list usable on small screens (Q4.6)", () => {
    const { container } = renderChat();

    const scroller = screen.getByTestId("chat-message-scroller");
    expect(scroller.className).toContain("min-h-[14rem]");
    expect(container.querySelector("main")?.className).toContain("gap-2");
    expect(screen.getByText(pl.chat.ui.messageLabel, { selector: "label" }).className).toContain("sr-only");
    expect(screen.getByRole("textbox", { name: "Wiadomość" })).toHaveAttribute("rows", "1");
  });

  it("collapses the case summary by default below 768 pixels", () => {
    renderChat();

    expect(screen.getByRole("button", { name: "Szczegóły sprawy" })).toHaveAttribute("aria-expanded", "false");
  });

  it("renders no attachment control", () => {
    const { container } = renderChat();

    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /załącz|zdjęcie/i })).not.toBeInTheDocument();
  });

  it("asks before starting a new case and only confirms the reset when accepted", async () => {
    const user = userEvent.setup();
    const onNewCase = vi.fn();
    renderChat({ onNewCase });

    await user.click(screen.getByRole("button", { name: pl.chat.newCase }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(pl.chat.newCaseConfirm)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: pl.common.cancel }));
    expect(onNewCase).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: pl.chat.newCase }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: pl.chat.newCase }));
    expect(onNewCase).toHaveBeenCalledTimes(1);
  });

  it("renders the case summary, disclaimer, case type, and decision badge accessibly", async () => {
    renderChat();
    await userEvent.setup().click(screen.getByRole("button", { name: "Szczegóły sprawy" }));

    expect(screen.getAllByText("Reklamacja")).toHaveLength(2);
    expect(screen.getByText("Lenovo ThinkPad T14")).toBeInTheDocument();
    expect(screen.getByText(pl.disclaimer)).toHaveClass("text-muted-foreground");
    expect(screen.getByRole("img", { name: `Decyzja: ${pl.decisions.accepted}` })).toBeInTheDocument();
  });

  it("keeps the input and send button disabled while streaming", () => {
    setChatState({ status: "streaming", messages: [firstMessage, userMessage("Wiadomość")] });
    renderChat();
    fireEvent.change(screen.getByRole("textbox", { name: "Wiadomość" }), { target: { value: "Nowa treść" } });

    expect(screen.getByRole("textbox", { name: "Wiadomość" })).toBeDisabled();
    expect(screen.getByRole("button", { name: pl.chat.send })).toBeDisabled();
  });

  it("shows the scroll-to-latest control pattern alongside the message scroller", () => {
    renderChat();

    expect(screen.getByTestId("chat-message-scroller")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Przewiń do najnowszej wiadomości" })).toBeInTheDocument();
  });

  it("shows the corrected purchase date and channel from the latest data-decision", async () => {
    setChatState({
      messages: [
        firstMessage,
        {
          ...assistantMessage("Zmieniona ocena.", "accepted"),
          parts: [
            { type: "data-decision", id: "d1", data: { decision: "accepted", previous: "rejected", corrections: { purchaseDate: "2026-11-10", channel: "store" } } },
            { type: "text", text: "Zmieniona ocena." },
          ],
        },
      ],
    });
    renderChat();
    await userEvent.setup().click(screen.getByRole("button", { name: "Szczegóły sprawy" }));

    expect(screen.getByText("10.11.2026")).toBeInTheDocument();
    expect(screen.queryByText("01.11.2026")).not.toBeInTheDocument();
    expect(screen.getByText(pl.form.channel.store)).toBeInTheDocument();
    expect(screen.queryByText(pl.form.channel.online)).not.toBeInTheDocument();
  });

  it("asks for confirmation before resetting an expired case", async () => {
    const onNewCase = vi.fn();
    renderChat({ onNewCase });
    const transport = chatMocks.useChat.mock.calls[0]?.[0].transport;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "case_not_found" }), { status: 404, headers: { "Content-Type": "application/json" } })),
    );
    await act(async () => {
      await transport.fetch("/api/chat", { method: "POST" });
    });
    await screen.findByText(pl.errors.caseExpired);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: pl.chat.newCase }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(pl.chat.newCaseConfirm)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: pl.common.cancel }));
    expect(onNewCase).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: pl.chat.newCase }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: pl.chat.newCase }));
    expect(onNewCase).toHaveBeenCalledTimes(1);
  });

  it("does not render an assistant message without visible text", () => {
    setChatState({
      messages: [firstMessage, userMessage("Dopytanie"), { id: "assistant-empty", role: "assistant", parts: [] }],
      status: "submitted",
    });
    const { container } = renderChat();

    expect(container.querySelector('[data-message-id="assistant-empty"]')).toBeNull();
    expect(screen.getByRole("status", { name: "Asystent przygotowuje odpowiedź" })).toBeInTheDocument();
  });

  it("bounds the chat column to the viewport so only the message list scrolls", () => {
    const { container } = renderChat();

    expect(container.querySelector("main")?.className).toMatch(/h-\[calc\(100dvh-/);
    expect(screen.getByTestId("chat-message-scroller").className).toContain("flex-1");
  });
});
