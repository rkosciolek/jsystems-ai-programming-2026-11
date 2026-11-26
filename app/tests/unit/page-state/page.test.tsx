// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { ValidationError, submitCase } from "@/lib/client/submit-case";
import type { CaseEvent } from "@/lib/domain";
import { pl } from "@/lib/i18n/pl";

// CaseForm is owned by another task and is replaced here by a stub that exposes the props the page uses.
vi.mock("@/components/case-form", () => {
  type StubProps = {
    serviceError?: boolean;
    serverFieldErrors?: Record<string, string>;
    onSubmit(draft: unknown): void;
    onRetry?(draft: unknown): void;
  };
  const draft = {
    caseType: "complaint",
    category: "laptop",
    model: "Lenovo ThinkPad T14",
    purchaseDate: "2026-11-01",
    channel: "online",
    description: "Ekran nie działa po upadku.",
    photo: new File([new Uint8Array([0xff, 0xd8])], "laptop.jpg", { type: "image/jpeg" }),
  };
  return {
    emptyDraft: () => ({ model: "", purchaseDate: "", description: "" }),
    MAX_PHOTO_BYTES: 10 * 1024 * 1024,
    CaseForm: (props: StubProps) => (
      <div
        data-testid="case-form"
        data-service-error={String(props.serviceError ?? false)}
        data-field-errors={JSON.stringify(props.serverFieldErrors ?? {})}
      >
        <button type="button" onClick={() => props.onSubmit(draft)}>stub-submit</button>
        <button type="button" onClick={() => props.onRetry?.(draft)}>stub-retry</button>
      </div>
    ),
  };
});

vi.mock("@/lib/client/submit-case", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/client/submit-case")>()),
  submitCase: vi.fn(),
}));

const caseId = "HSD-20261125-AB12";

const resultEvent: CaseEvent = {
  type: "result",
  caseId,
  decision: "accepted",
  firstMessage: {
    id: "msg-1",
    role: "assistant",
    parts: [{ type: "text", text: "Dzień dobry, wstępnie zaakceptowano." }],
    metadata: { decision: "accepted" },
  },
  caseSummary: {
    caseType: "complaint",
    category: "laptop",
    model: "Lenovo ThinkPad T14",
    purchaseDate: "2026-11-01",
    channel: "online",
  },
};

async function* events(...items: CaseEvent[]): AsyncIterable<CaseEvent> {
  for (const item of items) yield item;
}

const mockedSubmit = vi.mocked(submitCase);

