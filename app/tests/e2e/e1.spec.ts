// E1 (S1, fast-only): complaint with laptop-1.png, online, 8 months, 60-char description.
import { pl } from "../../src/lib/i18n/pl";
import { SERVERS } from "./servers";
import {
  bodyText,
  expect,
  expectDecidedLog,
  expectFirstMessageStructure,
  fillCaseForm,
  monthsAgo,
  sendChatMessage,
  submitAndWaitForChat,
  submitCase,
  test,
  waitForReply,
  type CaseInput,
} from "./helpers";

const DESCRIPTION = "Ekran pękł po upadku z biurka, laptop nie włącza się od rana";
const INPUT: CaseInput = {
  caseType: "complaint",
  category: "Laptop",
  model: "Lenovo ThinkPad T14 Gen 4",
  purchaseDate: monthsAgo(8),
  channel: "online",
  description: DESCRIPTION,
  photo: "laptop-1.png",
};

test.use({ baseURL: SERVERS.S1.url });

test("E1 fast path: progress order, first message, log shows no LLM", async ({ page }) => {
  expect(DESCRIPTION).toHaveLength(60);
  await page.goto("/");
  await fillCaseForm(page, INPUT);

  let progressOrder: string[] = [];
  const outcome = await submitCase(page, async () => {
    await expect(page.getByText(pl.progress.upload)).toBeVisible();
    progressOrder = await page.locator("ol li").allInnerTexts();
  });
  expect(outcome.status).toBe(200);
  const caseId = outcome.caseId as string;

  const expectedOrder = [pl.progress.upload, pl.progress.analysis, pl.progress.decision];
  const positions = expectedOrder.map((label) => progressOrder.findIndex((text) => text.includes(label)));
  expect(positions, "progress steps appear in order").toEqual([...positions].sort((a, b) => a - b));
  expect(positions.every((position) => position >= 0), "all progress steps are shown").toBe(true);

  const label = await expectFirstMessageStructure(page, caseId);
  expect(Object.values(pl.decisions)).toContain(label);

  const entry = await expectDecidedLog(SERVERS.S1, caseId);
  expect(entry.path).toBe("fast");
  expect(entry.caseType).toBe("complaint");
  expect(entry.models.vision).toBeNull();
  expect(entry.models.decision).toBeNull();
  expect(entry.models.classifier).not.toBeNull();
});

test("E1 @model: chat reply contains the purchase day and year", { tag: "@model" }, async ({ page }) => {
  await page.goto("/");
  await submitAndWaitForChat(page, INPUT);

  const [year, , day] = INPUT.purchaseDate.split("-");
  const question = "Jaką datę zakupu podałem?";
  const before = await bodyText(page);
  await sendChatMessage(page, question);
  const after = await waitForReply(page, before);
  const reply = after.slice(after.lastIndexOf(question) + question.length);

  expect(reply).toContain(year);
  expect(reply).toMatch(new RegExp(`(^|\\D)0?${Number(day)}(\\D|$)`));
});
