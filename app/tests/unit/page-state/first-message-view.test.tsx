// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FirstMessageView } from "@/components/first-message-view";
import { pl } from "@/lib/i18n/pl";
import type { ResultEvent } from "@/app/page-state";

function messageWith(text: string, decision: ResultEvent["decision"] = "accepted"): ResultEvent["firstMessage"] {
  return { id: "msg-1", role: "assistant", parts: [{ type: "text", text }], metadata: { decision } };
}

afterEach(() => cleanup());

describe("FirstMessageView (temporary chat view)", () => {
  it("shows the case number in the header", () => {
    render(
      <FirstMessageView caseId="HSD-20261125-AB12" decision="accepted" firstMessage={messageWith("Dzień dobry")} onNewCase={vi.fn()} />,
    );
    expect(screen.getByText("HSD-20261125-AB12")).toBeInTheDocument();
  });

  it.each([
    ["accepted", pl.decisions.accepted],
    ["rejected", pl.decisions.rejected],
    ["needs_info", pl.decisions.needs_info],
    ["escalated", pl.decisions.escalated],
  ] as const)("names the %s decision for assistive technology and shows its label", (decision, label) => {
    render(<FirstMessageView caseId="HSD-20261125-AB12" decision={decision} firstMessage={messageWith("Treść")} onNewCase={vi.fn()} />);
    const badge = screen.getByRole("img", { name: `Decyzja: ${label}` });
    expect(badge).toHaveTextContent(label);
  });

  it("renders the first message Markdown and drops raw HTML", () => {
    const { container } = render(
      <FirstMessageView
        caseId="HSD-20261125-AB12"
        decision="accepted"
        firstMessage={messageWith('**Wstępnie zaakceptowano**\n\n<img src="x" onerror="alert(1)"><script>alert(2)</script>')}
        onNewCase={vi.fn()}
      />,
    );
    const article = container.querySelector("article");
    expect(article).not.toBeNull();
    expect(article?.textContent).toContain("Wstępnie zaakceptowano");
    expect(article?.textContent).not.toContain("**");
    expect(article?.querySelector("img")).toBeNull();
    expect(article?.querySelector("script")).toBeNull();
  });

  it("asks for confirmation before starting a new case, and resets only on confirm", async () => {
    const user = userEvent.setup();
    const onNewCase = vi.fn();
    render(<FirstMessageView caseId="HSD-20261125-AB12" decision="accepted" firstMessage={messageWith("Treść")} onNewCase={onNewCase} />);

    await user.click(screen.getByRole("button", { name: pl.chat.newCase }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(pl.chat.newCaseConfirm)).toBeInTheDocument();
    expect(onNewCase).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: pl.chat.newCase }));
    expect(onNewCase).toHaveBeenCalledTimes(1);
  }, 15_000); // Radix dialog + user-event is slow when other workers load the machine
});
