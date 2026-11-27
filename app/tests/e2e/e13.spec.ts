// E13 (S8, Jev fails for real): the classifier call fails and the case degrades to the LLM
// path (ADR-001 TD-105). The first message is still shown.
import { SERVERS } from "./servers";
import { expect, expectDecidedLog, expectFirstMessageStructure, monthsAgo, openForm, submitAndWaitForChat, test } from "./helpers";

test.use({ baseURL: SERVERS.S8.url });

test("E13 Jev failure: classifierError logged, path llm, first message shown", async ({ page }) => {
  await openForm(page);
  const caseId = await submitAndWaitForChat(page, {
    caseType: "complaint",
    category: "Laptop",
    model: "Acer Aspire 5",
    purchaseDate: monthsAgo(2),
    channel: "online",
    description: "Obudowa jest wgnieciona w rogu po tym, jak laptop spadł z torby.",
    photo: "laptop-1.png",
  });
  await expectFirstMessageStructure(page, caseId);

  const entry = await expectDecidedLog(SERVERS.S8, caseId);
  expect(entry.classifierError, "classifierError must be set when Jev fails").toBeTruthy();
  expect(entry.path).toBe("llm");
  expect(entry.models.vision).not.toBeNull();
  expect(entry.models.decision).not.toBeNull();
});
