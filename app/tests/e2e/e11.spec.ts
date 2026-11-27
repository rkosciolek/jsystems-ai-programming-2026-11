// E11 (S6, real chat failure): the chat call fails upstream. The inline error and Ponów are
// shown, and the retry leaves exactly one copy of the user message (AC-46, AC-47).
import { pl } from "../../src/lib/i18n/pl";
import { SERVERS } from "./servers";
import {
  chatInput,
  expect,
  expectNoProviderLeak,
  monthsAgo,
  submitAndWaitForChat,
  test,
} from "./helpers";

const MESSAGE = "Jaki jest status mojego zgłoszenia?";

test.use({ baseURL: SERVERS.S6.url, allowNetworkErrors: true });

test("E11 chat failure: inline error, Ponów, one copy of the message after retry", async ({ page }) => {
  await page.goto("/");
  await submitAndWaitForChat(page, {
    caseType: "complaint",
    category: "Smartfon",
    model: "Google Pixel 7",
    purchaseDate: monthsAgo(8),
    channel: "online",
    description: "Po aktualizacji systemu telefon losowo restartuje się podczas rozmów.",
    photo: "phone-1.jpg",
  });

  await chatInput(page).fill(MESSAGE);
  await page.getByRole("button", { name: pl.chat.send, exact: true }).click();
  await expect(page.getByText(pl.errors.chatSend)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: pl.chat.retry, exact: true })).toBeVisible();
  await expectNoProviderLeak(page);

  await page.getByRole("button", { name: pl.chat.retry, exact: true }).click();
  await expect(page.getByText(pl.errors.chatSend)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(MESSAGE, { exact: true })).toHaveCount(1);
  await expectNoProviderLeak(page);
});
