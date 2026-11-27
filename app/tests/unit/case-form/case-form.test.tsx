// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaseForm, emptyDraft, MAX_PHOTO_BYTES } from "../../../src/components/case-form";
import { CATEGORIES, todayInWarsaw } from "../../../src/lib/domain";
import { pl } from "../../../src/lib/i18n/pl";

const imagePath = (name: string) => resolve(process.cwd(), "../assets/example-images", name);
const realPhoto = (name = "laptop-2.webp") => {
  const type = name.endsWith("webp") ? "image/webp" : name.endsWith("png") ? "image/png" : "image/jpeg";
  return new File([readFileSync(imagePath(name))], name, { type });
};

function setup(props: Partial<React.ComponentProps<typeof CaseForm>> = {}) {
  const onSubmit = vi.fn();
  const onRetry = vi.fn();
  const user = userEvent.setup();
  const result = render(
    <CaseForm initialDraft={emptyDraft()} onSubmit={onSubmit} onRetry={onRetry} {...props} />,
  );
  return { ...result, user, onSubmit, onRetry };
}

async function chooseCategory(user: ReturnType<typeof userEvent.setup>, label = CATEGORIES[0].label) {
  await user.click(screen.getByLabelText(pl.form.labels.category, { exact: false }));
  await user.click(await screen.findByRole("option", { name: label }));
}

function descriptionField(type: "complaint" | "return" = "complaint") {
  const label = type === "complaint"
    ? pl.form.labels.complaintDescription
    : pl.form.labels.returnDescription;
  return screen.getByLabelText(label, { exact: false });
}

async function chooseCaseType(user: ReturnType<typeof userEvent.setup>, type: "complaint" | "return" = "complaint") {
  await user.click(screen.getByRole("radio", { name: pl.form.caseType[type].label }));
}

async function fillValidForm(
  user: ReturnType<typeof userEvent.setup>,
  { type = "complaint", description = "Ekran miga od tygodnia po upadku." }: { type?: "complaint" | "return"; description?: string } = {},
) {
  await chooseCaseType(user, type);
  await chooseCategory(user);
  await user.type(screen.getByLabelText(pl.form.labels.model, { exact: false }), "ThinkPad T14");
  await user.type(screen.getByLabelText(pl.form.labels.purchaseDate, { exact: false }), "2026-11-20");
  await user.click(screen.getByRole("radio", { name: pl.form.channel.online }));
  if (description) {
    await user.type(
      descriptionField(type),
      description,
    );
  }
  await user.upload(screen.getByLabelText(pl.form.labels.photo, { selector: "input", exact: false }), realPhoto());
  await user.click(screen.getByRole("checkbox", { name: pl.form.labels.aiConsent }));
}

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

describe("CaseForm form structure and initial state", () => {
  it("renders the eight fields in PRD order with no preselected choice", () => {
    const { container } = setup();
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(Array.from(form!.querySelectorAll("[data-field]")).map((field) => field.getAttribute("data-field"))).toEqual([
      "caseType", "category", "model", "purchaseDate", "channel", "description", "photo", "aiConsent",
    ]);
    expect(screen.queryByRole("heading", { name: pl.form.title })).not.toBeInTheDocument();
    expect(screen.queryByText(pl.form.intro)).not.toBeInTheDocument();
    expect(screen.getByText(pl.form.labels.caseType, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: new RegExp(pl.form.labels.caseType) })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: pl.form.caseType.complaint.label })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: pl.form.caseType.return.label })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: pl.form.channel.online })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: pl.form.channel.store })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByLabelText(pl.form.labels.category, { exact: false })).toHaveAttribute("data-placeholder");
    expect(screen.getByText(pl.form.labels.categoryPlaceholder)).toBeInTheDocument();
  });

  it("shows both case-type tiles with their subtitles and all ten categories", async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByText(pl.form.caseType.complaint.subtitle)).toBeInTheDocument();
    expect(screen.getByText(pl.form.caseType.return.subtitle)).toBeInTheDocument();
    await user.click(screen.getByLabelText(pl.form.labels.category, { exact: false }));
    for (const category of CATEGORIES) {
      expect(await screen.findByRole("option", { name: category.label })).toBeInTheDocument();
    }
  });

  it("shows the two purchase channels and a date input capped at today in Warsaw", () => {
    setup();
    expect(screen.getByRole("radio", { name: pl.form.channel.online })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: pl.form.channel.store })).toBeInTheDocument();
    expect(screen.getByLabelText(pl.form.labels.purchaseDate, { exact: false })).toHaveAttribute("type", "date");
    expect(screen.getByLabelText(pl.form.labels.purchaseDate, { exact: false })).toHaveAttribute("max", todayInWarsaw());
  });
});