function caseForm() {
  return screen.queryByTestId("case-form");
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:page-thumb");
  URL.revokeObjectURL = vi.fn();
  mockedSubmit.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Home page state wiring", () => {
  it("shows the form title and intro above the form", () => {
    mockedSubmit.mockImplementation(() => events());
    render(<Home />);
    expect(screen.getByRole("heading", { name: pl.form.title })).toBeInTheDocument();
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: pl.form.title }));
    expect(screen.getByText(pl.form.intro)).toBeInTheDocument();
    expect(caseForm()).not.toBeNull();
  });

  it("shows the progress screen synchronously on a valid submit, before the first event (AC-16)", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockedSubmit.mockImplementation(async function* () {
      await gate;
      yield { type: "progress", step: "upload" };
    });
    render(<Home />);

    await user.click(screen.getByText("stub-submit"));

    expect(mockedSubmit).toHaveBeenCalledTimes(1);
    expect(caseForm()).toBeNull();
    expect(screen.getByText(pl.progress.upload)).toBeInTheDocument();
    expect(screen.getByRole("main")).toContainElement(screen.getByText(pl.progress.upload));
    release();
    await waitFor(() => expect(screen.getByText(pl.progress.upload).closest("li")).toHaveAttribute("data-status", "done"));
  });

  it("moves through progress to the chat view on result", async () => {
    const user = userEvent.setup();
    mockedSubmit.mockImplementation(() =>
      events(
        { type: "progress", step: "upload" },
        { type: "progress", step: "analysis" },
        { type: "progress", step: "decision" },
        resultEvent,
      ),
    );
    render(<Home />);

    await user.click(screen.getByText("stub-submit"));

    expect(await screen.findByText(caseId)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: `Decyzja: ${pl.decisions.accepted}` })).toBeInTheDocument();
    expect(screen.getByText("Dzień dobry, wstępnie zaakceptowano.")).toBeInTheDocument();
    expect(screen.getByRole("main")).toContainElement(screen.getByText("Dzień dobry, wstępnie zaakceptowano."));
    expect(caseForm()).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("returns to the form with the banner on a service error event", async () => {
    const user = userEvent.setup();
    mockedSubmit.mockImplementation(() => events({ type: "error", code: "upstream" }));
    render(<Home />);

    await user.click(screen.getByText("stub-submit"));

    await waitFor(() => expect(caseForm()).toHaveAttribute("data-service-error", "true"));
    expect(caseForm()).toHaveAttribute("data-field-errors", "{}");
  });

  it("returns to the form with the banner when the network request fails", async () => {
    const user = userEvent.setup();
    mockedSubmit.mockImplementation(() => {
      throw new TypeError("fetch failed");
    });
    render(<Home />);

    await user.click(screen.getByText("stub-submit"));

    await waitFor(() => expect(caseForm()).toHaveAttribute("data-service-error", "true"));
  });

  it("returns to the form with field errors and no banner on ValidationError", async () => {
    const user = userEvent.setup();
    const fields = { model: "Podaj nazwę lub model urządzenia (2–100 znaków)." };
    mockedSubmit.mockImplementation(async function* () {
      throw new ValidationError(400, fields);
    });
    render(<Home />);

    await user.click(screen.getByText("stub-submit"));

    await waitFor(() => expect(caseForm()).toHaveAttribute("data-field-errors", JSON.stringify(fields)));
    expect(caseForm()).toHaveAttribute("data-service-error", "false");
  });

  it("resubmits the kept draft from the banner's retry", async () => {
    const user = userEvent.setup();
    mockedSubmit.mockImplementationOnce(() => events({ type: "error", code: "timeout" }));
    mockedSubmit.mockImplementationOnce(() => events(resultEvent));
    render(<Home />);

    await user.click(screen.getByText("stub-submit"));
    await waitFor(() => expect(caseForm()).toHaveAttribute("data-service-error", "true"));
    await user.click(screen.getByText("stub-retry"));

    expect(mockedSubmit).toHaveBeenCalledTimes(2);
    const draftOnRetry = mockedSubmit.mock.calls[1]?.[0];
    expect(draftOnRetry).toMatchObject({ model: "Lenovo ThinkPad T14" });
    expect(await screen.findByText(caseId)).toBeInTheDocument();
  });

  it("returns to the form after the 95 s client timeout aborts the request", async () => {
    vi.useFakeTimers();
    let seenSignal: AbortSignal | undefined;
    mockedSubmit.mockImplementation(async function* (_draft, signal) {
      seenSignal = signal;
      await new Promise<never>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
      yield { type: "error", code: "timeout" };
    });
    render(<Home />);

    fireEvent.click(screen.getByText("stub-submit"));
    await act(async () => {
      vi.advanceTimersByTime(94_999);
    });
    expect(seenSignal?.aborted).toBe(false);
    expect(caseForm()).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(seenSignal?.aborted).toBe(true);
    expect(caseForm()).toHaveAttribute("data-service-error", "true");
  });

  it("starts a new case from the chat, revoking the thumbnail and returning to an empty form", async () => {
    const user = userEvent.setup();
    mockedSubmit.mockImplementation(() => events(resultEvent));
    render(<Home />);

    await user.click(screen.getByText("stub-submit"));
    await screen.findByText(caseId);
    await user.click(screen.getByRole("button", { name: pl.chat.newCase }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: pl.chat.newCase }));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:page-thumb");
    expect(caseForm()).toHaveAttribute("data-service-error", "false");
    expect(caseForm()).toHaveAttribute("data-field-errors", "{}");
  });

  it("registers the beforeunload guard only while the chat is shown", async () => {
    const user = userEvent.setup();
    mockedSubmit.mockImplementation(() => events(resultEvent));
    render(<Home />);

    const formEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(formEvent);
    expect(formEvent.defaultPrevented).toBe(false);

    await user.click(screen.getByText("stub-submit"));
    await screen.findByText(caseId);

    const chatEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(chatEvent);
    expect(chatEvent.defaultPrevented).toBe(true);

    await user.click(screen.getByRole("button", { name: pl.chat.newCase }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: pl.chat.newCase }));

    const afterReset = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(afterReset);
    expect(afterReset.defaultPrevented).toBe(false);
  });
});
