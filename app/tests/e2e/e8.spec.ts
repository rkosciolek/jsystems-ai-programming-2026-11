// E8 (S1): form validation with exact Polish messages (AC-04..AC-15). Generated payloads are
// used only for the 413 and 415 checks, which the browser cannot send by itself (owner exception).
import { pl } from "../../src/lib/i18n/pl";
import { SERVERS } from "./servers";
import { expect, fillCaseForm, openForm, setPhoto, submitCase, test } from "./helpers";

const TEN_MB = 10 * 1024 * 1024;

test.use({ baseURL: SERVERS.S1.url, allowNetworkErrors: true });

test("E8 empty submit: required messages and focus on the first invalid field", async ({ page }) => {
  await openForm(page);
  await page.getByRole("button", { name: pl.form.submit, exact: true }).click();

  await expect(page.getByText(pl.errors.caseTypeRequired)).toBeVisible();
  await expect(page.getByText(pl.errors.imageRequired)).toBeVisible();
  await expect(page.getByText(pl.form.summary)).toBeVisible();
  await expect(page.getByRole("radio", { name: pl.form.caseType.complaint.label, exact: true })).toBeFocused();
});

test("E8 complaint description: 19 characters is rejected in the browser", async ({ page }) => {
  await openForm(page);
  await page.getByRole("radio", { name: pl.form.caseType.complaint.label, exact: true }).click();
  await page.locator("#description").fill("x".repeat(19));
  await page.getByRole("button", { name: pl.form.submit, exact: true }).click();
  await expect(page.getByText(pl.errors.description)).toBeVisible();
});

test("E8 photo too large in the browser: 11 MB file shows the size message", async ({ page }) => {
  await openForm(page);
  await setPhoto(page, { name: "scan.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(11 * 1024 * 1024, 0x41) });
  await expect(page.getByText(pl.errors.imageSize)).toBeVisible();
});

test("E8 non-image named .png: the server answers 415 and the form shows the format message", async ({ page }) => {
  await openForm(page);
  await fillCaseForm(page, {
    caseType: "return",
    category: "Smartfon",
    model: "Nokia 3310",
    purchaseDate: "2026-09-01",
    channel: "store",
    photo: { name: "notes.png", mimeType: "image/png", buffer: Buffer.from("this is not an image") },
  });
  const outcome = await submitCase(page);
  expect(outcome.status).toBe(415);
  await expect(page.getByText(pl.errors.imageFormat)).toBeVisible();
});

test("E8 generated 10 MB + 1 B payload: POST /api/cases answers 413", async ({ request }) => {
  const response = await request.post("/api/cases", {
    multipart: {
      caseType: "return",
      category: "smartphone",
      model: "Nokia 3310",
      purchaseDate: "2026-09-01",
      channel: "store",
      photo: { name: "too-large.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(TEN_MB + 1, 0x41) },
    },
  });
  const body = await response.text();
  expect(response.status(), `response body: ${body}`).toBe(413);
  expect(JSON.parse(body).fields.photo).toBe(pl.errors.imageSize);
});

test("E8 generated non-image named .png: POST /api/cases answers 415", async ({ request }) => {
  const response = await request.post("/api/cases", {
    multipart: {
      caseType: "return",
      category: "smartphone",
      model: "Nokia 3310",
      purchaseDate: "2026-09-01",
      channel: "store",
      photo: { name: "notes.png", mimeType: "image/png", buffer: Buffer.from("this is not an image") },
    },
  });
  const body = await response.text();
  expect(response.status(), `response body: ${body}`).toBe(415);
  expect(JSON.parse(body).fields.photo).toBe(pl.errors.imageFormat);
});
