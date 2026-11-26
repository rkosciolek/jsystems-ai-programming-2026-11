import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseInput, CaseUIMessage, Decision } from "@/lib/domain";
import { pl } from "@/lib/i18n/pl";
import type { CaseRecord } from "@/server/case-store";
import { getCaseStore } from "@/server/case-store";
import { computeFacts } from "@/server/rules";
import { chatStream } from "@/server/llm/chat";
import { createReplayFetch, type ReplayFetch } from "../../helpers/replay-fetch";

const CASE_ID = "HSD-20261126-T3B1";
const TODAY = "2026-11-26";
const LOG_PATH = path.resolve(process.cwd(), "var/chat-revision-test-decisions.jsonl");

const returning: CaseInput = {
  caseType: "return",
  category: "smartphone",
  model: "Samsung Galaxy A54",
  purchaseDate: "2026-11-16",
  channel: "store",
  description: "",
};

const expiredComplaint: CaseInput = {
  caseType: "complaint",
  category: "laptop",
  model: "Acer Aspire 5",
  purchaseDate: "2023-09-01",
  channel: "online",
  description: "Ekran laptopa pękł w lewym rogu i pojawiły się pionowe pasy.",
};

function makeRecord(input: CaseInput, decision: Decision = "rejected"): CaseRecord {
  const firstMessage: CaseUIMessage = {
    id: `${CASE_ID}-initial`,
    role: "assistant",
    parts: [{ type: "text", text: "Wstępna ocena sprawy zapisana w magazynie." }],
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
      messageMarkdown: "Wstępna ocena sprawy zapisana w magazynie.",
    },
    currentDecision: decision,
    firstMessage,
    facts: computeFacts(input, TODAY),
    revisions: [],
  };
}

function messages(record: CaseRecord): CaseUIMessage[] {
  return [
    record.firstMessage,
    {
      id: "user-correction",
      role: "user",
      parts: [{ type: "text", text: "Pomyliłem się, kupiłem to w sklepie internetowym, nie stacjonarnym." }],
    },
  ];
}

type CompletionChunk = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: { index: number; delta: Record<string, unknown>; finish_reason: null; native_finish_reason: null }[];
};

function wrapSseReplay(
  replay: ReplayFetch,
  mutate: (body: string) => string,
): ReplayFetch {
  return Object.assign(
    (async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await replay(input, init);
      return new Response(mutate(await response.text()), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }) as ReplayFetch,
    { requests: replay.requests },
  );
}

function toolArgumentVariant(replay: ReplayFetch, value: { newDecision: Decision; reason: string; corrections?: { channel?: "online" | "store" } }): ReplayFetch {
  const replacement = JSON.stringify(value);
  return wrapSseReplay(replay, (body) => {
    const frames = body.split(/(?<=\n\n)/);
    const argFrameIndices: number[] = [];
    const parsedFrames = frames.map((frame, index) => {
      if (!frame.startsWith("data: {") || !frame.endsWith("\n\n")) return undefined;
      try {
        const chunk = JSON.parse(frame.slice(6, -2)) as CompletionChunk;
        const hasArguments = chunk.choices.some((choice) => {
          const calls = choice.delta.tool_calls;
          return Array.isArray(calls) && calls.some((call) =>
            Boolean(call && typeof call === "object" && "function" in call &&
              (call as { function?: { arguments?: unknown } }).function?.arguments !== undefined),
          );
        });
        if (hasArguments) argFrameIndices.push(index);
        return chunk;
      } catch {
        return undefined;
      }
    });
    const lastArgumentFrame = argFrameIndices.at(-1);
    return frames.map((frame, index) => {
      const chunk = parsedFrames[index];
      if (!chunk || !argFrameIndices.includes(index)) return frame;
      for (const choice of chunk.choices) {
        const calls = choice.delta.tool_calls;
        if (!Array.isArray(calls)) continue;
        for (const call of calls) {
          if (!call || typeof call !== "object" || !("function" in call)) continue;
          const fn = (call as { function: { arguments?: string } }).function;
          if (fn.arguments === undefined) continue;
          fn.arguments = index === lastArgumentFrame ? replacement : "";
        }
      }
      return `data: ${JSON.stringify(chunk)}\n\n`;
    }).join("");
  });
}