describe("CaseForm validation", () => {
  it("shows every required field error on submit, focuses the first invalid field, and does not submit", async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole("button", { name: pl.form.submit }));
    expect(await screen.findByText(pl.errors.caseTypeRequired)).toBeInTheDocument();
    await chooseCaseType(user, "complaint");
    await user.click(screen.getByRole("button", { name: pl.form.submit }));
    expect(screen.getByText(pl.errors.categoryRequired, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(pl.errors.model)).toBeInTheDocument();
    expect(screen.getByText(pl.errors.purchaseDateInvalid, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(pl.errors.channelRequired, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(pl.errors.description)).toBeInTheDocument();
    expect(screen.getByText(pl.errors.imageRequired)).toBeInTheDocument();
    expect(screen.getByText(pl.errors.aiConsent)).toBeInTheDocument();
    expect(screen.getByText(pl.form.summary)).toBeInTheDocument();
    expect(screen.getByLabelText(pl.form.labels.category, { exact: false })).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
    for (const control of [
      screen.getByLabelText(pl.form.labels.category, { exact: false }),
      screen.getByLabelText(pl.form.labels.model, { exact: false }),
      screen.getByLabelText(pl.form.labels.purchaseDate, { exact: false }),
      screen.getByRole("radio", { name: pl.form.channel.online }),
      descriptionField(),
    ]) {
      expect(control).toHaveAttribute("aria-invalid", "true");
      expect(control).toHaveAttribute("aria-describedby");
    }
  });

  it("validates the model after trimming and accepts 2 through 100 characters", async () => {
    const { user } = setup();
    const model = screen.getByLabelText(pl.form.labels.model, { exact: false });
    await user.type(model, " a ");
    await user.tab();
    expect(await screen.findByText(pl.errors.model)).toBeInTheDocument();
    await user.clear(model);
    await user.type(model, "x".repeat(100));
    await user.tab();
    expect(screen.queryByText(pl.errors.model)).not.toBeInTheDocument();
    expect(model).toHaveAttribute("aria-invalid", "false");
    fireEvent.change(model, { target: { value: "x".repeat(101) } });
    fireEvent.blur(model);
    expect(await screen.findByText(pl.errors.model)).toBeInTheDocument();
  }, 20_000);

  it("rejects a future purchase date with the exact AC-05 message", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(pl.form.labels.purchaseDate, { exact: false }), "2999-01-01");
    await user.tab();
    expect(await screen.findByText(pl.errors.purchaseDateFuture)).toBeInTheDocument();
  });

  it("requires at least 20 complaint description characters and enforces the 2000-character maximum", async () => {
    const { user } = setup();
    await chooseCaseType(user, "complaint");
    const description = descriptionField();
    expect(description).toHaveAttribute("aria-required", "true");
    expect(screen.getAllByText(pl.form.labels.requiredMarker).length).toBeGreaterThan(0);
    expect(description.closest("div[data-field]")?.querySelector("label")).toHaveTextContent(pl.form.labels.requiredMarker);
    await user.type(description, "x".repeat(19));
    await user.tab();
    expect(await screen.findByText(pl.errors.description)).toBeInTheDocument();
    expect(screen.getByText("19 / 2000")).toBeInTheDocument();
    await user.clear(description);
    await user.type(description, "x".repeat(20));
    await user.tab();
    expect(screen.queryByText(pl.errors.description)).not.toBeInTheDocument();
    await user.clear(description);
    fireEvent.change(description, { target: { value: "x".repeat(2000) } });
    expect(screen.getByText("2000 / 2000")).toBeInTheDocument();
    fireEvent.change(description, { target: { value: "x".repeat(2001) } });
    fireEvent.blur(description);
    expect(await screen.findByText(pl.errors.description)).toBeInTheDocument();
  });

  it("keeps an empty return description optional and updates the description texts and photo hint", async () => {
    const { user } = setup();
    await chooseCaseType(user, "return");
    expect(screen.getByText(pl.form.optional)).toBeInTheDocument();
    expect(descriptionField("return")).toBeInTheDocument();
    expect(screen.getByText(pl.form.hints.returnImage)).toBeInTheDocument();
    await fillValidForm(user, { type: "return", description: "" });
    await user.click(screen.getByRole("button", { name: pl.form.submit }));
    await waitFor(() => expect(screen.getByRole("button", { name: pl.form.submit })).toBeDisabled());
  }, 20_000);

  it("does not show the complaint description error on a return-to-complaint switch until blur or submit", async () => {
    const { user } = setup();
    await chooseCaseType(user, "return");
    await chooseCaseType(user, "complaint");
    expect(screen.queryByText(pl.errors.description)).not.toBeInTheDocument();
    const description = descriptionField();
    await user.click(description);
    await user.tab();
    expect(await screen.findByText(pl.errors.description)).toBeInTheDocument();
  }, 20_000);

  it("displays the complaint photo hint when complaint is selected", async () => {
    const { user } = setup();
    await chooseCaseType(user, "complaint");
    expect(screen.getByText(pl.form.hints.complaintImage)).toBeInTheDocument();
    expect(descriptionField()).toHaveAttribute("placeholder", pl.form.placeholders.complaintDescription);
  });

  it("respects the disabled prop for all form actions and fields", () => {
    setup({ disabled: true });
    expect(screen.getByRole("button", { name: pl.form.submit })).toBeDisabled();
    expect(screen.getByLabelText(pl.form.labels.model, { exact: false })).toBeDisabled();
    expect(screen.getByLabelText(pl.form.labels.purchaseDate, { exact: false })).toBeDisabled();
    expect(screen.getByRole("radio", { name: pl.form.caseType.complaint.label })).toBeDisabled();
  });
});

