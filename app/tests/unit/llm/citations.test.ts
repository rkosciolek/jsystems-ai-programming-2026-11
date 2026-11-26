import { describe, expect, it } from "vitest";
import { normalizeCitedSections } from "@/server/llm/citations";

describe("normalizeCitedSections", () => {
  it("expands an en dash range into one entry per section", () => {
    expect(normalizeCitedSections(["§3 ust. 1–2"])).toEqual(["§3 ust. 1", "§3 ust. 2"]);
  });

  it("expands a hyphen range into one entry per section", () => {
    expect(normalizeCitedSections(["§6 ust. 2-3"])).toEqual(["§6 ust. 2", "§6 ust. 3"]);
  });

  it("expands a comma list written without the section repeated", () => {
    expect(normalizeCitedSections(["§2 ust. 1, 4"])).toEqual(["§2 ust. 1", "§2 ust. 4"]);
  });

  it("expands a comma list that repeats the section prefix", () => {
    expect(normalizeCitedSections(["§2 ust. 1, §2 ust. 4"])).toEqual(["§2 ust. 1", "§2 ust. 4"]);
  });

  it("trims entries and removes duplicates while keeping order", () => {
    expect(normalizeCitedSections([" §2 ust. 1 ", "§7", "§2 ust. 1", "§3 ust. 1–2", "§3 ust. 2"])).toEqual([
      "§2 ust. 1",
      "§7",
      "§3 ust. 1",
      "§3 ust. 2",
    ]);
  });

  it("leaves already valid entries unchanged", () => {
    expect(normalizeCitedSections(["§2 ust. 4", "§7"])).toEqual(["§2 ust. 4", "§7"]);
  });

  it("keeps an entry it cannot expand unchanged so validation still rejects it", () => {
    expect(normalizeCitedSections(["§3 ust. 2–1"])).toEqual(["§3 ust. 2–1"]);
    expect(normalizeCitedSections(["§3 ust. 1, §4 ust. 2"])).toEqual(["§3 ust. 1, §4 ust. 2"]);
  });
});
