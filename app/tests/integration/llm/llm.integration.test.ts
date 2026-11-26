import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseInput, ImageAnalysis } from "@/lib/domain";
import { computeFacts, type ClassifierAnswer, type ClassifierResult } from "@/server/rules";
import { processImage } from "@/server/images";
import { analyzeImage } from "@/server/llm/analyze-image";
import { decide } from "@/server/llm/decide";
import {
  applyMutation,
  createReplayFetch,
  loadRecording,
  type ReplayFetch,
  type ReplayRequest,
} from "../../helpers/replay-fetch";

const CAPTURES = path.resolve(process.cwd(), "tests/fixtures/captured");
const PHOTOS = path.resolve(process.cwd(), "../assets/example-images");
const CASE_ID = "HSD-20261126-T3B1";
const TODAY = "2026-11-26";

const complaint: CaseInput = {
  caseType: "complaint",
  category: "laptop",
  model: "Acer Aspire 5",
  purchaseDate: "2026-09-01",
  channel: "online",
  description: "Ekran laptopa pękł w lewym rogu i pojawiły się pionowe pasy.",
};

const returning: CaseInput = {
  caseType: "return",
  category: "smartphone",
  model: "Samsung Galaxy A54",
  purchaseDate: "2026-11-10",
  channel: "online",
  description: "",
};

type CapturedJevAnswer = {
  type: "noul" | "choice" | "score";
  noul?: number;
  choice?: string;
  probabilities?: Record<string, number>;
};

async function recordedJson<T>(name: string): Promise<T> {
  const { body } = await loadRecording(name);
  const completion = JSON.parse(body.toString("utf8")) as {
    choices: [{ message: { content: string } }];
  };
  return JSON.parse(completion.choices[0].message.content) as T;
}

async function recordedJev(name: string): Promise<ClassifierResult> {
  const { body } = await loadRecording(name);
  const response = JSON.parse(body.toString("utf8")) as {
    model: string;
    answers: Record<string, CapturedJevAnswer>;
  };
  const answers: Record<string, ClassifierAnswer> = {};

  for (const [id, answer] of Object.entries(response.answers)) {
    if (answer.type === "noul") {
      const probability = answer.noul ?? 0;
      answers[id] = {
        value: probability >= 0.5,
        certainty: Math.max(probability, 1 - probability),
        raw: answer,
      };
    } else if (answer.type === "choice") {
      const value = answer.choice ?? "";
      answers[id] = { value, certainty: answer.probabilities?.[value] ?? 0, raw: answer };
    } else {
      const highest = Object.entries(answer.probabilities ?? {}).sort((left, right) => right[1] - left[1])[0];
      answers[id] = { value: Number(highest?.[0] ?? 0), certainty: highest?.[1] ?? 0, raw: answer };
    }
  }

  return { answers, model: response.model };
}

async function jpeg(name: string): Promise<Buffer> {
  return (await processImage(await readFile(path.join(PHOTOS, name)))).jpegBuffer;
}

async function requestBody(request: ReplayRequest): Promise<Record<string, unknown>> {
  return JSON.parse(request.body ?? "{}") as Record<string, unknown>;
}

async function recordedRequestBody(name: string): Promise<Record<string, unknown>> {
  const text = await readFile(path.join(CAPTURES, name, "request.json"), "utf8");
  return (JSON.parse(text) as { body: Record<string, unknown> }).body;
}

function mutateFirstReplay(replay: ReplayFetch, pathName: string, value: unknown): ReplayFetch {
  let count = 0;
  return Object.assign(
    (async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await replay(input, init);
      if (count++ !== 0) return response;
      const original = await response.json() as unknown;
      const mutated = applyMutation(original, pathName, value);
      return new Response(JSON.stringify(mutated), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }) as ReplayFetch,
    { requests: replay.requests },
  );
}

function messageText(message: unknown): string {
  if (typeof message === "string") return message;
  if (!Array.isArray(message)) return "";
  return message
    .map((part) => (part && typeof part === "object" && "text" in part ? String(part.text) : ""))
    .join("\n");
}

function decisionRequestMessage(request: ReplayRequest, role: "system" | "user"): string {
  const body = JSON.parse(request.body ?? "{}") as {
    messages: { role: string; content: unknown }[];
  };
  const message = body.messages.find((candidate) => candidate.role === role);
  return messageText(message?.content);
}

async function prepareDecision(caseInput: CaseInput, caseType: "complaint" | "return") {
  const prefix = caseType === "complaint" ? "complaint-laptop-1" : "return-phone-1";
  const classifier = await recordedJev(`jev-${prefix}`);
  const analysis = await recordedJson<ImageAnalysis>(`llm-vision-${prefix}`);
  const facts = computeFacts(caseInput, TODAY);
  return { classifier, analysis, facts };
}