describe("CaseForm photo handling", () => {
  it("uses a hidden input with the required accept list and supports selecting a real photo", async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByLabelText(pl.form.labels.photo, { selector: "input", exact: false }) as HTMLInputElement;
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    expect(input).toHaveClass("sr-only");
    expect(screen.getByText(pl.form.labels.dropzone)).toBeInTheDocument();
    expect(screen.getByText(pl.form.chooseImage)).toBeInTheDocument();
    await user.upload(input, realPhoto("laptop-1.png"));
    expect(await screen.findByAltText("laptop-1.png")).toBeInTheDocument();
    expect(screen.getByText("laptop-1.png")).toBeInTheDocument();
    expect(screen.getByText(/\d+(?:[,.]\d+)?\s(?:kB|MB)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: pl.form.removeImage })).toBeInTheDocument();
  });

  it("rejects unsupported formats and files larger than 10 MB", async () => {
    const { container } = setup();
    const input = screen.getByLabelText(pl.form.labels.photo, { selector: "input", exact: false });
    fireEvent.drop(container.querySelector("[data-drop-zone]")!, {
      dataTransfer: { files: [new File(["synthetic rejection fixture"], "bad.gif", { type: "image/gif" })] },
    });
    expect(await screen.findByText(pl.errors.imageFormat)).toBeInTheDocument();
    const user = userEvent.setup();
    expect(await screen.findByText(pl.errors.imageFormat)).toBeInTheDocument();
    await user.upload(input, new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], "oversize.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText(pl.errors.imageSize)).toBeInTheDocument();
  });

  it("accepts a real photo with an empty MIME type when its extension is supported", async () => {
    setup();
    const input = screen.getByLabelText(pl.form.labels.photo, { selector: "input", exact: false });
    const source = realPhoto("phone-1.jpg");
    const emptyTypePhoto = new File([source], source.name, { type: "" });
    fireEvent.change(input, { target: { files: [emptyTypePhoto] } });
    expect(await screen.findByText("phone-1.jpg")).toBeInTheDocument();
    expect(screen.queryByText(pl.errors.imageFormat)).not.toBeInTheDocument();
  });

  it("replaces the selected photo with a second photo, supports removing it, and renders drag-and-drop", async () => {
    const user = userEvent.setup();
    const { container } = setup();
    const input = screen.getByLabelText(pl.form.labels.photo, { selector: "input", exact: false });
    await user.upload(input, realPhoto("phone-1.jpg"));
    await user.upload(input, realPhoto("laptop-2.webp"));
    expect(await screen.findByText("laptop-2.webp")).toBeInTheDocument();
    expect(screen.queryByText("phone-1.jpg")).not.toBeInTheDocument();
    const dropZone = container.querySelector("[data-drop-zone]");
    expect(dropZone).not.toBeNull();
    fireEvent.drop(dropZone!, { dataTransfer: { files: [realPhoto("phone-3.jpeg")] } });
    expect(await screen.findByText("phone-3.jpeg")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: pl.form.removeImage }));
    expect(screen.queryByText("phone-3.jpeg")).not.toBeInTheDocument();
    expect(screen.getByLabelText(pl.form.labels.photo, { selector: "input", exact: false })).toHaveValue("");
  });

  it.each(["Enter", " "])('opens the keyboard-operated drop zone with %s', async (key) => {
    const user = userEvent.setup();
    const { container } = setup();
    const dropZone = container.querySelector("[data-drop-zone]") as HTMLElement;
    const input = screen.getByLabelText(pl.form.labels.photo, { selector: "input", exact: false }) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");
    dropZone.focus();
    await user.keyboard(key === " " ? " " : "{Enter}");
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it("revokes the photo preview object URL when replaced and on unmount", async () => {
    const createObjectURL = vi.fn().mockReturnValueOnce("blob:first").mockReturnValueOnce("blob:second");
    const revokeObjectURL = vi.fn();
    const NativeURL = globalThis.URL;
    const URLMock = Object.assign(class extends NativeURL {}, { createObjectURL, revokeObjectURL });
    vi.stubGlobal("URL", URLMock);
    const user = userEvent.setup();
    const view = setup();
    const input = screen.getByLabelText(pl.form.labels.photo, { selector: "input", exact: false });
    await user.upload(input, realPhoto("phone-1.jpg"));
    await user.upload(input, realPhoto("laptop-2.webp"));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:first");
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:second");
  });
});

