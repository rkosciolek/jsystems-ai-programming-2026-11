// E3 (S2, llm-only): complaint with laptop-2.webp (WebP). Insisting must not revise; a new
// policy-relevant fact may. Model-behaviour assertions are tagged @model (ADR-000 section 10).
import { pl } from "../../src/lib/i18n/pl";
import { SERVERS } from "./servers";
import {
  bodyText,
  currentDecisionLabel,
  expect,
  expectDecidedLog,
  expectFirstMessageStructure,
  logForCase,
  monthsAgo,
  sendChatMessage,
  submitAndWaitForChat,
  test,
  waitForReply,
  type CaseInput,
} from "./helpers";

const INPUT: CaseInput = {
  caseType: "complaint",
  category: "Laptop",
  model: "Dell Latitude 5440",
  purchaseDate: monthsAgo(3),
  channel: "online",
  description: "Matryca ma czarne plamy i obraz miga po około dziesięciu minutach pracy",
  photo: "laptop-2.webp",
};

test.use({ baseURL: SERVERS.S2.url });

test("E3 llm path: vision and decision models logged, shadow fast-path decision present", async ({ page }) => {
  await page.goto("/");
  const caseId = await submitAndWaitForChat(page, INPUT);
  await expectFirstMessageStructure(page, caseId);

  const entry = await expectDecidedLog(SERVERS.S2, caseId);
  expect(entry.path).toBe("llm");
  expect(entry.models.vision).not.toBeNull();
  expect(entry.models.decision).not.toBeNull();
  expect(entry).toHaveProperty("shadowFastPathDecision");
});

test("E3 @model: insisting does not revise; a new fact revises only with the invariant", { tag: "@model" }, async ({ page }) => {
  await page.goto("/");
  const caseId = await submitAndWaitForChat(page, INPUT);
  const initialLabel = await currentDecisionLabel(page);

  const insist = "Proszę zmienić decyzję";
  let before = await bodyText(page);
  await sendChatMessage(page, insist);
  await waitForReply(page, before);
  expect(logForCase(SERVERS.S2, caseId).some((entry) => entry.event === "decision_revised")).toBe(false);
  expect(await currentDecisionLabel(page)).toBe(initialLabel);

  const newFact = "Laptop spadł mi wcześniej ze stołu.";
  before = await bodyText(page);
  await sendChatMessage(page, newFact);
  await waitForReply(page, before);

  const revisions = logForCase(SERVERS.S2, caseId).filter((entry) => entry.event === "decision_revised");
  if (revisions.length > 0) {
    const revised = revisions.at(-1);
    expect(revised?.decision, "decision_revised carries a decision").toBeDefined();
    const newLabel = (pl.decisions as Record<string, string>)[revised?.decision ?? ""];
    expect(await currentDecisionLabel(page)).toBe(newLabel);
    await expect(page.getByText(pl.chat.revisedAssessment).first()).toBeVisible();
    await expect(page.getByText(pl.disclaimer).first()).toBeVisible();
  } else {
    await expect(page.getByText(pl.chat.revisedAssessment)).toHaveCount(0);
    expect(await currentDecisionLabel(page)).toBe(initialLabel);
  }
});
