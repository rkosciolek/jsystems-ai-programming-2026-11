// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisProgress } from "@/components/progress";
import type { Draft } from "@/components/case-form";
import { pl } from "@/lib/i18n/pl";

const draft: Draft = {
  caseType: "return",
  category: "smartphone",
  model: "Samsung Galaxy A54",
  purchaseDate: "2026-11-01",
  channel: "store",
  description: "",
  photo: new File([new Uint8Array([0xff, 0xd8])], "phone.jpg", { type: "image/jpeg" }),
};

const THUMB = "blob:progress-thumb";

function statusOf(label: string): string | null {
  return screen.getByText(label).closest("li")?.getAttribute("data-status") ?? null;
}

describe("AnalysisProgress", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => THUMB);
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows the three steps, the first one active, when nothing is completed", () => {
    render(<AnalysisProgress draft={draft} completedSteps={[]} thumbnailUrl={THUMB} />);
    expect(statusOf(pl.progress.upload)).toBe("active");
    expect(statusOf(pl.progress.analysis)).toBe("pending");
    expect(statusOf(pl.progress.decision)).toBe("pending");
  });

  it("marks completed steps as done and the next step as active", () => {
    render(<AnalysisProgress draft={draft} completedSteps={["upload"]} thumbnailUrl={THUMB} />);
    expect(statusOf(pl.progress.upload)).toBe("done");
    expect(statusOf(pl.progress.analysis)).toBe("active");
    expect(statusOf(pl.progress.decision)).toBe("pending");
  });

  it("has no active step once every step is done", () => {
    render(<AnalysisProgress draft={draft} completedSteps={["upload", "analysis", "decision"]} thumbnailUrl={THUMB} />);
    expect([pl.progress.upload, pl.progress.analysis, pl.progress.decision].map(statusOf)).toEqual([
      "done",
      "done",
      "done",
    ]);
  });

  it("announces step changes politely", () => {
    render(<AnalysisProgress draft={draft} completedSteps={[]} thumbnailUrl={THUMB} />);
    const list = screen.getByText(pl.progress.upload).closest("ol");
    expect(list).not.toBeNull();
    expect(list).toHaveAttribute("aria-live", "polite");
  });

  it("renders the done step with a check icon and the active step with a spinner", () => {
    const { container } = render(<AnalysisProgress draft={draft} completedSteps={["upload"]} thumbnailUrl={THUMB} />);
    const doneItem = screen.getByText(pl.progress.upload).closest("li") as HTMLElement;
    const activeItem = screen.getByText(pl.progress.analysis).closest("li") as HTMLElement;
    expect(doneItem.querySelector("svg")).not.toBeNull();
    expect(activeItem.querySelector("svg.animate-spin")).not.toBeNull();
    expect(container.querySelectorAll("li")).toHaveLength(3);
  });

  it("shows a read-only summary with the case type, category label, model and thumbnail", () => {
    render(<AnalysisProgress draft={draft} completedSteps={[]} thumbnailUrl={THUMB} />);
    const summary = screen.getByTestId("progress-summary");
    expect(within(summary).getByText(pl.form.caseType.return.label)).toBeInTheDocument();
    expect(within(summary).getByText("Smartfon")).toBeInTheDocument();
    expect(within(summary).getByText("Samsung Galaxy A54")).toBeInTheDocument();
    const thumb = summary.querySelector("img");
    expect(thumb).not.toBeNull();
    expect(thumb?.getAttribute("src")).toContain(THUMB);
  });

  it("has no cancel or any other button", () => {
    render(<AnalysisProgress draft={draft} completedSteps={["upload"]} thumbnailUrl={THUMB} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("does not create or revoke object URLs itself (the page owns the thumbnail)", () => {
    const { unmount } = render(<AnalysisProgress draft={draft} completedSteps={[]} thumbnailUrl={THUMB} />);
    unmount();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("omits the thumbnail when no URL is given", () => {
    render(<AnalysisProgress draft={draft} completedSteps={[]} thumbnailUrl="" />);
    expect(screen.getByTestId("progress-summary").querySelector("img")).toBeNull();
  });
});
