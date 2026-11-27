// E12 (S7, CASE_TTL_MS=5000): a real case expiry. The next chat message gets 404; the expiry
// text is shown, the input is disabled and New case leads to an empty form (AC-52).
import { pl } from "../../src/lib/i18n/pl";
import { SERVERS } from "./servers";
import { chatInput, expect, monthsAgo, openForm, startNewCase, submitAndWaitForChat, test } from "./helpers";

test.use({ baseURL: SERVERS.S7.url, allowNetworkErrors: true });

test("E12 expired case: expiry text, disabled input, New case leads to an empty form", async ({ page }) => {
  await openForm(page);
  await submitAndWaitForChat(page, {
    caseType: "complaint",
    category: "Laptop",
    model: "ASUS VivoBook 15",
    purchaseDate: monthsAgo(9),
    channel: "store",
    description: "Klawiatura podświetlenie gaśnie po kilku minutach i nie wraca bez restartu.",
    photo: "laptop-2.webp",
  });

  await page.waitForTimeout(6_000);
  await chatInput(page).fill("Czy moja sprawa jest nadal aktywna?");
  await page.getByRole("button", { name: pl.chat.send, exact: true }).click();

  await expect(page.getByText(pl.errors.caseExpired)).toBeVisible({ timeout: 30_000 });
  await expect(chatInput(page)).toBeDisabled();

  await startNewCase(page, true);
  await expect(page.locator("#model")).toHaveValue("");
});
