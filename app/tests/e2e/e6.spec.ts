// E6 (S4, CASE_TIMEOUT_MS=1): a valid case times out. The error banner, the kept data and the
// retry button must be shown.
import { pl } from "../../src/lib/i18n/pl";
import { SERVERS } from "./servers";
import { expect, fillCaseForm, logSince, monthsAgo, test } from "./helpers";

test.use({ baseURL: SERVERS.S4.url, allowNetworkErrors: true });

test("E6 timeout: banner with retry, values and photo kept, case_failed logged", async ({ page }) => {
  const started = new Date();
  await page.goto("/");
  const model = "Apple iPhone 13";
  await fillCaseForm(page, {
    caseType: "complaint",
    category: "Smartfon",
    model,
    purchaseDate: monthsAgo(6),
    channel: "store",
    description: "Bateria szybko się rozładowuje i telefon mocno grzeje się podczas ładowania.",
    photo: "phone-2.jpeg",
  });
  await page.getByRole("button", { name: pl.form.submit, exact: true }).click();

  await expect(page.getByText(pl.errors.analysisBanner)).toBeVisible();
  await expect(page.getByRole("button", { name: pl.form.retry, exact: true })).toBeVisible();
  await expect(page.locator("#model")).toHaveValue(model);
  await expect(page.getByRole("button", { name: pl.form.removeImage, exact: true })).toBeVisible();

  await expect
    .poll(() => logSince(SERVERS.S4, started, "case_failed").map((entry) => entry.failureCode), { timeout: 10_000 })
    .toContain("timeout");
});
