import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertPromptsExist,
  getPrompt,
  PROMPT_NAMES,
  promptHash,
} from "@/server/prompts";

// TAC-001-04: each prompt file contains the four Polish decision labels exactly as in PRD AC-22.
const LABELS = [
  "Wstępnie zaakceptowano",
  "Wstępnie odrzucono",
  "Wymaga uzupełnienia",
  "Przekazano do specjalisty",
] as const;

const PROMPTS_DIR = path.resolve(process.cwd(), "src/server/prompts");

describe("prompt files (TAC-001-04)", () => {
  it("declares the five prompt names", () => {
    expect([...PROMPT_NAMES]).toEqual([
      "vision-complaint",
      "vision-return",
      "decision-complaint",
      "decision-return",
      "chat",
    ]);
  });

  it.each([...PROMPT_NAMES])("%s exists and contains all four Polish labels", (name) => {
    const text = getPrompt(name);
    expect(text.trim().length).toBeGreaterThan(0);
    for (const label of LABELS) {
      expect(text, `missing label "${label}" in ${name}`).toContain(label);
    }
  });
});

describe("assertPromptsExist", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "prompts-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("passes for the real prompts folder", () => {
    expect(() => assertPromptsExist(PROMPTS_DIR)).not.toThrow();
  });

  it("throws an error naming the missing prompt file", () => {
    cpSync(PROMPTS_DIR, tempDir, { recursive: true });
    rmSync(path.join(tempDir, "chat.md"));
    expect(() => assertPromptsExist(tempDir)).toThrow(/chat\.md/);
  });
});

describe("promptHash", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "prompts-hash-"));
    cpSync(PROMPTS_DIR, tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("is the sha256 hex of the file content", () => {
    const expected = createHash("sha256")
      .update(readFileSync(path.join(PROMPTS_DIR, "chat.md")))
      .digest("hex");
    expect(promptHash("chat")).toBe(expected);
  });

  it("is stable for identical content", () => {
    expect(promptHash("chat", tempDir)).toBe(promptHash("chat", tempDir));
    expect(promptHash("chat", tempDir)).toBe(promptHash("chat"));
  });

  it("changes when the content differs", () => {
    const before = promptHash("decision-return", tempDir);
    writeFileSync(
      path.join(tempDir, "decision-return.md"),
      readFileSync(path.join(tempDir, "decision-return.md"), "utf8") + "\nextra line\n",
    );
    expect(promptHash("decision-return", tempDir)).not.toBe(before);
  });
});