describe("LLM layer with real OpenRouter provider and captured exchanges", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "synthetic-test-key");
    vi.stubEnv("LLM_MODEL", "openai/gpt-6-luna");
    vi.stubEnv("VISION_MODEL", "openai/gpt-6-luna");
    vi.stubEnv("LLM_REASONING_EFFORT", "medium");
    vi.stubEnv("POLICIES_DIR", "../docs/policies");
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([
    {
      input: complaint,
      image: "laptop-1.png",
      recording: "llm-vision-complaint-laptop-1",
      jev: "jev-complaint-laptop-1",
    },
    {
      input: returning,
      image: "phone-1.jpg",
      recording: "llm-vision-return-phone-1",
      jev: "jev-return-phone-1",
    },
  ])("replays the $recording vision request through the real provider", async ({ input, image, recording, jev }) => {
    const replay = createReplayFetch([recording]);
    const result = await analyzeImage(
      input,
      await jpeg(image),
      await recordedJev(jev),
      AbortSignal.timeout(5_000),
      { fetch: replay, apiKey: "synthetic-test-key" },
    );

    expect(result).toEqual(await recordedJson<ImageAnalysis>(recording));
    expect(result.usable).toEqual(expect.any(Boolean));
    expect(result.conditionSummaryPl.length).toBeGreaterThan(0);
    expect(replay.requests).toHaveLength(1);
    expect(replay.requests[0]?.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const body = await requestBody(replay.requests[0]!);
    expect(body).toEqual(await recordedRequestBody(recording));
    expect(body).toMatchObject({
      model: "openai/gpt-6-luna",
      temperature: 0,
      response_format: { json_schema: { strict: false } },
    });
    expect(decisionRequestMessage(replay.requests[0]!, "system")).toContain(`# Role`);
  });

  it.each([
    {
      input: complaint,
      recording: "llm-decision-complaint-laptop-1",
      type: "complaint" as const,
    },
    {
      input: returning,
      recording: "llm-decision-return-phone-1",
      type: "return" as const,
    },
  ])("decides from the $type policy recording and isolates policy text", async ({ input, recording, type }) => {
    // Declared mutation (MUTATIONS.md): the real return recording writes section ranges such as
    // "§3 ust. 1–2" while citedSections lists "§3 ust. 2" separately, which validateFirstMessage rejects.
    // Expand the ranges so the recorded decision stays on the valid-first-attempt path under test.
    const recordedOutcome = await recordedJson<Record<string, unknown>>(recording);
    const expandedMessage = String(recordedOutcome.messageMarkdown).replace(
      /§(\d+) ust\. (\d+)–(\d+)/g,
      "§$1 ust. $2, §$1 ust. $3",
    );
    const replay = createReplayFetch([recording], {
      mutations:
        type === "return"
          ? [{
              recordingName: recording,
              path: "choices.0.message.content",
              value: JSON.stringify({ ...recordedOutcome, messageMarkdown: expandedMessage }),
            }]
          : [],
    });
    const { classifier, analysis, facts } = await prepareDecision(input, type);
    const result = await decide(input, facts, analysis, classifier, CASE_ID, AbortSignal.timeout(5_000), {
      fetch: replay,
      apiKey: "synthetic-test-key",
    });

    expect(result.outcome.path).toBe("llm");
    expect(result.inconsistent).toBe(false);
    expect(result.outcome.decision).toBe((await recordedJson<{ decision: string }>(recording)).decision);
    expect(await requestBody(replay.requests[0]!)).toEqual(await recordedRequestBody(recording));

    const system = decisionRequestMessage(replay.requests[0]!, "system");
    const ownPolicy = type === "complaint" ? "complaint-policy.md" : "return-policy.md";
    const oppositePolicy = type === "complaint" ? "return-policy.md" : "complaint-policy.md";
    const policyText = await readFile(path.resolve(process.cwd(), "../docs/policies", ownPolicy), "utf8");
    const oppositePolicyText = await readFile(path.resolve(process.cwd(), "../docs/policies", oppositePolicy), "utf8");
    expect(system).toContain("<policy>");
    expect(system).toContain(policyText);
    expect(system).not.toContain(oppositePolicyText);
    expect(system).toContain(type === "complaint" ? "decision agent for **complaints**" : "decision agent for **returns**");

    const user = decisionRequestMessage(replay.requests[0]!, "user");
    expect(user).toContain(`Numer sprawy: ${CASE_ID}`);
    expect(user).toContain("DateFacts (JSON):");
    expect(user).toContain("ImageAnalysis (JSON):");
    expect(user).toContain("Odpowiedzi klasyfikatora Jev z pewnością (JSON):");
  });

  it("retries one hard-rule violation and returns the valid recorded decision", async () => {
    const mutated = await recordedJson<Record<string, unknown>>("llm-decision-complaint-laptop-1");
    const firstDecision = applyMutation(mutated, "decision", "accepted");
    const firstContent = JSON.stringify(firstDecision);
    const replay = mutateFirstReplay(
      createReplayFetch(["llm-decision-complaint-laptop-1", "llm-decision-complaint-laptop-1"]),
      "choices.0.message.content",
      firstContent,
    );
    const expired = { ...complaint, purchaseDate: "2023-09-01" };
    const { classifier, analysis, facts } = await prepareDecision(expired, "complaint");
    const result = await decide(expired, facts, analysis, classifier, CASE_ID, AbortSignal.timeout(5_000), {
      fetch: replay,
      apiKey: "synthetic-test-key",
    });

    expect(replay.requests).toHaveLength(2);
    expect(result).toMatchObject({ inconsistent: false, outcome: { decision: "rejected", path: "llm" } });
    expect(decisionRequestMessage(replay.requests[1]!, "user")).toMatch(/expired_complaint_must_be_rejected_or_escalated/);
  });

  it("returns an escalated llm_inconsistent template when both attempts violate a hard rule", async () => {
    const mutated = await recordedJson<Record<string, unknown>>("llm-decision-complaint-laptop-1");
    const replay = createReplayFetch(
      ["llm-decision-complaint-laptop-1", "llm-decision-complaint-laptop-1"],
      {
        mutations: [{
          recordingName: "llm-decision-complaint-laptop-1",
          path: "choices.0.message.content",
          value: JSON.stringify(applyMutation(mutated, "decision", "accepted")),
        }],
      },
    );
    const expired = { ...complaint, purchaseDate: "2023-09-01" };
    const { classifier, analysis, facts } = await prepareDecision(expired, "complaint");
    const result = await decide(expired, facts, analysis, classifier, CASE_ID, AbortSignal.timeout(5_000), {
      fetch: replay,
      apiKey: "synthetic-test-key",
    });

    expect(replay.requests).toHaveLength(2);
    expect(result).toMatchObject({
      inconsistent: true,
      outcome: {
        decision: "escalated",
        reasonCodes: ["llm_inconsistent"],
        path: "llm",
      },
    });
    expect(result.outcome.messageMarkdown).toContain("## Wstępna ocena");
    expect(result.outcome.messageMarkdown).toContain("Nie udało się uzyskać spójnej oceny");
  });

  it.each([
    { recording: "llm-error-unknown-model", status: 400 },
    { recording: "llm-error-401", status: 401 },
  ])("maps recorded HTTP $status response to LlmError(upstream)", async ({ recording }) => {
    const replay = createReplayFetch([recording]);
    const { classifier, analysis, facts } = await prepareDecision(complaint, "complaint");
    await expect(decide(complaint, facts, analysis, classifier, CASE_ID, AbortSignal.timeout(5_000), {
      fetch: replay,
      apiKey: "synthetic-test-key",
    })).rejects.toMatchObject({ kind: "upstream" });
  });

  it("maps a network TypeError to LlmError(upstream)", async () => {
    const replay = createReplayFetch(["llm-decision-complaint-laptop-1"], { failWith: "network" });
    const { classifier, analysis, facts } = await prepareDecision(complaint, "complaint");
    await expect(decide(complaint, facts, analysis, classifier, CASE_ID, AbortSignal.timeout(5_000), {
      fetch: replay,
      apiKey: "synthetic-test-key",
    })).rejects.toMatchObject({ kind: "upstream" });
  });

  it("maps a recorded OpenRouter error body returned with HTTP 200 to upstream", async () => {
    const recordedError = createReplayFetch(["llm-error-unknown-model"]);
    const replay = Object.assign(
      (async (input: RequestInfo | URL, init?: RequestInit) => {
        const response = await recordedError(input, init);
        return new Response(await response.arrayBuffer(), { status: 200, headers: response.headers });
      }) as ReplayFetch,
      { requests: recordedError.requests },
    );
    const { classifier, analysis, facts } = await prepareDecision(complaint, "complaint");
    await expect(decide(complaint, facts, analysis, classifier, CASE_ID, AbortSignal.timeout(5_000), {
      fetch: replay,
      apiKey: "synthetic-test-key",
    })).rejects.toMatchObject({ kind: "upstream" });
  });

  it("maps an abort during delayed replay to LlmError(timeout)", async () => {
    const replay = createReplayFetch(["llm-decision-complaint-laptop-1"], { delayMs: 100 });
    const { classifier, analysis, facts } = await prepareDecision(complaint, "complaint");
    await expect(decide(complaint, facts, analysis, classifier, CASE_ID, AbortSignal.timeout(5), {
      fetch: replay,
      apiKey: "synthetic-test-key",
    })).rejects.toMatchObject({ kind: "timeout" });
  });

  it("keeps captured success metadata available to replay tests", async () => {
    const decision = await loadRecording("llm-decision-complaint-laptop-1");
    const capture = JSON.parse(await readFile(path.join(CAPTURES, "llm-decision-complaint-laptop-1/capture.json"), "utf8")) as {
      today: string;
      modelRequested: string;
    };

    expect(decision.meta.status).toBe(200);
    expect(capture).toMatchObject({ today: TODAY, modelRequested: "openai/gpt-6-luna" });
  });
});
