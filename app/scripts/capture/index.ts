import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { z } from "zod";
import type { CaseInput } from "../../src/lib/domain";
import { buildJevRequest, questionSetHash } from "../../src/server/classifier/questions";
import { processImage } from "../../src/server/images";
import { recordingFetch } from "./recorder";

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
});
