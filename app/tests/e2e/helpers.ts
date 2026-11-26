import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";
import { pl } from "../../src/lib/i18n/pl";
import type { ServerSpec } from "./servers";

const APP_DIR = path.resolve(__dirname, "../..");
const PHOTO_DIR = path.resolve(__dirname, "../../../assets/example-images");

/** Real photos only (assets/example-images/README.md). Names are never changed. */
export type PhotoName = "laptop-1.png" | "laptop-2.webp" | "phone-1.jpg" | "phone-2.jpeg" | "phone-3.jpeg";

export function photoPath(name: PhotoName): string {
  return path.join(PHOTO_DIR, name);
}

/** Generous per-call budget: the server allows 90 s per case, the client 95 s. */
export const CASE_TIMEOUT_MS = 120_000;
/** Chat replies stream from a real model; a full reply is allowed up to this long. */
export const REPLY_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// Test fixture: console guard (TAC-003-05) and the optional network-error allowance.
// ---------------------------------------------------------------------------

type Fixtures = {
  /** Set on specs that expect failed HTTP responses (S4-S8, E8 validation). */
  allowNetworkErrors: boolean;
  consoleGuard: void;
};

const NETWORK_ERROR = /Failed to load resource|status of \d{3}/;

export const test = base.extend<Fixtures>({
  allowNetworkErrors: [false, { option: true }],
  consoleGuard: [
    async ({ page, allowNetworkErrors }, use) => {
      const problems: string[] = [];
      page.on("console", (message) => {
        const text = message.text();
        if (message.type() === "error") {
          if (allowNetworkErrors && NETWORK_ERROR.test(text)) return;
          problems.push(`console error: ${text}`);
        } else if (message.type() === "warning" && /^Warning: |was not wrapped in act/.test(text)) {
          // React's dev warnings start with "Warning: ". Browser-engine notices such as Firefox's
          // "JavaScript Warning: ... microtasks ... reordered" are not React warnings.
          problems.push(`React warning: ${text}`);
        }
      });
      page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`));
      await use();
      expect(problems, "browser console must show no errors or React warnings (TAC-003-05)").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return isoDate(date);
}

export function monthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return isoDate(date);
}

// ---------------------------------------------------------------------------
// Decision log (one JSONL file per server, see servers.ts)
// ---------------------------------------------------------------------------

export type LogEntry = {
  ts: string;
  event: string;
  caseId?: string;
  caseType?: "complaint" | "return";
  path?: "fast" | "llm";
  decision?: string;
  failureCode?: string;
  classifierError?: "upstream" | "invalid_response" | null;
  classifierAnswers?: Record<string, { value: unknown; certainty: number }> | null;
  minGatingCertainty?: number | null;
  gateFailedAt?: string | null;
  shadowFastPathDecision?: string | null;
  reasons?: string[];
  models: { classifier: string | null; vision: string | null; decision: string | null; chat: string | null };
};

export function readDecisionLog(server: ServerSpec): LogEntry[] {
  const file = path.resolve(APP_DIR, server.logPath);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as LogEntry);
}

export function logForCase(server: ServerSpec, caseId: string): LogEntry[] {
  return readDecisionLog(server).filter((entry) => entry.caseId === caseId);
}

/** Entries written after `since`, for failures that carry no case ID on the client (E6, E7). */
export function logSince(server: ServerSpec, since: Date, event: string): LogEntry[] {
  return readDecisionLog(server).filter(
    (entry) => entry.event === event && Date.parse(entry.ts) >= since.getTime(),
  );
}

// ---------------------------------------------------------------------------
// Case form
// ---------------------------------------------------------------------------

export type CaseInput = {
  caseType: "complaint" | "return";
  /** Visible category label, e.g. "Laptop" or "Smartfon". */
  category: string;
  model: string;
  purchaseDate: string;
  channel: "online" | "store";
  description?: string;
  photo: PhotoName | { name: string; mimeType: string; buffer: Buffer };
};

export async function openForm(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: pl.form.title })).toBeVisible();
}

export async function fillCaseForm(page: Page, input: CaseInput): Promise<void> {
  const caseTypeLabel = input.caseType === "complaint" ? pl.form.caseType.complaint.label : pl.form.caseType.return.label;
  await page.getByRole("radio", { name: caseTypeLabel, exact: true }).click();
  await page.locator("#category-trigger").click();
  await page.getByRole("option", { name: input.category, exact: true }).click();
  await page.locator("#model").fill(input.model);
  await page.locator("#purchaseDate").fill(input.purchaseDate);
  await page.getByRole("radio", { name: pl.form.channel[input.channel], exact: true }).click();
  if (input.description !== undefined) await page.locator("#description").fill(input.description);
  await setPhoto(page, input.photo);
}

export async function setPhoto(page: Page, photo: CaseInput["photo"]): Promise<void> {
  // The file input is visually hidden (sr-only), so it is set directly, not clicked.
  const input = page.locator('input[type="file"]');
  if (typeof photo === "string") {
    await input.setInputFiles(photoPath(photo));
  } else {
    await input.setInputFiles({ name: photo.name, mimeType: photo.mimeType, buffer: photo.buffer });
  }
}

export type SubmitOutcome = {
  status: number;
  events: Array<Record<string, unknown>>;
  result?: Record<string, unknown> & { type: "result"; caseId: string };
  caseId?: string;
};

/**
 * Clicks "Wyślij zgłoszenie" and reads the response body of the same request. The body is
 * observed, not replaced: the UI still receives the stream as usual.
 */
export async function submitCase(page: Page, whileProcessing?: () => Promise<void>): Promise<SubmitOutcome> {
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/cases",
    { timeout: CASE_TIMEOUT_MS },
  );
  await page.getByRole("button", { name: pl.form.submit, exact: true }).click();
  await whileProcessing?.();
  const response = await responsePromise;
  const text = await response.text();
  const events = parseBody(text);
  const result = events.find((event) => event.type === "result") as SubmitOutcome["result"];
  return { status: response.status(), events, result, caseId: result?.caseId };
}

function parseBody(text: string): Array<Record<string, unknown>> {
  try {
    return [JSON.parse(text) as Record<string, unknown>];
  } catch {
    return text
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }
}

/** The `case_decided` entry for a case. The log line is written before the result is sent. */
export async function expectDecidedLog(server: ServerSpec, caseId: string): Promise<LogEntry> {
  await expect
    .poll(() => logForCase(server, caseId).some((entry) => entry.event === "case_decided"), { timeout: 10_000 })
    .toBe(true);
  return logForCase(server, caseId).find((entry) => entry.event === "case_decided") as LogEntry;
}

/** Submits a case and waits until the first-message view is shown. */
export async function submitAndWaitForChat(page: Page, input: CaseInput): Promise<string> {
  await fillCaseForm(page, input);
  const outcome = await submitCase(page);
  expect(outcome.status, "POST /api/cases must return the NDJSON stream").toBe(200);
  expect(outcome.caseId, "result event must carry a case ID").toMatch(/^HSD-\d{8}-[A-Z0-9]{4}$/);
  await expectChatScreen(page);
  return outcome.caseId as string;
}

// ---------------------------------------------------------------------------
// Screens (accessible roles and pl.ts strings only)
// ---------------------------------------------------------------------------

const SECTION_HEADINGS = Object.values(pl.chat.sections);
const DECISION_LABELS = Object.values(pl.decisions);

export async function expectChatScreen(page: Page): Promise<void> {
  for (const heading of SECTION_HEADINGS) {
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible({
      timeout: CASE_TIMEOUT_MS,
    });
  }
}

/** The six first-message headings, one disclaimer and one decision label (E1, E2, E13). */
export async function expectFirstMessageStructure(page: Page, caseId: string): Promise<string> {
  await expectChatScreen(page);
  for (const heading of SECTION_HEADINGS) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toHaveCount(1);
  }
  await expect(page.getByText(pl.disclaimer).first()).toBeVisible();
  await expect(page.getByText(caseId).first()).toBeVisible();
  const label = await currentDecisionLabel(page);
  expect(label, "one of the four decision labels must be shown").toBeDefined();
  return label as string;
}

/** The decision label currently shown, or undefined. The label text is never asserted to a value. */
export async function currentDecisionLabel(page: Page): Promise<string | undefined> {
  for (const label of DECISION_LABELS) {
    if (await page.getByText(label, { exact: true }).first().isVisible()) return label;
  }
  return undefined;
}

export function chatInput(page: Page) {
  return page.getByRole("textbox").last();
}

export async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText();
}

export async function sendChatMessage(page: Page, text: string): Promise<void> {
  await chatInput(page).fill(text);
  await page.getByRole("button", { name: pl.chat.send, exact: true }).click();
  await expect(page.getByText(text, { exact: true }).last()).toBeVisible({ timeout: 10_000 });
}

/**
 * Waits for a streamed assistant reply: the page text changes, then stays unchanged and the
 * input is editable again. Returns the final page text.
 */
export async function waitForReply(page: Page, before: string): Promise<string> {
  await expect.poll(async () => (await bodyText(page)) !== before, { timeout: REPLY_TIMEOUT_MS }).toBe(true);
  let previous = "";
  await expect
    .poll(
      async () => {
        const current = await bodyText(page);
        const stable = current === previous;
        previous = current;
        return stable && (await chatInput(page).isEditable());
      },
      { timeout: REPLY_TIMEOUT_MS, intervals: [1_000] },
    )
    .toBe(true);
  return bodyText(page);
}

/** Starts a new case from the chat, optionally keeping the chat (cancel path). */
export async function startNewCase(page: Page, confirm: boolean): Promise<void> {
  await page.getByRole("button", { name: pl.chat.newCase, exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(pl.chat.newCaseConfirm)).toBeVisible();
  if (confirm) {
    await dialog.getByRole("button", { name: pl.chat.newCase, exact: true }).click();
    await expect(page.getByRole("heading", { name: pl.form.title })).toBeVisible();
  } else {
    await dialog.getByRole("button", { name: pl.common.cancel, exact: true }).click();
    await expect(dialog).toBeHidden();
  }
}

// ---------------------------------------------------------------------------
// Layout and accessibility (TAC-003-02, TAC-003-03)
// ---------------------------------------------------------------------------

export async function expectNoHorizontalScroll(page: Page, width = 360): Promise<void> {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth, "document.documentElement.scrollWidth").toBeLessThanOrEqual(width);
}

export async function expectNoSeriousAxeViolations(page: Page, screen: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => `${violation.id} (${violation.impact}) on ${violation.nodes.length} node(s)`);
  expect(blocking, `axe serious/critical violations on ${screen}`).toEqual([]);
}

// ---------------------------------------------------------------------------
// Text checks (E11, E7): nothing provider-specific reaches the client
// ---------------------------------------------------------------------------

export async function expectNoProviderLeak(page: Page): Promise<void> {
  const text = (await bodyText(page)).toLowerCase();
  expect(text).not.toContain("openrouter");
  expect(text).not.toContain("does-not-exist");
  expect(text).not.toMatch(/\bat \S+ \(.*:\d+:\d+\)/);
  expect(text).not.toContain("typeerror");
}
