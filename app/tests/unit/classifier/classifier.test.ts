import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CaseInput, CaseType } from "@/lib/domain";
import { classify, ClassifierError } from "@/server/classifier";
import { buildJevRequest, questionSetHash } from "@/server/classifier/questions";
import { applyMutation, createReplayFetch, loadRecording, type ReplayFetch } from "../../helpers/replay-fetch";

const photosDir = fileURLToPath(new URL("../../../../assets/example-images/", import.meta.url));
const laptopJpeg = () => readFile(`${photosDir}laptop-1.png`);
const smallJpeg = () => readFile(`${photosDir}phone-2.jpeg`);

function input(caseType: CaseType, description = "The screen has a visible crack after normal use."): CaseInput {
  return {
    caseType,
    category: caseType === "complaint" ? "laptop" : "smartphone",
    model: caseType === "complaint" ? "ThinkPad T14" : "Samsung Galaxy A54",
    purchaseDate: "2025-03-04",
    channel: "online",
    description,
  };
}

async function run(recording: string, caseInput: CaseInput, image?: Buffer, fetch?: ReplayFetch) {
  const replay = fetch ?? createReplayFetch([recording]);
  const result = await classify(caseInput, image ?? (await smallJpeg()), new AbortController().signal, {
    fetch: replay,
    apiKey: "synthetic-test-key",
    model: "typesafe/jev-1.14",
  });
  return { result, replay };
}

