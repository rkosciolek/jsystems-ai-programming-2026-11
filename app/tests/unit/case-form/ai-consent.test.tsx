// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaseForm, emptyDraft } from "../../../src/components/case-form";
import { CATEGORIES } from "../../../src/lib/domain";
import { pl } from "../../../src/lib/i18n/pl";

const realPhoto = () =>
  new File(
    [readFileSync(resolve(process.cwd(), "../assets/example-images/laptop-2.webp"))],
    "laptop-2.webp",
    { type: "image/webp" },
  );

function setup() {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<CaseForm initialDraft={emptyDraft()} onSubmit={onSubmit} onRetry={vi.fn()} />);
  return { user, onSubmit };
}

async function fillFormExceptConsent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: pl.form.caseType.complaint.label }));
  await user.click(screen.getByLabelText(pl.form.labels.category, { exact: false }));
  await user.click(await screen.findByRole("option", { name: CATEGORIES[0].label }));
  await user.type(screen.getByLabelText(pl.form.labels.model, { exact: false }), "ThinkPad T14");
  await user.type(screen.getByLabelText(pl.form.labels.purchaseDate, { exact: false }), "2026-11-20");
  await user.click(screen.getByRole("radio", { name: pl.form.channel.online }));
  await user.type(
    screen.getByLabelText(pl.form.labels.complaintDescription, { exact: false }),
    "Ekran miga od tygodnia po upadku.",
  );
  await user.upload(screen.getByLabelText(pl.form.labels.photo, { selector: "input", exact: false }), realPhoto());
}

const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const consentCheckbox = () => screen.getByRole("checkbox", { name: pl.form.labels.aiConsent });

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
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AC-54 AI consent checkbox", () => {
  it("renders an unchecked native checkbox after Photo with the PRD text", () => {
    const { container } = render(<CaseForm initialDraft={emptyDraft()} onSubmit={vi.fn()} />);
    const fields = Array.from(container.querySelectorAll("form [data-field]")).map((field) => field.getAttribute("data-field"));
    expect(fields.slice(-2)).toEqual(["photo", "aiConsent"]);
    const checkbox = consentCheckbox();
    expect(checkbox).toHaveAttribute("type", "checkbox");
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveClass("size-6");
    expect(pl.form.labels.aiConsent).toBe(
      "Wyrażam zgodę na analizę podanych informacji i zdjęcia przez sztuczną inteligencję (AI). (wymagane)",
    );
  });

  it("shows the consent error under the checkbox and focuses it when it is the only invalid field", async () => {
    const { user, onSubmit } = setup();
    await fillFormExceptConsent(user);
    await user.click(screen.getByRole("button", { name: pl.form.submit }));
    expect(await screen.findByText(pl.errors.aiConsent)).toBeInTheDocument();
    await waitFor(() => expect(consentCheckbox()).toHaveFocus());
    expect(consentCheckbox()).toHaveAttribute("aria-invalid", "true");
    expect(consentCheckbox()).toHaveAttribute("aria-describedby", "aiConsent-error");
    expect(onSubmit).not.toHaveBeenCalled();
  }, 20_000);

  it("shows the consent error together with the other field errors on submit", async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole("button", { name: pl.form.submit }));
    expect(await screen.findByText(pl.errors.caseTypeRequired)).toBeInTheDocument();
    expect(screen.getByText(pl.errors.aiConsent)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits when the consent is ticked and includes it in the draft", async () => {
    const { user, onSubmit } = setup();
    await fillFormExceptConsent(user);
    await user.click(consentCheckbox());
    expect(consentCheckbox()).toBeChecked();
    await user.click(screen.getByRole("button", { name: pl.form.submit }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ aiConsent: true }));
  }, 20_000);

  it("is operable from the keyboard with Space", async () => {
    const { user } = setup();
    consentCheckbox().focus();
    await user.keyboard(" ");
    expect(consentCheckbox()).toBeChecked();
  });
});

describe("AC-53 required markers on labels", () => {
  it("appends the required marker to every required label and keeps the return description optional", async () => {
    const { user } = setup();
    for (const label of [pl.form.labels.caseType, pl.form.labels.category, pl.form.labels.model, pl.form.labels.purchaseDate, pl.form.labels.channel, pl.form.labels.photo]) {
      expect(screen.getAllByText(label, { exact: false }).length).toBeGreaterThan(0);
    }
    expect(screen.getByLabelText(pl.form.labels.category, { exact: false })).toHaveAccessibleName(
      new RegExp(`${pl.form.labels.category}.*${escapeRe(pl.form.labels.requiredMarker)}$`),
    );
    expect(screen.getByLabelText(pl.form.labels.model, { exact: false })).toHaveAccessibleName(
      new RegExp(`${pl.form.labels.model}.*${escapeRe(pl.form.labels.requiredMarker)}$`),
    );
    expect(screen.getByLabelText(pl.form.labels.purchaseDate, { exact: false })).toHaveAccessibleName(
      new RegExp(`${pl.form.labels.purchaseDate}.*${escapeRe(pl.form.labels.requiredMarker)}$`),
    );
    expect(screen.getByLabelText(pl.form.labels.complaintDescription, { exact: false })).toHaveAccessibleName(
      new RegExp(`${pl.form.labels.complaintDescription}.*${escapeRe(pl.form.labels.requiredMarker)}$`),
    );
    expect(screen.getByRole("radiogroup", { name: new RegExp(`${pl.form.labels.caseType}.*${escapeRe(pl.form.labels.requiredMarker)}$`) })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: new RegExp(`${pl.form.labels.channel}.*${escapeRe(pl.form.labels.requiredMarker)}$`) })).toBeInTheDocument();
    expect(screen.getByLabelText(pl.form.labels.photo, { selector: "input", exact: false })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: pl.form.caseType.return.label }));
    expect(screen.getByLabelText(pl.form.labels.returnDescription, { exact: false })).toHaveAccessibleName(
      new RegExp(`${pl.form.labels.returnDescription}.*${escapeRe(pl.form.optional)}$`),
    );
  });
});
