// E9 (S1): cancel keeps the chat, confirm starts an empty form, and reload during the chat
// fires beforeunload (AC-42..AC-44). No state survives the reload.
import { SERVERS } from "./servers";
import { daysAgo, expect, expectChatScreen, openForm, startNewCase, submitAndWaitForChat, test, type CaseInput } from "./helpers";

const COMPLAINT: CaseInput = {
  caseType: "complaint",
  category: "Laptop",
  model: "Lenovo ThinkPad T14 Gen 4",
  purchaseDate: daysAgo(200),
  channel: "online",
  description: "Pęknięta matryca po upadku, w rogu widać czarną plamę i linie",
  photo: "laptop-1.png",
};

test.use({ baseURL: SERVERS.S1.url });

test("E9 new case: cancel keeps the chat, confirm shows an empty form", async ({ page }) => {
  await openForm(page);
  const caseId = await submitAndWaitForChat(page, COMPLAINT);

  await startNewCase(page, false);
  await expectChatScreen(page);
  await expect(page.getByText(caseId).first()).toBeVisible();

  await startNewCase(page, true);
  await expect(page.locator("#model")).toHaveValue("");
  await expect(page.locator("#description")).toHaveValue("");
});

test("E9 reload during chat: beforeunload fires and the form is empty afterwards", async ({ page }) => {
  await openForm(page);
  await submitAndWaitForChat(page, { ...COMPLAINT, photo: "phone-2.jpeg", category: "Smartfon", model: "Samsung Galaxy S21" });

  const dialogTypes: string[] = [];
  page.on("dialog", (dialog) => {
    dialogTypes.push(dialog.type());
    void dialog.accept();
  });
  await page.reload();

  await expect.poll(() => dialogTypes, { timeout: 10_000 }).toContain("beforeunload");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#model")).toHaveValue("");
});
