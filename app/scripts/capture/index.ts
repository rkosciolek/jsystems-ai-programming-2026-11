import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output, stepCountIs, streamText, tool } from "ai";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { z } from "zod";
import type { CaseInput } from "../../src/lib/domain";
import { buildJevRequest, questionSetHash } from "../../src/server/classifier/questions";
import { processImage } from "../../src/server/images";
import { getPrompt, promptHash, type PromptName } from "../../src/server/prompts";
import {
  DecisionOutcomeSchema,
  ImageAnalysisSchema,
  ReviseDecisionInputSchema,
  todayInWarsaw,
  type DecisionOutcome,
  type ImageAnalysis,
} from "../../src/lib/domain";
import { CASE_NUMBER, clearRecording, facts, formJson, jevAnswers, policyHash, policyText, recordedJson } from "./llm";
import { recordingFetch, recordingSequence } from "./recorder";

// Run: npm run capture            (all recordings)
//      CAPTURE_ONLY=smoke npm run capture   (gate smoke checks, nothing saved)
const JEV_URL = "https://openrouter.ai/api/alpha/decisions";
const JEV_MODEL = "typesafe/jev-1.14";
const LLM_MODEL = "openai/gpt-6-luna";
const BAD_KEY = "sk-or-invalid-test";
const IMAGES = join(process.cwd(), "..", "assets", "example-images");
const only = process.env.CAPTURE_ONLY;
const want = (name: string) => !only || only === name || (only === "all" && name !== "smoke");

const apiKey = process.env.OPENROUTER_API_KEY ?? "";

// Jev accepts at most 1568 px per side and 2,458,624 px in total (OpenRouter multimodal-decisions
// guide). The ADR-002 §3.3 output (2048 px edge) is too large for laptop-1.png: Jev answers 400
// "Invalid image dimensions". Recordings therefore shrink the processed JPEG to 1568 px.
const JEV_MAX_EDGE = 1568;

