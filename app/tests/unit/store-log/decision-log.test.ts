import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOG_FIELDS } from "@/lib/domain";
import { logDecision, serializeLogEntry } from "@/server/decision-log";

const SENTINEL = "ZZ-SENTINEL-ZZ";

const baseEntry = {
  ts: "2026-11-25T12:00:00.000Z",
  event: "case_decided",
  caseId: "HSD-20261125-AB12",
  mode: "auto",
  caseType: "complaint",
  category: "laptop",
  channel: "online",
  path: "fast",
  decision: "accepted",
  models: { classifier: null, vision: null, decision: null, chat: null },
  latencyMs: { total: 12 },
};

describe("serializeLogEntry", () => {
  it("drops fields that are not in the allowlist", () => {
    const line = serializeLogEntry({ ...baseEntry, description: SENTINEL, chatText: SENTINEL, imageBytes: SENTINEL });
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty("description");
    expect(parsed).not.toHaveProperty("chatText");
    expect(parsed).not.toHaveProperty("imageBytes");
    expect(line).not.toContain(SENTINEL);
  });

  it("keeps every allowlisted field that was supplied", () => {
    const parsed = JSON.parse(serializeLogEntry(baseEntry)) as Record<string, unknown>;
    expect(parsed).toEqual(baseEntry);
    for (const key of Object.keys(parsed)) expect(LOG_FIELDS).toContain(key);
  });

  it("returns a single line without a trailing newline", () => {
    const line = serializeLogEntry(baseEntry);
    expect(line).not.toContain("\n");
  });
});

describe("logDecision", () => {
  let dir: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "hsd-decision-log-"));
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it("appends one allowlisted JSON line per call and writes it to stdout", async () => {
    const path: string = join(dir, "nested", "decisions.jsonl");
    await logDecision({ ...baseEntry, description: SENTINEL }, path);
    await logDecision({ ...baseEntry, caseId: "HSD-20261125-CD34" }, path);

    const lines = (await readFile(path, "utf8")).trimEnd().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1] ?? "{}").caseId).toBe("HSD-20261125-CD34");
    expect(await readFile(path, "utf8")).not.toContain(SENTINEL);
    expect(stdoutSpy).toHaveBeenCalled();
    expect((stdoutSpy.mock.calls as unknown[][]).map((call) => String(call[0])).join("")).not.toContain(SENTINEL);
  });

  it("survives an unwritable path and reports on stderr without throwing", async () => {
    const blocker = join(dir, "not-a-directory");
    await writeFile(blocker, "x");
    const badPath = join(blocker, "decisions.jsonl");

    await expect(logDecision(baseEntry, badPath)).resolves.toBeUndefined();
    expect(stderrSpy).toHaveBeenCalled();
  });
});
