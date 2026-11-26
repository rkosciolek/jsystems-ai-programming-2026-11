// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseUIMessage } from "@/lib/domain";
import { pl } from "@/lib/i18n/pl";
import { isNearBottom } from "@/components/chat/scroll";

const chatMocks = vi.hoisted(() => ({ useChat: vi.fn() }));
vi.mock("@ai-sdk/react", () => ({ useChat: chatMocks.useChat }));

import { ChatView } from "@/components/chat";

const first: CaseUIMessage = {
  id: "a1",
  role: "assistant",
  parts: [{ type: "text", text: `Dzień dobry.\n\n${pl.disclaimer}` }],
  metadata: { decision: "accepted" },
};
const user: CaseUIMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "Pytanie" }] };
const reply: CaseUIMessage = {
  id: "a2",
  role: "assistant",
  parts: [{ type: "text", text: "Odpowiedź" }],
  metadata: { decision: "accepted" },
};

function setChat(messages: CaseUIMessage[], status: "ready" | "submitted" = "ready") {
  chatMocks.useChat.mockReturnValue({ messages, status, error: undefined, sendMessage: vi.fn(), regenerate: vi.fn() });
}

function ui() {
  return (
    <ChatView
      caseId="HSD-1"
      caseSummary={{ caseType: "return", category: "laptop", model: "X1", purchaseDate: "2026-11-06", channel: "online" }}
      thumbnailUrl=""
      firstMessage={first}
      onNewCase={vi.fn()}
    />
  );
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  HTMLElement.prototype.scrollTo = vi.fn();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as never;
});
afterEach(() => cleanup());

describe("Q5.1 scroll decision", () => {
  it("isNearBottom uses a threshold", () => {
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 600, clientHeight: 400 })).toBe(true);
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 570, clientHeight: 400 })).toBe(true);
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 300, clientHeight: 400 })).toBe(false);
  });

  it("does not anchor (scroll to) a reply when the user scrolled up", () => {
    setChat([first, user], "submitted");
    const { rerender } = render(ui());
    const viewport = screen.getByRole("region", { name: pl.chat.ui.conversation });
    Object.defineProperty(viewport, "scrollHeight", { configurable: true, value: 2000 });
    Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 400 });
    viewport.scrollTop = 500;
    fireEvent.scroll(viewport);
    setChat([first, user, reply]);
    rerender(ui());
    const item = document.querySelector('[data-message-id="a2"]');
    expect(item?.getAttribute("data-scroll-anchor")).toBe("false");
  });

  it("anchors the reply when the user is at the bottom", () => {
    setChat([first, user], "submitted");
    const { rerender } = render(ui());
    const viewport = screen.getByRole("region", { name: pl.chat.ui.conversation });
    Object.defineProperty(viewport, "scrollHeight", { configurable: true, value: 1000 });
    Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 400 });
    viewport.scrollTop = 600;
    fireEvent.scroll(viewport);
    setChat([first, user, reply]);
    rerender(ui());
    expect(document.querySelector('[data-message-id="a2"]')?.getAttribute("data-scroll-anchor")).toBe("true");
  });
});

describe("Q5.2 first view starts at the top", () => {
  it("does not default-scroll to the end of the first message", () => {
    setChat([first]);
    render(ui());
    const viewport = screen.getByRole("region", { name: pl.chat.ui.conversation });
    expect(viewport.scrollTop).toBe(0);
    expect(document.querySelector('[data-message-id="a1"]')?.getAttribute("data-scroll-anchor")).toBe("false");
    expect(document.querySelector("[data-pending-scroll]")).toBeNull();
  });
});

describe("Q5.5 chat landmark", () => {
  it("keeps chat content inside a main landmark", () => {
    setChat([first]);
    render(ui());
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("log", { name: pl.chat.ui.conversation }));
  });
});

describe("Q5.3 summary date", () => {
  it("shows the purchase date as DD.MM.RRRR", () => {
    setChat([first]);
    render(ui());
    expect(screen.getByText("06.11.2026")).toBeInTheDocument();
    expect(screen.queryByText("2026-11-06")).toBeNull();
  });
});
