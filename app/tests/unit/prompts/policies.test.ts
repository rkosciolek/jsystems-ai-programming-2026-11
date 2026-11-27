import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/env", () => ({
  getEnv: () => ({ POLICIES_DIR: "../docs/policies" }),
}));

import { assertPoliciesExist, getPolicy } from "@/server/policies";

describe("getPolicy", () => {
  it("returns the complaint policy for complaint cases", () => {
    const text = getPolicy("complaint");
    expect(text).toContain("Regulamin reklamacji");
    expect(text).not.toContain("Regulamin zwrotów");
  });

  it("returns the return policy for return cases", () => {
    const text = getPolicy("return");
    expect(text).toContain("Regulamin zwrotów");
    expect(text).not.toContain("Regulamin reklamacji");
  });

  it("isolates the two policies (complaint text differs from return text)", () => {
    expect(getPolicy("complaint")).not.toBe(getPolicy("return"));
  });
});

describe("assertPoliciesExist", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "policies-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("passes when both policy files exist", () => {
    writeFileSync(path.join(tempDir, "complaint-policy.md"), "# A");
    writeFileSync(path.join(tempDir, "return-policy.md"), "# B");
    expect(() => assertPoliciesExist(tempDir)).not.toThrow();
  });

  it("names the missing file when the policy directory has no files", () => {
    expect(() => assertPoliciesExist(tempDir)).toThrow(/complaint-policy\.md/);
    expect(() => assertPoliciesExist(tempDir)).toThrow(/return-policy\.md/);
  });

  it("names only the missing file when one policy is absent", () => {
    writeFileSync(path.join(tempDir, "complaint-policy.md"), "# A");
    let message = "";
    try {
      assertPoliciesExist(tempDir);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("return-policy.md");
    expect(message).not.toContain("complaint-policy.md");
  });
});
