// E7 (S5, real vision failure): a valid complaint fails upstream. The banner shows, and no
// provider, model ID or stack trace reaches the page.
import { pl } from "../../src/lib/i18n/pl";
import { SERVERS } from "./servers";
import { expect, expectNoProviderLeak, fillCaseForm, logSince, monthsAgo, test } from "./helpers";

test.use({ baseURL: SERVERS.S5.url, allowNetworkErrors: true });

test("E7 upstream failure: banner, no provider leak, case_failed upstream logged", async ({ page }) => {
  const started = new Date();
  await page.goto("/");
  await fillCaseForm(page, {
    caseType: "complaint",
    category: "Laptop",
    model: "HP ProBook 450 G9",
    purchaseDate: monthsAgo(5),
    channel: "online",
    description: "Klawiatura przestała reagować na kilka klawiszy po wylaniu wody.",
    photo: "laptop-2.webp",
  });
  await page.getByRole("button", { name: pl.form.submit, exact: true }).click();

  await expect(page.getByText(pl.errors.analysisBanner)).toBeVisible();
  await expectNoProviderLeak(page);
  await expect
    .poll(() => logSince(SERVERS.S5, started, "case_failed").map((entry) => entry.failureCode), { timeout: 10_000 })
    .toContain("upstream");
});
