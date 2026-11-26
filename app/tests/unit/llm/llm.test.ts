import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionOutcomeSchema, ImageAnalysisSchema, type CaseInput, type ImageAnalysis } from "@/lib/domain";
import { computeFacts, type ClassifierAnswer, type ClassifierResult } from "@/server/rules";
import { analyzeImage } from "@/server/llm/analyze-image";
import { decide } from "@/server/llm/decide";
import { loadRecording } from "../../helpers/replay-fetch";

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

type CapturedJevAnswer = {
  type: "noul" | "choice" | "score";
  noul?: number;
  choice?: string;
  probabilities?: Record<string, number>;
};

async function recordedContent(name: string): Promise<string> {
  const { body } = await loadRecording(name);
  const response = JSON.parse(body.toString("utf8")) as { choices: [{ message: { content: string } }] };
  return response.choices[0].message.content;
}

async function recordedJson<T>(name: string): Promise<T> {
  return JSON.parse(await recordedContent(name)) as T;
}

async function classifierFromRecording(): Promise<ClassifierResult> {
  const { body } = await loadRecording("jev-complaint-laptop-1");
  const response = JSON.parse(body.toString("utf8")) as {
    model: string;
    answers: Record<string, CapturedJevAnswer>;
  };
  const answers: Record<string, ClassifierAnswer> = {};

  for (const [id, answer] of Object.entries(response.answers)) {
    if (answer.type === "noul") {
      const probability = answer.noul ?? 0;
      answers[id] = { value: probability >= 0.5, certainty: Math.max(probability, 1 - probability), raw: answer };
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

function mockModel(recording: string, prompts: unknown[][]) {
  return new MockLanguageModelV4({
    doGenerate: async ({ prompt }) => {
      prompts.push(prompt as unknown[]);
      return {
        content: [{ type: "text", text: await recordedContent(recording) }],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 1, text: 1, reasoning: undefined },
        },
        warnings: [],
      };
    },
  });
}

describe("LLM prompt assembly (recording-backed MockLanguageModelV4)", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "synthetic-test-key");
    vi.stubEnv("LLM_MODEL", "openai/gpt-6-luna");
    vi.stubEnv("VISION_MODEL", "openai/gpt-6-luna");
    vi.stubEnv("LLM_REASONING_EFFORT", "medium");
    vi.stubEnv("POLICIES_DIR", "../docs/policies");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("builds vision complaint prompt with case data and Jev answers as unverified hints", async () => {
    const prompts: unknown[][] = [];
    const classifier = await classifierFromRecording();
    const image = Buffer.from("unit test image bytes");
    const model = mockModel("llm-vision-complaint-laptop-1", prompts);
    const result = await analyzeImage(complaint, image, classifier, AbortSignal.timeout(5_000), { model });

    expect(ImageAnalysisSchema.safeParse(result).success).toBe(true);
    expect(prompts).toHaveLength(1);
    const prompt = JSON.stringify(prompts[0]);
    expect(prompt).toContain("image analyst for the complaint");
    expect(prompt).toContain("Dane z formularza (unverified hints, sprawdź ze zdjęciem)");
    expect(prompt).toContain("Odpowiedzi klasyfikatora Jev (unverified hints)");
    expect(prompt).toContain(complaint.description);
  });

  it("builds the decision request from the correct prompt, policy and recorded content", async () => {
    const prompts: unknown[][] = [];
    const classifier = await classifierFromRecording();
    const analysis = await recordedJson<ImageAnalysis>("llm-vision-complaint-laptop-1");
    const model = mockModel("llm-decision-complaint-laptop-1", prompts);
    const facts = computeFacts(complaint, TODAY);
    const result = await decide(complaint, facts, analysis, classifier, CASE_ID, AbortSignal.timeout(5_000), { model });
    expect(result.inconsistent).toBe(false);
    expect(DecisionOutcomeSchema.safeParse(result.outcome).success).toBe(true);
    expect(result.outcome).toMatchObject({ decision: "rejected", path: "llm" });
    expect(prompts).toHaveLength(1);
    const prompt = JSON.stringify(prompts[0]);
    expect(prompt).toContain("decision agent for **complaints**");
    expect(prompt).toContain("Wybór między naprawą a wymianą należy do klienta");
    expect(prompt).toContain("<policy>");
    expect(prompt).not.toContain("Return only");
    expect(prompt).toContain(`Numer sprawy: ${CASE_ID}`);
    expect(prompt).toContain("DateFacts (JSON):");
    expect(prompt).toContain("ImageAnalysis (JSON):");
    expect(prompt).toContain("Odpowiedzi klasyfikatora Jev z pewnością (JSON):");
  });
});