describe("Jev classifier client", () => {
  afterEach(() => vi.restoreAllMocks());

  it("normalizes recorded complaint noul, choice and choice certainty from per-answer probabilities", async () => {
    const { result } = await run("jev-complaint-laptop-1", input("complaint"));

    expect(result.model).toBe("typesafe/jev-1.14-20261014");
    expect(result.answers.image_usable).toMatchObject({ value: true, certainty: 0.82 });
    expect(result.answers.device_category).toMatchObject({ value: "laptop", certainty: 1 });
    expect(result.answers.damage_cause).toMatchObject({ value: "impact", certainty: 1 });
    expect(result.answers.description_matches_photo).toMatchObject({ value: true, certainty: 0.54 });
    expect(result.answers.damage_cause?.raw).toMatchObject({ confidence: 1 });
    expect(result.costUsd).toBe(0);
    expect(result.latencyMs).toEqual(expect.any(Number));
  });

  it("normalizes recorded return noul, choice and score answers", async () => {
    const { result } = await run("jev-return-phone-1", input("return", ""));

    expect(result.answers.image_usable).toMatchObject({ value: true, certainty: 0.9 });
    expect(result.answers.device_category).toMatchObject({ value: "smartphone", certainty: 1 });
    expect(result.answers.condition).toMatchObject({ value: 4, certainty: 0.99 });
    expect(result.answers.condition?.raw).toMatchObject({ confidence: 0.99 });
    expect(result.answers.packaging_visible).toMatchObject({ value: false, certainty: 0.87 });
  });

  it("uses choice probability rather than confidence and preserves confidence in raw", async () => {
    const replay = createReplayFetch(["jev-complaint-laptop-1"], {
      mutations: [{
        recordingName: "jev-complaint-laptop-1",
        path: "answers.device_category.confidence",
        value: 0.02,
      }],
    });
    const { result } = await run("jev-complaint-laptop-1", input("complaint"), undefined, replay);

    expect(result.answers.device_category).toMatchObject({
      value: "laptop",
      certainty: 1,
      raw: { confidence: 0.02 },
    });
  });

  it("normalizes noul probability 0.5 as true with certainty 0.5", async () => {
    const replay = createReplayFetch(["jev-complaint-laptop-1"], {
      mutations: [{ recordingName: "jev-complaint-laptop-1", path: "answers.image_usable.noul", value: 0.5 }],
    });
    const { result } = await run("jev-complaint-laptop-1", input("complaint"), await smallJpeg(), replay);

    expect(result.answers.image_usable).toMatchObject({ value: true, certainty: 0.5 });
  });

  it("builds complaint and return request bodies with the correct state and image limit", async () => {
    const replay = createReplayFetch(["jev-complaint-laptop-1", "jev-return-phone-1"]);
    const largeJpeg = await laptopJpeg();
    const complaint = await run("jev-complaint-laptop-1", input("complaint"), largeJpeg, replay);
    const returning = await run("jev-return-phone-1", input("return", ""), await smallJpeg(), replay);
    const complaintRequest = JSON.parse(replay.requests[0]?.body ?? "{}") as Record<string, unknown>;
    const returnRequest = JSON.parse(replay.requests[1]?.body ?? "{}") as Record<string, unknown>;
    const complaintState = complaintRequest.state as [
      { image_url: { url: string } },
      string,
    ];
    const returnState = returnRequest.state as [{ image_url: { url: string } }, string];
    const formState = JSON.parse(complaintState[1]) as Record<string, unknown>;
    const returnFormState = JSON.parse(returnState[1]) as Record<string, unknown>;
    expect(complaintState[0].image_url.url).toMatch(/^data:image\/jpeg;base64,/);
    const outgoingImage = Buffer.from(complaintState[0].image_url.url.slice("data:image/jpeg;base64,".length), "base64");
    const dimensions = await sharp(outgoingImage).metadata();

    expect(complaint.result.answers.damage_cause?.value).toBe("impact");
    expect(returning.result.answers.condition?.value).toBe(4);
    expect(replay.requests[0]).toMatchObject({
      url: "https://openrouter.ai/api/alpha/decisions",
      method: "POST",
    });
    expect(replay.requests[0]?.headers.get("authorization")).toBe("Bearer synthetic-test-key");
    expect(complaintRequest.model).toBe("typesafe/jev-1.14");
    expect(formState).toEqual({
      caseType: "complaint",
      category: "Laptop",
      model: "ThinkPad T14",
      channel: "online",
      description: "The screen has a visible crack after normal use.",
    });
    expect(formState).not.toHaveProperty("purchaseDate");
    expect(returnFormState).toMatchObject({ caseType: "return", description: "" });
    expect(returnFormState).not.toHaveProperty("purchaseDate");
    expect(dimensions.format).toBe("jpeg");
    expect(Math.max(dimensions.width ?? 0, dimensions.height ?? 0)).toBeLessThanOrEqual(1568);

    const complaintQuestions = complaintRequest.questions as Record<string, unknown>;
    const returnQuestions = returnRequest.questions as Record<string, unknown>;
    expect(complaintQuestions).toHaveProperty("damage_cause");
    expect(complaintQuestions).not.toHaveProperty("condition");
    expect(returnQuestions).toHaveProperty("condition");
    expect(returnQuestions).not.toHaveProperty("damage_cause");
    expect(returnQuestions).not.toHaveProperty("description_matches_photo");
    expect(buildJevRequest(input("return", ""), Buffer.alloc(0), "typesafe/jev-1.14").questions).not.toHaveProperty(
      "description_matches_photo",
    );
  });

  it("keeps question-set hashes fresh for both primary recordings", async () => {
    const complaintCapture = await loadRecording("jev-complaint-laptop-1");
    const returnCapture = await loadRecording("jev-return-phone-1");
    const captureJson = async (name: string) => {
      const dir = fileURLToPath(new URL(`../../fixtures/captured/${name}/capture.json`, import.meta.url));
      return JSON.parse(await readFile(dir, "utf8")) as { questionSetHash: string };
    };
    const [complaint, returning] = await Promise.all([
      captureJson("jev-complaint-laptop-1"),
      captureJson("jev-return-phone-1"),
    ]);

    expect(complaint.questionSetHash).toBe(questionSetHash("complaint"));
    expect(returning.questionSetHash).toBe(questionSetHash("return", false));
    expect(complaintCapture.meta.status).toBe(200);
    expect(returnCapture.meta.status).toBe(200);
  });

  it("maps a recorded response with answers removed to invalid_response", async () => {
    const replay = createReplayFetch(["jev-complaint-laptop-1"], {
      mutations: [{ recordingName: "jev-complaint-laptop-1", path: "answers", value: undefined }],
    });

    await expect(run("jev-complaint-laptop-1", input("complaint"), undefined, replay)).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  it.each([
    { recording: "jev-error-unknown-model", status: 400 },
    { recording: "jev-error-401", status: 401 },
  ])("maps recorded HTTP $status from $recording to upstream", async ({ recording, status }) => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(run(recording, input("complaint"))).rejects.toMatchObject({ kind: "upstream" });
    expect(logger).toHaveBeenCalledWith("Jev request failed", status, expect.any(String));
    const [, , loggedBody] = logger.mock.calls[0] ?? [];
    expect(String(loggedBody).length).toBeLessThanOrEqual(500);
  });

  it("maps a network TypeError to upstream", async () => {
    const replay = createReplayFetch(["jev-complaint-laptop-1"], { failWith: "network" });
    await expect(run("jev-complaint-laptop-1", input("complaint"), undefined, replay)).rejects.toMatchObject({
      kind: "upstream",
    });
  });

  it("propagates the pipeline abort reason without mapping it to upstream", async () => {
    const controller = new AbortController();
    controller.abort();
    const replay = createReplayFetch(["jev-complaint-laptop-1"]);

    await expect(
      classify(input("complaint"), await smallJpeg(), controller.signal, {
        fetch: replay,
        apiKey: "synthetic-test-key",
        model: "typesafe/jev-1.14",
      }),
    ).rejects.toBe(controller.signal.reason);
  });

  it("tolerates extra fields present in the real captured response", async () => {
    const { result } = await run("jev-complaint-laptop-1", input("complaint"));
    expect(result.model).toBe("typesafe/jev-1.14-20261014");
  });

  it("exposes a typed classifier error", () => {
    const error = new ClassifierError("timeout");
    expect(error).toBeInstanceOf(Error);
    expect(error.kind).toBe("timeout");
  });

  it("supports applying a declared mutation to a captured exchange", async () => {
    const recording = await loadRecording("jev-complaint-laptop-1");
    const response = JSON.parse(recording.body.toString("utf8")) as Record<string, unknown>;
    const mutated = applyMutation(response, "answers.image_usable.noul", 0.5) as {
      answers: { image_usable: { noul: number } };
    };
    expect(mutated.answers.image_usable.noul).toBe(0.5);
  });
});
