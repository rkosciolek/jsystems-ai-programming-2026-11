// E4 (S2, llm-only): return with phone-3.jpeg, online, 5 days, then a chat follow-up.
import { SERVERS } from "./servers";
import {
  bodyText,
  daysAgo,
  expect,
  expectDecidedLog,
  expectFirstMessageStructure,
  sendChatMessage,
  submitAndWaitForChat,
  test,
  waitForReply,
} from "./helpers";

test.use({ baseURL: SERVERS.S2.url });

test("E4 llm return with chat follow-up: log path llm, reply streams in", async ({ page }) => {
  await page.goto("/");
  const caseId = await submitAndWaitForChat(page, {
    caseType: "return",
    category: "Smartfon",
    model: "Xiaomi Redmi Note 12",
    purchaseDate: daysAgo(5),
    channel: "online",
    photo: "phone-3.jpeg",
  });
  await expectFirstMessageStructure(page, caseId);

  const question = "Czy mogę jeszcze coś dodać do zgłoszenia?";
  const before = await bodyText(page);
  await sendChatMessage(page, question);
  const after = await waitForReply(page, before);
  const reply = after.slice(after.lastIndexOf(question) + question.length).trim();
  expect(reply.length, "the streamed reply has text after the question").toBeGreaterThan(0);

  const entry = await expectDecidedLog(SERVERS.S2, caseId);
  expect(entry.path).toBe("llm");
  expect(entry.caseType).toBe("return");
});