async function photo(file: string) {
  const processed = (await processImage(readFileSync(join(IMAGES, file)))).jpegBuffer;
  return sharp(processed)
    .resize({ width: JEV_MAX_EDGE, height: JEV_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

async function callJev(fetchImpl: typeof fetch, key: string, body: unknown) {
  return fetchImpl(JEV_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const complaint: CaseInput = {
  caseType: "complaint",
  category: "laptop",
  model: "Acer Aspire 5",
  purchaseDate: "2026-09-01",
  channel: "online",
  description: "Ekran laptopa pękł w lewym rogu i pojawiły się pionowe pasy.",
};
const returnBase: CaseInput = {
  caseType: "return",
  category: "smartphone",
  model: "Samsung Galaxy A54",
  purchaseDate: "2026-11-10",
  channel: "online",
  description: "",
};

const jevRecordings = [
  { name: "jev-complaint-laptop-1", file: "laptop-1.png", input: complaint },
  { name: "jev-complaint-laptop-2", file: "laptop-2.webp", input: complaint },
  { name: "jev-return-phone-1", file: "phone-1.jpg", input: returnBase },
  {
    name: "jev-return-phone-3",
    file: "phone-3.jpeg",
    input: { ...returnBase, description: "Telefon nie spełnił moich oczekiwań, odsyłam w terminie." },
  },
];

describe("capture", () => {
  it.skipIf(!want("smoke") || only !== "smoke")("smoke: Jev + Luna through provider with injected fetch", async () => {
    expect(apiKey, "T01 blocked: key missing").not.toBe("");
    const jpeg = await photo("laptop-1.png");
    const res = await callJev(fetch, apiKey, buildJevRequest(complaint, jpeg, JEV_MODEL));
    const text = await res.text();
    console.log("JEV status", res.status, text.slice(0, 1500));
    expect(res.status).toBe(200);

    let injected = 0;
    const provider = createOpenRouter({
      apiKey,
      fetch: (async (i: Parameters<typeof fetch>[0], init?: RequestInit) => {
        injected++;
        return fetch(i, init);
      }) as typeof fetch,
    });
    const out = await generateText({
      model: provider.chat(LLM_MODEL),
      output: Output.object({ schema: z.object({ device: z.string() }) }),
      maxRetries: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What device is in the photo? Answer in one or two words." },
            { type: "file", data: jpeg, mediaType: "image/jpeg" },
          ],
        },
      ],
    });
    console.log("LUNA output", JSON.stringify(out.output), "injectedFetchCalls", injected);
    expect(injected).toBeGreaterThan(0);

    const models = await (await fetch("https://openrouter.ai/api/v1/models")).json();
    const m = (models.data as { id: string; architecture?: { input_modalities?: string[] } }[]).find(
      (x) => x.id === LLM_MODEL,
    );
    console.log("LUNA input_modalities", JSON.stringify(m?.architecture?.input_modalities));
  });

  for (const rec of jevRecordings) {
    it.skipIf(!want(rec.name))(rec.name, async () => {
      expect(apiKey, "T01 blocked: key missing").not.toBe("");
      const jpeg = await photo(rec.file);
      const request = buildJevRequest(rec.input, jpeg, JEV_MODEL);
      const f = recordingFetch(rec.name, {
        modelRequested: JEV_MODEL,
        questionSetHash: questionSetHash(rec.input.caseType, rec.input.description.length > 0),
        photo: rec.file,
      });
      const res = await callJev(f, apiKey, request);
      expect(res.status).toBe(200);
    });
  }

  it.skipIf(!want("jev-error-unknown-model"))("jev-error-unknown-model", async () => {
    const jpeg = await photo("laptop-1.png");
    const f = recordingFetch("jev-error-unknown-model", {
      modelRequested: "invalid/does-not-exist",
      questionSetHash: questionSetHash("complaint"),
      photo: "laptop-1.png",
    });
    const res = await callJev(f, apiKey, buildJevRequest(complaint, jpeg, "invalid/does-not-exist"));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it.skipIf(!want("jev-error-401"))("jev-error-401", async () => {
    const jpeg = await photo("laptop-1.png");
    const f = recordingFetch("jev-error-401", {
      modelRequested: JEV_MODEL,
      questionSetHash: questionSetHash("complaint"),
      photo: "laptop-1.png",
    });
    const res = await callJev(f, BAD_KEY, buildJevRequest(complaint, jpeg, JEV_MODEL));
    expect(res.status).toBe(401);
  });

  for (const [name, key, model] of [
    ["llm-error-unknown-model", apiKey, "invalid/does-not-exist"],
    ["llm-error-401", BAD_KEY, LLM_MODEL],
  ] as const) {
    it.skipIf(!want(name))(name, async () => {
      const provider = createOpenRouter({
        apiKey: key,
        fetch: recordingFetch(name, { modelRequested: model, photo: "none (text-only request)" }),
      });
      await expect(
        generateText({ model: provider.chat(model), prompt: "Say OK.", maxRetries: 0 }),
      ).rejects.toThrow();
    });
  }

  // ---- T03b: LLM recordings with the real prompts and schemas -------------------------------
  const provider = (name: string | string[], prompts: PromptName[], input: CaseInput, photoName: string, model = LLM_MODEL) => {
    const meta = {
      modelRequested: model,
      photo: photoName,
      today: todayInWarsaw(),
      promptHashes: Object.fromEntries(prompts.map((p) => [p, promptHash(p)])),
      policyHash: policyHash(input.caseType),
    };
    return createOpenRouter({
      apiKey,
      fetch: Array.isArray(name) ? recordingSequence(name, meta) : recordingFetch(name, meta),
    });
  };
  const reasoning = { openrouter: { reasoning: { effort: "medium" } } } as const;

  const visionCases = [
    { name: "llm-vision-complaint-laptop-1", prompt: "vision-complaint", jev: "jev-complaint-laptop-1", file: "laptop-1.png", input: complaint },
    { name: "llm-vision-return-phone-1", prompt: "vision-return", jev: "jev-return-phone-1", file: "phone-1.jpg", input: returnBase },
  ] as const;

  for (const c of visionCases) {
    it.skipIf(!want(c.name))(c.name, async () => {
      expect(apiKey, "T01 blocked: key missing").not.toBe("");
      clearRecording(c.name);
      const jpeg = (await processImage(readFileSync(join(IMAGES, c.file)))).jpegBuffer;
      const text = `Dane z formularza (unverified hints, sprawdź ze zdjęciem):\n${JSON.stringify(formJson(c.input))}\n\nOdpowiedzi klasyfikatora Jev (unverified hints):\n${JSON.stringify(jevAnswers(c.jev))}`;
      const run = (temperature: number | undefined) =>
        generateText({
          // strict json_schema + image part -> 200 with a 502 "provider_unavailable" body (finding, see report)
          model: provider(c.name, [c.prompt], c.input, c.file).chat(LLM_MODEL, { structuredOutputs: { strict: false } }),
          output: Output.object({ schema: ImageAnalysisSchema }),
          system: getPrompt(c.prompt),
          messages: [{ role: "user", content: [{ type: "file", data: jpeg, mediaType: "image/jpeg" }, { type: "text", text }] }],
          temperature,
          maxRetries: 1,
        });
      let out;
      try {
        out = await run(0);
      } catch (e) {
        console.log("temperature 0 failed, retry without:", (e as Error).message.slice(0, 300));
        clearRecording(c.name);
        out = await run(undefined);
      }
      console.log(c.name, JSON.stringify(out.output));
      expect(ImageAnalysisSchema.safeParse(out.output).success).toBe(true);
    });
  }

  const decisionCases = [
    { name: "llm-decision-complaint-laptop-1", prompt: "decision-complaint", vision: "llm-vision-complaint-laptop-1", jev: "jev-complaint-laptop-1", file: "laptop-1.png", input: complaint },
    { name: "llm-decision-return-phone-1", prompt: "decision-return", vision: "llm-vision-return-phone-1", jev: "jev-return-phone-1", file: "phone-1.jpg", input: returnBase },
  ] as const;

  for (const c of decisionCases) {
    it.skipIf(!want(c.name))(c.name, async () => {
      expect(apiKey, "T01 blocked: key missing").not.toBe("");
      clearRecording(c.name);
      const today = todayInWarsaw();
      const user = [
        `Numer sprawy: ${CASE_NUMBER}`,
        `Dane z formularza (JSON):\n${JSON.stringify(formJson(c.input))}`,
        `DateFacts (JSON):\n${JSON.stringify(facts(c.input, today))}`,
        `ImageAnalysis (JSON):\n${JSON.stringify(recordedJson<ImageAnalysis>(c.vision))}`,
        `Odpowiedzi klasyfikatora Jev z pewnością (JSON):\n${JSON.stringify(jevAnswers(c.jev))}`,
      ].join("\n\n");
      const out = await generateText({
        model: provider(c.name, [c.prompt], c.input, c.file).chat(LLM_MODEL),
        output: Output.object({ schema: DecisionOutcomeSchema }),
        system: `${getPrompt(c.prompt)}\n\n<policy>\n${policyText(c.input.caseType)}\n</policy>`,
        messages: [{ role: "user", content: user }],
        providerOptions: reasoning,
        maxRetries: 1,
      });
      console.log(c.name, JSON.stringify({ ...out.output, messageMarkdown: `(${out.output.messageMarkdown.length} chars)` }));
      expect(DecisionOutcomeSchema.safeParse(out.output).success).toBe(true);
    });
  }

  it.skipIf(!want("llm-chat-reply"))("llm-chat-reply", async () => {
    expect(apiKey, "T01 blocked: key missing").not.toBe("");
    clearRecording("llm-chat-reply");
    const today = todayInWarsaw();
    const decision = recordedJson<DecisionOutcome>("llm-decision-complaint-laptop-1");
    const caseBlock = {
      caseId: CASE_NUMBER,
      form: formJson(complaint),
      dateFacts: facts(complaint, today),
      classifierAnswers: jevAnswers("jev-complaint-laptop-1"),
      imageAnalysis: recordedJson<ImageAnalysis>("llm-vision-complaint-laptop-1"),
      currentDecision: decision.decision,
      revisions: [],
    };
    let toolCalls = 0;
    const result = streamText({
      model: provider("llm-chat-reply", ["chat"], complaint, "laptop-1.png").chat(LLM_MODEL),
      system: `${getPrompt("chat")}\n\n<policy>\n${policyText("complaint")}\n</policy>\n\n<case>\n${JSON.stringify(caseBlock, null, 2)}\n</case>`,
      messages: [
        { role: "assistant", content: decision.messageMarkdown },
        { role: "user", content: "Jaką datę zakupu podałem?" },
      ],
      tools: {
        revise_decision: tool({
          description: "Revise the preliminary decision when the customer states a new fact.",
          inputSchema: ReviseDecisionInputSchema,
          execute: async () => {
            toolCalls++;
            return { applied: false };
          },
        }),
      },
      stopWhen: stepCountIs(2),
      providerOptions: reasoning,
      maxRetries: 1,
    });
    const text = await result.text;
    console.log("llm-chat-reply toolCalls", toolCalls, text.slice(0, 400));
    expect(text.length).toBeGreaterThan(0);
  });

  it.skipIf(!want("llm-chat-tool"))("llm-chat-tool", async () => {
    expect(apiKey, "T01 blocked: key missing").not.toBe("");
    const names = ["llm-chat-tool-step1", "llm-chat-tool-step2"];
    // Hand-built case context (brief T03b): return from the phone-1 form, in-store, 10 days, rejected.
    const today = todayInWarsaw();
    const storeInput: CaseInput = {
      ...returnBase,
      channel: "store",
      purchaseDate: new Date(Date.parse(`${today}T00:00:00Z`) - 10 * 86_400_000).toISOString().slice(0, 10),
    };
    const caseBlock = {
      caseId: CASE_NUMBER,
      form: formJson(storeInput),
      dateFacts: facts(storeInput, today),
      classifierAnswers: jevAnswers("jev-return-phone-1"),
      imageAnalysis: recordedJson<ImageAnalysis>("llm-vision-return-phone-1"),
      currentDecision: "rejected",
      citedSections: ["§3 ust. 1", "§3 ust. 2"],
      revisions: [],
    };
    const firstMessage =
      "## Dzień dobry\n\nDziękujemy za zgłoszenie.\n\n## Podsumowanie zgłoszenia\n\n" +
      `- Numer sprawy: ${CASE_NUMBER}\n- Typ: zwrot\n- Kategoria: Smartfon\n- Model: ${storeInput.model}\n- Data zakupu: ${storeInput.purchaseDate}\n- Kanał zakupu: sklep stacjonarny\n\n` +
      "## Wstępna ocena\n\n**Wstępnie odrzucono**\n\n## Uzasadnienie\n\nZakup w sklepie stacjonarnym nie daje ustawowego prawa odstąpienia. Zwrot dobrowolny (§3 ust. 1) wymaga stanu bez śladów użytkowania (§3 ust. 2), a zdjęcie pokazuje ślady użytkowania.\n\n" +
      "## Co widzimy na zdjęciu\n\nUrządzenie nosi widoczne ślady użytkowania.\n\n## Kolejne kroki\n\n- Jeśli któryś z podanych faktów jest nieprawdziwy, napisz tutaj.\n";
    let attempt = 0;
    let called = false;
    for (attempt = 1; attempt <= 3 && !called; attempt++) {
      clearRecording(...names);
      const result = streamText({
        model: provider(names, ["chat"], returnBase, "phone-1.jpg").chat(LLM_MODEL),
        system: `${getPrompt("chat")}\n\n<policy>\n${policyText("return")}\n</policy>\n\n<case>\n${JSON.stringify(caseBlock, null, 2)}\n</case>`,
        messages: [
          { role: "assistant", content: firstMessage },
          { role: "user", content: "Pomyliłem się, kupiłem to w sklepie internetowym, nie stacjonarnym." },
        ],
        tools: {
          revise_decision: tool({
            description: "Revise the preliminary decision when the customer states a new fact.",
            inputSchema: ReviseDecisionInputSchema,
            execute: async (input) => {
              called = true;
              console.log("revise_decision input", JSON.stringify(input));
              return { applied: true, previous: "rejected" };
            },
          }),
        },
        stopWhen: stepCountIs(2),
        providerOptions: reasoning,
        maxRetries: 1,
      });
      const text = await result.text;
      console.log(`llm-chat-tool attempt ${attempt} called=${called}`, text.slice(0, 300));
    }
    console.log("llm-chat-tool tool called:", called);
    expect(attempt).toBeGreaterThan(0);
  });
});
