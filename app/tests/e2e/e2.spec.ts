// E2 (S1, fast-only): return with phone-1.jpg, store, 10 days.
import { SERVERS } from "./servers";
import {
  daysAgo,
  expect,
  expectDecidedLog,
  expectFirstMessageStructure,
  submitAndWaitForChat,
  test,
} from "./helpers";

test.use({ baseURL: SERVERS.S1.url });

test("E2 return, store, 10 days: same structure, log path fast with caseType return", async ({ page }) => {
  await page.goto("/");
  const caseId = await submitAndWaitForChat(page, {
    caseType: "return",
    category: "Smartfon",
    model: "Samsung Galaxy A54",
    purchaseDate: daysAgo(10),
    channel: "store",
    photo: "phone-1.jpg",
  });

  await expectFirstMessageStructure(page, caseId);
  const entry = await expectDecidedLog(SERVERS.S1, caseId);
  expect(entry.path).toBe("fast");
  expect(entry.caseType).toBe("return");
});