function textBeforeToolVariant(replay: ReplayFetch): ReplayFetch {
  return wrapSseReplay(replay, (body) => {
    const first = body.match(/^data: (\{.*\})\n\n/m);
    if (!first?.[1]) throw new Error("Captured SSE has no first completion event");
    const original = JSON.parse(first[1]) as CompletionChunk;
    const before: CompletionChunk = {
      id: original.id,
      object: original.object,
      created: original.created,
      model: original.model,
      choices: [{
        index: 0,
        delta: { role: "assistant", content: "Tekst przed wywołaniem narzędzia." },
        finish_reason: null,
        native_finish_reason: null,
      }],
    };
    return body.replace(first[0], `data: ${JSON.stringify(before)}\n\n${first[0]}`);
  });
}

// Declared mutation (MUTATIONS.md): the second exchange (step 2) keeps its captured SSE frames but its
// text content is replaced by `text` (first content frame carries it, later content frames are dropped).
function stepTwoTextVariant(replay: ReplayFetch, text: string): ReplayFetch {
  let call = 0;
  return Object.assign(
    (async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await replay(input, init);
      if (call++ !== 1) return response;
      let replaced = false;
      const frames = (await response.text()).split(/(?<=\n\n)/).flatMap((frame) => {
        if (!frame.startsWith("data: {")) return [frame];
        const chunk = JSON.parse(frame.slice(6, -2)) as CompletionChunk;
        const delta = chunk.choices[0]?.delta;
        if (!delta || typeof delta.content !== "string" || delta.content.length === 0) return [frame];
        if (replaced) return [];
        replaced = true;
        delta.content = text;
        return [`data: ${JSON.stringify(chunk)}\n\n`];
      });
      return new Response(frames.join(""), { status: response.status, statusText: response.statusText, headers: response.headers });
    }) as ReplayFetch,
    { requests: replay.requests },
  );
}

async function readChunks(stream: ReadableStream<unknown>): Promise<Record<string, unknown>[]> {
  const chunks: Record<string, unknown>[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as Record<string, unknown>);
  }
  return chunks;
}

