// E5 (S3, auto, threshold 0.80): complaint with phone-2.jpeg (smallest photo). The path must
// follow the gating certainty and the always-LLM reasons logged for the case.
import { SERVERS } from "./servers";
import { expect, expectDecidedLog, expectFirstMessageStructure, monthsAgo, submitAndWaitForChat, test } from "./helpers";

test.use({ baseURL: SERVERS.S3.url });

test("E5 auto routing: path is consistent with the logged certainty", async ({ page }) => {
  await page.goto("/");
  const caseId = await submitAndWaitForChat(page, {
    caseType: "complaint",
    category: "Smartfon",
    model: "Samsung Galaxy S21",
    purchaseDate: monthsAgo(4),
    channel: "store",
    description: "Ekran miga przy niskiej jasności, a po przegrzaniu telefon sam się wyłącza.",
    photo: "phone-2.jpeg",
  });
  await expectFirstMessageStructure(page, caseId);

  const entry = await expectDecidedLog(SERVERS.S3, caseId);
  const certainty = entry.minGatingCertainty;
  const confident = (entry.gateFailedAt ?? null) === null && typeof certainty === "number" && certainty >= 0.8;

  if (entry.classifierError) expect(entry.path, "a failed classifier always goes to the LLM path").toBe("llm");
  if (entry.path === "fast") expect(confident, "fast path needs every gate at or above 0.80").toBe(true);
  if (!confident) expect(entry.path, "an uncertain gate always goes to the LLM path").toBe("llm");

  if (entry.path === "fast") expect(entry.models.decision).toBeNull();
  else expect(entry.models.decision).not.toBeNull();
});
