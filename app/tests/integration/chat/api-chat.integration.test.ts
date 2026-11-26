import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseInput, CaseUIMessage, Decision } from "@/lib/domain";
import type { CaseRecord } from "@/server/case-store";
import { getCaseStore } from "@/server/case-store";
import { computeFacts } from "@/server/rules";
import { POST } from "@/app/api/chat/route";
import { setChatStreamDeps } from "@/server/llm/chat";
import { createReplayFetch, type ReplayRequest } from "../../helpers/replay-fetch";

const CASE_ID = "HSD-20261126-T3B1";
const TODAY = "2026-11-26";
const LOG_PATH = path.resolve(process.cwd(), "var/chat-api-test-decisions.jsonl");

const complaint: CaseInput = {
  caseType: "complaint",
  category: "laptop",
  model: "Acer Aspire 5",
  purchaseDate: "2026-09-01",
  channel: "online",
  description: "Ekran laptopa pękł w lewym rogu i pojawiły się pionowe pasy.",
};

function makeRecord(input: CaseInput, decision: Decision = "rejected"): CaseRecord {
  const firstMessage: CaseUIMessage = {
    id: `${CASE_ID}-initial`,
    role: "assistant",
    parts: [{ type: "text", text: "Wiadomość początkowa przechowywana po stronie serwera." }],
    metadata: { decision },
  };
  return {
    caseId: CASE_ID,
    createdAt: "2026-11-26T10:00:00.000Z",
    input,
    classifier: { answers: {}, model: "recorded-jev" },
    outcome: {
      decision,
      citedSections: ["§3 ust. 1", "§3 ust. 2"],
      reasonCodes: ["used_item_voluntary"],
      path: "llm",
      messageMarkdown: "Wiadomość początkowa przechowywana po stronie serwera.",
    },
    currentDecision: decision,
    firstMessage,
    facts: computeFacts(input, TODAY),
    revisions: [],
  };
}

function assistantMessage(record: CaseRecord, text = "kliencki tekst, który nie może zastąpić zapisu serwera"): CaseUIMessage {
  return {
    ...record.firstMessage,
    parts: [{ type: "text", text }],
  };
}

function userMessage(text: string, id = "user-1"): CaseUIMessage {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

function requestBody(messages: CaseUIMessage[], caseId = CASE_ID): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "chat-1", caseId, messages }),
  });
}

async function readEvents(response: Response): Promise<Record<string, unknown>[]> {
  const text = await response.text();
  return text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice("data: ".length))
    .filter((data) => data !== "[DONE]")
    .map((data) => JSON.parse(data) as Record<string, unknown>);
}

async function requestBodySent(request: ReplayRequest): Promise<Record<string, unknown>> {
  return JSON.parse(request.body ?? "{}") as Record<string, unknown>;
}

