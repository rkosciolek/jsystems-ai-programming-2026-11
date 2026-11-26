import { describe, expect, it } from "vitest";
import { CASE_ID_REGEX } from "@/lib/domain";
import { generateCaseId } from "@/server/case-id";

describe("generateCaseId", () => {
  const fixedClock = new Date("2026-11-25T12:00:00Z");

  it("matches HSD-YYYYMMDD-XXXX with the Europe/Warsaw date", () => {
    const id = generateCaseId(fixedClock, () => false);
    expect(id).toMatch(/^HSD-20261125-[A-Z0-9]{4}$/);
    expect(CASE_ID_REGEX.test(id)).toBe(true);
  });

  it("uses the Warsaw calendar day, not the UTC day", () => {
    // 2026-11-24 23:30 UTC is already 2026-11-25 00:30 in Warsaw (CET, UTC+1).
    const id = generateCaseId(new Date("2026-11-24T23:30:00Z"), () => false);
    expect(id.startsWith("HSD-20261125-")).toBe(true);
  });

  it("retries when the generated id collides", () => {
    const seen: string[] = [];
    const id = generateCaseId(fixedClock, (candidate) => {
      seen.push(candidate);
      return seen.length === 1; // first candidate collides, second is free
    });
    expect(seen).toHaveLength(2);
    expect(id).toBe(seen[1]);
    expect(id).not.toBe(seen[0]);
    expect(id).toMatch(CASE_ID_REGEX);
  });
});
