// E10 (S1, 360 px): no horizontal scroll and no serious or critical axe violations on the
// form, progress and chat screens (TAC-003-02, TAC-003-03).
import { pl } from "../../src/lib/i18n/pl";
import { SERVERS } from "./servers";
import {
  expect,
  expectChatScreen,
  expectNoHorizontalScroll,
  expectNoSeriousAxeViolations,
  fillCaseForm,
  monthsAgo,
  openForm,
  submitCase,
  test,
} from "./helpers";

test.use({ baseURL: SERVERS.S1.url, viewport: { width: 360, height: 800 } });

test("E10 at 360 px: form, progress and chat are scroll-free and pass axe", async ({ page }) => {
  await openForm(page);
  await expectNoHorizontalScroll(page);
  await expectNoSeriousAxeViolations(page, "form");

  await fillCaseForm(page, {
    caseType: "complaint",
    category: "Tablet",
    model: "Apple iPad Air 5",
    purchaseDate: monthsAgo(7),
    channel: "online",
    description: "Ekran dotykowy reaguje z opóźnieniem i w jednym miejscu nie działa wcale.",
    photo: "phone-1.jpg",
  });

  const outcome = await submitCase(page, async () => {
    // Progress is shown from the click until the result arrives; the axe run happens inside it.
    await expect(page.getByText(pl.progress.upload)).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeViolations(page, "progress");
  });
  expect(outcome.status).toBe(200);

  await expectChatScreen(page);
  await expectNoHorizontalScroll(page);
  await expectNoSeriousAxeViolations(page, "chat");
});