describe("POST /api/chat", () => {
  beforeEach(async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "synthetic-test-key");
    vi.stubEnv("LLM_MODEL", "openai/gpt-6-luna");
    vi.stubEnv("LLM_REASONING_EFFORT", "medium");
    vi.stubEnv("POLICIES_DIR", "../docs/policies");
    vi.stubEnv("DECISION_MODE", "auto");
    vi.stubEnv("DECISION_LOG_PATH", "./var/chat-api-test-decisions.jsonl");
    await rm(LOG_PATH, { force: true });
    getCaseStore().clear();
  });

  afterEach(async () => {
    setChatStreamDeps({});
    getCaseStore().clear();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    await rm(LOG_PATH, { force: true });
  });

  it("streams a recorded reply with decision metadata and sends only the complaint policy and stored first message", async () => {
    const record = makeRecord(complaint);
    getCaseStore().create(record);
    const replay = createReplayFetch(["llm-chat-reply"]);
    setChatStreamDeps({ fetch: replay });
    const response = await POST(requestBody([
      assistantMessage(record),
      userMessage("Jaką datę zakupu podałem?"),
    ]));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events.some((event) => event.type === "text-delta")).toBe(true);
    expect(events.find((event) => event.type === "start")).toMatchObject({ messageMetadata: { decision: "rejected" } });
    expect(events.find((event) => event.type === "finish")).toMatchObject({ messageMetadata: { decision: "rejected" } });
    expect(replay.requests).toHaveLength(1);
    const sent = await requestBodySent(replay.requests[0]!);
    const sentMessages = sent.messages as { content?: unknown }[];
    const systemContent = sentMessages[0]?.content;
    const system = Array.isArray(systemContent)
      ? systemContent.map((part) => part && typeof part === "object" && "text" in part ? String(part.text) : "").join("\n")
      : String(systemContent ?? "");
    const complaintPolicy = await readFile(path.resolve(process.cwd(), "../docs/policies/complaint-policy.md"), "utf8");
    const returnPolicy = await readFile(path.resolve(process.cwd(), "../docs/policies/return-policy.md"), "utf8");
    expect(system).toContain(complaintPolicy);
    expect(system).toContain(complaint.description);
    expect(system).not.toContain(returnPolicy);
    expect(JSON.stringify(sentMessages)).toContain("Wiadomość początkowa przechowywana po stronie serwera.");
    expect(JSON.stringify(sentMessages)).not.toContain("kliencki tekst");
  });

  it("rejects a client history whose index-zero assistant id is not the stored first message", async () => {
    const record = makeRecord(complaint);
    getCaseStore().create(record);
    const replay = createReplayFetch([]);
    const response = await POST(requestBody([
      { ...assistantMessage(record), id: "tampered-initial" },
      userMessage("Pytanie o zgłoszenie"),
    ]));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
    expect(replay.requests).toHaveLength(0);
  });

  it("returns 404 for an unknown or expired case and refreshes the TTL on access", async () => {
    const unknown = await POST(requestBody([
      assistantMessage(makeRecord(complaint)),
      userMessage("Pytanie o sprawę"),
    ], "HSD-20261126-ZZZZ"));
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ error: "case_not_found" });

    const record = makeRecord(complaint);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T10:00:00.000Z"));
    getCaseStore().create(record);
    vi.advanceTimersByTime(7_200_001);
    const expired = await POST(requestBody([
      assistantMessage(record),
      userMessage("Pytanie o sprawę"),
    ]));
    expect(expired.status).toBe(404);
    expect(await expired.json()).toEqual({ error: "case_not_found" });

    getCaseStore().create(record);
    vi.advanceTimersByTime(60 * 60 * 1000);
    const staleIdHistory = [
      { ...assistantMessage(record), id: "tampered-initial" },
      userMessage("Pytanie o sprawę"),
    ];
    expect((await POST(requestBody(staleIdHistory))).status).toBe(400);
    vi.advanceTimersByTime(90 * 60 * 1000);
    expect((await POST(requestBody(staleIdHistory))).status).toBe(400);
    vi.advanceTimersByTime(2 * 60 * 60 * 1000 + 1);
    expect((await POST(requestBody(staleIdHistory))).status).toBe(404);
  });

  it.each([
    ["message longer than 2000 characters", (record: CaseRecord) => [assistantMessage(record), userMessage("x".repeat(2001))]],
    ["a file part", (record: CaseRecord) => [assistantMessage(record), { id: "user-1", role: "user", parts: [{ type: "file", mediaType: "image/jpeg", url: "data:image/jpeg;base64,AA==" }] }]],
    ["more than 60 messages", (record: CaseRecord) => [assistantMessage(record), ...Array.from({ length: 60 }, (_, index) => userMessage("wiadomość", `user-${index}`))]],
    ["whitespace-only text", (record: CaseRecord) => [assistantMessage(record), userMessage(" \n ")]],
    ["a last message that is not from the user", (record: CaseRecord) => [assistantMessage(record), assistantMessage(record, "Odpowiedź asystenta")]],
  ])("returns 400 for %s", async (_name, makeMessages) => {
    const record = makeRecord(complaint);
    getCaseStore().create(record);
    const messages = makeMessages(record) as CaseUIMessage[];
    const response = await POST(requestBody(messages));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
  });
});

describe("chat route stream error handling", () => {
  beforeEach(async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "synthetic-test-key");
    vi.stubEnv("LLM_MODEL", "openai/gpt-6-luna");
    vi.stubEnv("LLM_REASONING_EFFORT", "medium");
    vi.stubEnv("POLICIES_DIR", "../docs/policies");
    vi.stubEnv("DECISION_MODE", "auto");
    vi.stubEnv("DECISION_LOG_PATH", "./var/chat-api-test-decisions.jsonl");
    await rm(LOG_PATH, { force: true });
    getCaseStore().clear();
  });

  afterEach(async () => {
    setChatStreamDeps({});
    getCaseStore().clear();
    vi.unstubAllEnvs();
    await rm(LOG_PATH, { force: true });
  });

  it("masks a recorded provider 4xx in Polish and logs chat_failed", async () => {
    const record = makeRecord(complaint);
    getCaseStore().create(record);
    const replay = createReplayFetch(["llm-error-401"]);
    setChatStreamDeps({ fetch: replay });
    const response = await POST(requestBody([
      assistantMessage(record),
      userMessage("Jaką datę zakupu podałem?"),
    ]));
    const raw = await response.text();
    const events = raw.split("\n").filter((line) => line.startsWith("data: ")).map((line) => line.slice(6));

    expect(response.status).toBe(200);
    expect(raw).toContain("Nie udało się wysłać odpowiedzi.");
    expect(raw).not.toContain("Missing Authentication header");
    expect(raw).not.toContain("openrouter");
    expect(events).not.toContain(expect.stringContaining("Missing Authentication header"));
    const log = await readFile(LOG_PATH, "utf8");
    expect(log).toContain('"event":"chat_failed"');
    expect(log).toContain('"failureCode":"upstream"');
    expect(log).toContain('"step":"chat"');
  });
});
