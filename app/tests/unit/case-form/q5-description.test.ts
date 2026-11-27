import { describe, expect, it } from "vitest";
import { clientSchema } from "@/components/case-form/case-form";
import { makeCaseInputSchema, todayInWarsaw } from "@/lib/domain";
import { pl } from "@/lib/i18n/pl";

const base = {
  caseType: "complaint", category: "laptop", model: "ThinkPad", purchaseDate: "2026-01-01",
  channel: "online", description: "x".repeat(2001),
};

describe("Q5.4 over-long complaint description", () => {
  it("client schema reports descriptionTooLong", () => {
    const file = new File([new Uint8Array([0xff, 0xd8])], "a.jpg", { type: "image/jpeg" });
    const r = clientSchema.safeParse({ ...base, photo: file });
    const msgs = r.error?.issues.filter((i) => i.path[0] === "description").map((i) => i.message);
    expect(msgs).toEqual([pl.errors.descriptionTooLong]);
  });
  it("domain schema reports descriptionTooLong", () => {
    const r = makeCaseInputSchema(todayInWarsaw()).safeParse(base);
    expect(r.error?.issues.find((i) => i.path[0] === "description")?.message).toBe(pl.errors.descriptionTooLong);
  });
});