describe("CaseForm submission and server errors", () => {
  it("calls onSubmit only with a valid draft and locks the form after success", async () => {
    const { user, onSubmit } = setup();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: pl.form.submit }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      caseType: "complaint", category: "laptop", model: "ThinkPad T14", purchaseDate: "2026-11-20",
      channel: "online", description: "Ekran miga od tygodnia po upadku.", photo: expect.any(File),
    }));
    expect(screen.getByRole("button", { name: pl.form.submit })).toBeDisabled();
    expect(screen.getByLabelText(pl.form.labels.model, { exact: false })).toBeDisabled();
  }, 20_000);

  it("shows the AC-45 service banner and retries the preserved valid draft", async () => {
    const { user, onRetry } = setup({ serviceError: true });
    expect(screen.getByRole("alert")).toHaveTextContent(pl.errors.analysisBanner);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: pl.form.retry }));
    await waitFor(() => expect(onRetry).toHaveBeenCalledOnce());
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ photo: expect.any(File), model: "ThinkPad T14" }));
  }, 20_000);

  it("applies server field errors with setError and focuses the first invalid field", async () => {
    setup({ serverFieldErrors: { model: "Błąd modelu z serwera.", photo: pl.errors.imageFormat } });
    expect(await screen.findByText("Błąd modelu z serwera.")).toBeInTheDocument();
    expect(screen.getByText(pl.errors.imageFormat)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(pl.form.labels.model, { exact: false })).toHaveFocus());
    expect(screen.getByLabelText(pl.form.labels.model, { exact: false })).toHaveAttribute("aria-invalid", "true");
  });

  it("uses a supplied initial draft and retains it for a resubmission", async () => {
    const photo = realPhoto();
    const initialDraft = {
      ...emptyDraft(), caseType: "complaint" as const, category: "laptop" as const, model: "ThinkPad T14",
      purchaseDate: "2026-11-20", channel: "online" as const,
      description: "Ekran miga od tygodnia po upadku.", photo, aiConsent: true,
    };
    const { user, onSubmit } = setup({ initialDraft });
    await user.click(screen.getByRole("button", { name: pl.form.submit }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]?.[0]?.photo).toBe(photo);
  });
});