describe("chatStream revision tool with captured provider exchanges", () => {
  beforeEach(async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "synthetic-test-key");
    vi.stubEnv("LLM_MODEL", "openai/gpt-6-luna");
    vi.stubEnv("LLM_REASONING_EFFORT", "medium");
    vi.stubEnv("POLICIES_DIR", "../docs/policies");
    vi.stubEnv("DECISION_MODE", "auto");
    vi.stubEnv("DECISION_LOG_PATH", "./var/chat-revision-test-decisions.jsonl");
    await rm(LOG_PATH, { force: true });
    getCaseStore().clear();
  });

  afterEach(async () => {
    getCaseStore().clear();
    vi.unstubAllEnvs();
    await rm(LOG_PATH, { force: true });
  });

  it("recomputes facts and applies a correction from the captured two-step revision", async () => {
    const record = makeRecord(returning);
    getCaseStore().create(record);
    const replay = createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]);
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));
    const updated = getCaseStore().get(CASE_ID)!;

    expect(updated.currentDecision).toBe("accepted");
    expect(updated.input).toMatchObject({ channel: "online", purchaseDate: "2026-11-16" });
    expect(updated.facts).toMatchObject({ ageDays: 10, withdrawalOpen: true });
    expect(chunks.find((chunk) => chunk.type === "data-decision")).toMatchObject({
      data: { decision: "accepted", previous: "rejected", decisionChanged: true, reason: expect.any(String), corrections: { channel: "online" } },
    });
    expect(chunks.find((chunk) => chunk.type === "tool-output-available")).toMatchObject({
      output: { applied: true, decisionChanged: true, previous: "rejected" },
    });
    const text = chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => String(chunk.delta)).join("");
    expect(text).toContain("**Zmieniona ocena**");
    expect(text).toContain("To jest wstępna ocena przygotowana automatycznie.");
    expect(chunks.find((chunk) => chunk.type === "finish")).toMatchObject({ messageMetadata: { decision: "accepted" } });
    expect(await readFile(LOG_PATH, "utf8")).toContain('"event":"decision_revised"');
  });

  it("does not apply a same-decision tool call without corrections", async () => {
    const record = makeRecord(returning);
    getCaseStore().create(record);
    const replay = toolArgumentVariant(
      createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]),
      { newDecision: "rejected", reason: "Brak nowych okoliczności." },
    );
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));

    expect(getCaseStore().get(CASE_ID)?.currentDecision).toBe("rejected");
    expect(chunks.some((chunk) => chunk.type === "data-decision")).toBe(false);
    expect(chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => String(chunk.delta)).join(""))
      .not.toContain("To jest wstępna ocena przygotowana automatycznie.");
    expect(await readFile(LOG_PATH, "utf8")).toContain('"event":"revision_rejected"');
  });

  it("checks an online-withdrawal rejection against the stored statutory-exclusion citations", async () => {
    const record = makeRecord(returning);
    record.outcome.citedSections = ["§4 ust. 1"];
    getCaseStore().create(record);
    const replay = toolArgumentVariant(
      createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]),
      { newDecision: "rejected", reason: "Zastosowanie wyjątku ustawowego.", corrections: { channel: "online" } },
    );
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));

    expect(getCaseStore().get(CASE_ID)?.currentDecision).toBe("rejected");
    expect(chunks.find((chunk) => chunk.type === "data-decision")).toMatchObject({
      data: { decision: "rejected", previous: "rejected" },
    });
  });

  it.each([
    ["model response", "Ta sama decyzja po korekcie kanału."],
    ["empty model response", ""],
  ])("does not write the server revision header for an applied same-decision correction (%s)", async (_responseType, modelText) => {
    const record = makeRecord(returning);
    record.outcome.citedSections = ["§4 ust. 1"];
    getCaseStore().create(record);
    const replay = stepTwoTextVariant(
      toolArgumentVariant(
        createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]),
        { newDecision: "rejected", reason: "Korekta kanału nie zmienia oceny.", corrections: { channel: "online" } },
      ),
      modelText,
    );
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));
    const toolOutput = chunks.find((chunk) => chunk.type === "tool-output-available") as { output?: unknown } | undefined;
    const text = chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => String(chunk.delta)).join("");

    expect(toolOutput?.output).toEqual({
      applied: true,
      decisionChanged: false,
      previous: "rejected",
      note: "Facts corrected; the decision is unchanged. Do not write 'Zmieniona ocena'; explain that the correction was noted and why the decision stays.",
    });
    expect(getCaseStore().get(CASE_ID)?.currentDecision).toBe("rejected");
    expect(chunks.find((chunk) => chunk.type === "data-decision")).toMatchObject({
      data: {
        decision: "rejected",
        previous: "rejected",
        decisionChanged: false,
        corrections: { channel: "online" },
      },
    });
    expect(text).not.toContain("**Zmieniona ocena**");
    if (modelText) expect(text).toContain(modelText);
  });

  it("allows escalation even when the corrected return is outside every return window", async () => {
    const expired: CaseInput = { ...returning, purchaseDate: "2026-09-01" };
    const record = makeRecord(expired);
    getCaseStore().create(record);
    const replay = toolArgumentVariant(
      createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]),
      { newDecision: "escalated", reason: "Klient poprosił o kontakt ze specjalistą.", corrections: { channel: "online" } },
    );
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));

    expect(getCaseStore().get(CASE_ID)?.currentDecision).toBe("escalated");
    expect(chunks.find((chunk) => chunk.type === "data-decision")).toMatchObject({ data: { decision: "escalated" } });
    expect(await readFile(LOG_PATH, "utf8")).toContain('"event":"decision_revised"');
  });

  it("rejects acceptance for an expired complaint", async () => {
    const record = makeRecord(expiredComplaint);
    getCaseStore().create(record);
    const replay = createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]);
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));

    expect(getCaseStore().get(CASE_ID)?.currentDecision).toBe("rejected");
    expect(chunks.some((chunk) => chunk.type === "data-decision")).toBe(false);
    expect(await readFile(LOG_PATH, "utf8")).toContain('"event":"revision_rejected"');
  });

  it("guards against text emitted before the tool and leaves the decision unchanged", async () => {
    const record = makeRecord(returning);
    getCaseStore().create(record);
    const replay = textBeforeToolVariant(createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]));
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));

    expect(getCaseStore().get(CASE_ID)?.currentDecision).toBe("rejected");
    expect(chunks.some((chunk) => chunk.type === "data-decision")).toBe(false);
    expect(await readFile(LOG_PATH, "utf8")).toContain('"event":"revision_order_violation"');
  });

  it("runs the tool once when step 2 is a second tool call and writes a code-built fallback text", async () => {
    const record = makeRecord(returning);
    getCaseStore().create(record);
    // Mutation (MUTATIONS.md): step-2 exchange replaced with the captured step-1 tool-call exchange.
    const replay = createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step1"]);
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));

    expect(chunks.filter((chunk) => chunk.type === "data-decision")).toHaveLength(1);
    expect(getCaseStore().get(CASE_ID)?.revisions).toHaveLength(1);
    expect(getCaseStore().get(CASE_ID)?.currentDecision).toBe("accepted");
    expect(replay.requests).toHaveLength(2);
    const secondBody = JSON.parse(replay.requests[1]!.body ?? "{}") as { tool_choice?: unknown; tools?: unknown[] };
    expect(secondBody.tool_choice === "none" || !secondBody.tools?.length).toBe(true);

    const text = chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => String(chunk.delta)).join("");
    expect(text.startsWith("**Zmieniona ocena**")).toBe(true);
    expect(text).toContain("Poprzednia ocena: Wstępnie odrzucono. Nowa ocena: Wstępnie zaakceptowano.");
    expect(text).toContain("Powód: ");
    expect(text).toContain(pl.chat.revision.nextSteps.accepted);
    expect(text.split(pl.disclaimer)).toHaveLength(2);
    expect(text.trimEnd().endsWith(pl.disclaimer)).toBe(true);
    expect(chunks.some((chunk) => chunk.type === "error" || chunk.type === "tool-input-error")).toBe(false);
    const finishIndex = chunks.findIndex((chunk) => chunk.type === "finish");
    expect(chunks.findLastIndex((chunk) => chunk.type === "text-end")).toBeLessThan(finishIndex);
    expect(await readFile(LOG_PATH, "utf8")).not.toContain('"event":"chat_failed"');
    expect(chunks.find((chunk) => chunk.type === "finish")).toMatchObject({ messageMetadata: { decision: "accepted" } });
  });

  it("does not add the fallback text when the model wrote its own text after the tool", async () => {
    const record = makeRecord(returning);
    getCaseStore().create(record);
    const replay = createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]);
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));
    const text = chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => String(chunk.delta)).join("");

    expect(text).not.toContain("Poprzednia ocena:");
    expect(text.split(pl.disclaimer)).toHaveLength(2);
  });
  it("T21.5: writes the server-built revision header before model text that lacks the label and the decisions", async () => {
    const record = makeRecord(returning);
    getCaseStore().create(record);
    const own = "Zmieniłem ocenę po Twojej korekcie kanału zakupu.";
    const replay = stepTwoTextVariant(createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]), own);
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));
    const text = chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => String(chunk.delta)).join("");

    expect(text.startsWith("**Zmieniona ocena**")).toBe(true);
    expect(text).toContain("Poprzednia ocena: Wstępnie odrzucono. Nowa ocena: Wstępnie zaakceptowano.");
    expect(text.indexOf(own)).toBeGreaterThan(text.indexOf("Nowa ocena:"));
    expect(text).not.toContain("Powód: ");
    expect(text.split(pl.disclaimer)).toHaveLength(2);
    const types = chunks.map((chunk) => chunk.type);
    expect(types.lastIndexOf("text-end")).toBeLessThan(types.indexOf("finish"));
    expect(types.indexOf("finish-step")).toBeGreaterThan(-1);
    expect(chunks.some((chunk) => chunk.type === "error")).toBe(false);
  });

  it("T21.5: does not duplicate the header when the model text already starts with it and names both decisions", async () => {
    const record = makeRecord(returning);
    getCaseStore().create(record);
    const replay = createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]);
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));
    const text = chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => String(chunk.delta)).join("");

    expect(text.split("**Zmieniona ocena**")).toHaveLength(2);
    expect(text.startsWith("**Zmieniona ocena**")).toBe(true);
  });

  it("T21.6: does not append the disclaimer when the model text of this turn already contains it", async () => {
    const record = makeRecord(returning);
    getCaseStore().create(record);
    const own = `**Zmieniona ocena**\n\nPoprzednia ocena: Wstępnie odrzucono. Nowa ocena: Wstępnie zaakceptowano.\n\n${pl.disclaimer}`;
    const replay = stepTwoTextVariant(createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]), own);
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));
    const text = chunks.filter((chunk) => chunk.type === "text-delta").map((chunk) => String(chunk.delta)).join("");

    expect(text.split(pl.disclaimer)).toHaveLength(2);
    expect(text.split("**Zmieniona ocena**")).toHaveLength(2);
  });

  it("T21.7: decision_revised logs reasonCodes chat_revision and no stale citedSections", async () => {
    const record = makeRecord(returning);
    getCaseStore().create(record);
    const replay = createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]);
    await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));
    const lines = (await readFile(LOG_PATH, "utf8")).trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    const revised = lines.find((line) => line.event === "decision_revised");

    expect(revised).toBeDefined();
    expect(revised?.reasonCodes).toEqual(["chat_revision"]);
    expect(revised).not.toHaveProperty("citedSections");
    expect(JSON.stringify(revised)).not.toContain("used_item_voluntary");
  });
  it("T21.9: rejects a revision to accepted without corrections (accepted_requires_corrections) and logs revision_rejected", async () => {
    const record = makeRecord(returning);
    getCaseStore().create(record);
    // Declared mutation (MUTATIONS.md): captured `accepted` + channel correction -> `accepted` without corrections.
    const replay = toolArgumentVariant(
      createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]),
      { newDecision: "accepted", reason: "Klient nalega na akceptacji." },
    );
    const chunks = await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));

    expect(getCaseStore().get(CASE_ID)?.currentDecision).toBe("rejected");
    expect(getCaseStore().get(CASE_ID)?.revisions).toHaveLength(0);
    expect(chunks.some((chunk) => chunk.type === "data-decision")).toBe(false);
    const output = chunks.find((chunk) => chunk.type === "tool-output-available") as { output?: unknown } | undefined;
    expect(output?.output).toEqual({ applied: false, violation: "accepted_requires_corrections" });
    expect(await readFile(LOG_PATH, "utf8")).toContain('"event":"revision_rejected"');
  });

  it("T21.9: still allows escalated, rejected and needs_info without corrections", async () => {
    for (const decision of ["escalated", "needs_info"] as const) {
      getCaseStore().clear();
      const record = makeRecord(returning);
      getCaseStore().create(record);
      const replay = toolArgumentVariant(
        createReplayFetch(["llm-chat-tool-step1", "llm-chat-tool-step2"]),
        { newDecision: decision, reason: "Nowa okoliczność wymaga weryfikacji." },
      );
      await readChunks(await chatStream(record, messages(record), AbortSignal.timeout(10_000), { fetch: replay }));
      expect(getCaseStore().get(CASE_ID)?.currentDecision).toBe(decision);
    }
  });
});
