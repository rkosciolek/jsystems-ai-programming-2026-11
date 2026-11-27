// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaseForm, emptyDraft } from "../../../src/components/case-form";
import { clientSchema } from "../../../src/components/case-form/case-form";
import { pl } from "../../../src/lib/i18n/pl";

const photo = new File(
  [readFileSync(resolve(process.cwd(), "../assets/example-images/laptop-2.webp"))],
  "laptop-2.webp",
  { type: "image/webp" },
);

const base = {
  category: "laptop",
  model: "ThinkPad T14",
  purchaseDate: "2026-11-20",
  channel: "online",
  photo,
  aiConsent: true,
};

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;
  HTMLElement.prototype.scrollIntoView = () => undefined;
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Q2.4 client schema is a single object schema (no intersection)", () => {
  it("parses complaint and return drafts and switching type without throwing", () => {
    const complaint = { ...base, caseType: "complaint", description: "Ekran miga od tygodnia po upadku." };
    const ret = { ...base, caseType: "return", description: "" };
    expect(() => clientSchema.safeParse(complaint)).not.toThrow();
    expect(clientSchema.safeParse(complaint).success).toBe(true);
    expect(clientSchema.safeParse(ret).success).toBe(true);
    // switching type with the same short description, in both directions
    const short = { ...base, description: "krótki" };
    for (const caseType of ["complaint", "return", "complaint", undefined]) {
      expect(() => clientSchema.safeParse({ ...short, caseType })).not.toThrow();
    }
    const failed = clientSchema.safeParse({ ...short, caseType: "complaint" });
    expect(failed.success).toBe(false);
    expect(failed.error?.issues.filter((i) => i.path[0] === "description")).toHaveLength(1);
    expect(failed.error?.issues[0]?.message).toBe(pl.errors.description);
  });

  it("reports photo issues alongside field issues and trims values on success", () => {
    const missing = clientSchema.safeParse({ ...base, photo: undefined, caseType: "return", description: "" });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues.map((i) => i.path[0])).toContain("photo");
    const ok = clientSchema.safeParse({ ...base, caseType: "return", model: "  ThinkPad  ", description: "" });
    expect(ok.success && ok.data.model).toBe("ThinkPad");
  });
});

describe("Q2.1 hidden photo input is truly clipped", () => {
  it("overrides the shared w-full/h-8 so it cannot widen the page", () => {
    render(<CaseForm initialDraft={emptyDraft()} onSubmit={vi.fn()} />);
    const input = screen.getByLabelText(pl.form.labels.photo, { selector: "input", exact: false });
    expect(input).toHaveClass("sr-only", "w-px!", "h-px!");
  });
});

describe("Q2.2 field messages reserve space", () => {
  it("keeps an empty message slot under the model field so showing an error does not shift the layout", () => {
    const { container } = render(<CaseForm initialDraft={emptyDraft()} onSubmit={vi.fn()} />);
    const slot = container.querySelector('[data-field="model"] [data-slot="field-message"]');
    expect(slot).not.toBeNull();
    expect(slot).toHaveClass("min-h-5");
    expect(slot).toBeEmptyDOMElement();
  });
});

describe("Q2.3 text buttons are outlined pills", () => {
  it("renders Usuń and Spróbuj ponownie with the default (pill) variant", async () => {
    const user = userEvent.setup();
    render(<CaseForm initialDraft={{ ...emptyDraft(), photo }} serviceError onSubmit={vi.fn()} onRetry={vi.fn()} />);
    for (const name of [pl.form.removeImage, pl.form.retry]) {
      const button = screen.getByRole("button", { name });
      expect(button.className).toContain("rounded-[22px]");
      expect(button.className).toContain("border-accent");
    }
    void user;
  });
});

describe("Q4.3 purchase date lower bound", () => {
  it("sets min=2000-01-01 on the date input", () => {
    render(<CaseForm initialDraft={emptyDraft()} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(pl.form.labels.purchaseDate, { exact: false })).toHaveAttribute("min", "2000-01-01");
  });
});
