import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvError, getEnv, parseEnv } from "../../../src/server/env";

const REQUIRED = {
  OPENROUTER_API_KEY: "sk-test-not-a-real-key",
  LLM_MODEL: "openai/test-model",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("parseEnv defaults (ADR-000 section 7)", () => {
  it("fills every optional variable with its documented default", () => {
    const env = parseEnv({ ...REQUIRED });
    expect(env.OPENROUTER_API_KEY).toBe(REQUIRED.OPENROUTER_API_KEY);
    expect(env.LLM_MODEL).toBe(REQUIRED.LLM_MODEL);
    expect(env.VISION_MODEL).toBe(REQUIRED.LLM_MODEL);
    expect(env.JEV_MODEL).toBe("typesafe/jev-1.14");
    expect(env.DECISION_MODE).toBe("auto");
    expect(env.JEV_CONFIDENCE_THRESHOLD).toBe(0.8);
    expect(env.LLM_REASONING_EFFORT).toBe("medium");
    expect(env.CASE_TIMEOUT_MS).toBe(90000);
    expect(env.CASE_TTL_MS).toBe(7200000);
    expect(env.POLICIES_DIR).toBe("../docs/policies");
    expect(env.DECISION_LOG_PATH).toBe("./var/decisions.jsonl");
  });

  it("treats an empty optional variable as missing and uses the default", () => {
    const env = parseEnv({ ...REQUIRED, DECISION_MODE: "" });
    expect(env.DECISION_MODE).toBe("auto");
  });

  it("uses an explicit VISION_MODEL instead of LLM_MODEL", () => {
    const env = parseEnv({ ...REQUIRED, VISION_MODEL: "openai/vision-model" });
    expect(env.VISION_MODEL).toBe("openai/vision-model");
  });

  it("accepts each DECISION_MODE value, including fast-only", () => {
    for (const mode of ["auto", "llm-only", "fast-only"]) {
      expect(parseEnv({ ...REQUIRED, DECISION_MODE: mode }).DECISION_MODE).toBe(mode);
    }
  });

  it("rejects an unknown DECISION_MODE and names the variable", () => {
    expect(() => parseEnv({ ...REQUIRED, DECISION_MODE: "turbo" })).toThrow(EnvError);
    expect(() => parseEnv({ ...REQUIRED, DECISION_MODE: "turbo" })).toThrow(/DECISION_MODE/);
  });
});

describe("parseEnv numeric ranges", () => {
  it("parses a string threshold into a number", () => {
    expect(parseEnv({ ...REQUIRED, JEV_CONFIDENCE_THRESHOLD: "0.85" }).JEV_CONFIDENCE_THRESHOLD).toBe(0.85);
  });

  it.each(["0.5", "0.99"])("accepts the JEV_CONFIDENCE_THRESHOLD boundary %s", (value) => {
    expect(() => parseEnv({ ...REQUIRED, JEV_CONFIDENCE_THRESHOLD: value })).not.toThrow();
  });

  it.each(["1.5", "0.4", "0.995", "high"])("rejects JEV_CONFIDENCE_THRESHOLD=%s and names the variable", (value) => {
    expect(() => parseEnv({ ...REQUIRED, JEV_CONFIDENCE_THRESHOLD: value })).toThrow(/JEV_CONFIDENCE_THRESHOLD/);
  });

  it("rejects CASE_TTL_MS=500 (below 1000) and names the variable", () => {
    expect(() => parseEnv({ ...REQUIRED, CASE_TTL_MS: "500" })).toThrow(/CASE_TTL_MS/);
  });

  it("accepts the CASE_TTL_MS boundaries 1000 and 86400000", () => {
    expect(parseEnv({ ...REQUIRED, CASE_TTL_MS: "1000" }).CASE_TTL_MS).toBe(1000);
    expect(parseEnv({ ...REQUIRED, CASE_TTL_MS: "86400000" }).CASE_TTL_MS).toBe(86400000);
  });

  it("rejects CASE_TTL_MS above 86400000", () => {
    expect(() => parseEnv({ ...REQUIRED, CASE_TTL_MS: "86400001" })).toThrow(/CASE_TTL_MS/);
  });
});

describe("parseEnv missing and invalid variables", () => {
  it("names OPENROUTER_API_KEY when it is missing", () => {
    expect(() => parseEnv({ LLM_MODEL: "openai/test-model" })).toThrow(EnvError);
    expect(() => parseEnv({ LLM_MODEL: "openai/test-model" })).toThrow(/OPENROUTER_API_KEY/);
  });

  it("does not echo a sentinel value passed in another variable", () => {
    const sentinel = "SENTINEL-do-not-leak-4721";
    let message = "";
    try {
      parseEnv({ LLM_MODEL: sentinel });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("OPENROUTER_API_KEY");
    expect(message).not.toContain(sentinel);
  });

  it("names LLM_MODEL when it is missing (TAC-04)", () => {
    expect(() => parseEnv({ OPENROUTER_API_KEY: "sk-test-not-a-real-key" })).toThrow(/LLM_MODEL/);
  });

  it("lists every missing required variable name in one error", () => {
    let message = "";
    try {
      parseEnv({});
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("OPENROUTER_API_KEY");
    expect(message).toContain("LLM_MODEL");
  });

  it("names an invalid variable without echoing its value", () => {
    const sentinel = "SENTINEL-invalid-threshold-7781";
    let message = "";
    try {
      parseEnv({ ...REQUIRED, JEV_CONFIDENCE_THRESHOLD: sentinel });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("JEV_CONFIDENCE_THRESHOLD");
    expect(message).not.toContain(sentinel);
  });
});

describe("getEnv", () => {
  it("parses process.env and caches the result", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", REQUIRED.OPENROUTER_API_KEY);
    vi.stubEnv("LLM_MODEL", "openai/cached-model");
    const { getEnv: freshGetEnv } = await import("../../../src/server/env");
    const first = freshGetEnv();
    expect(first.LLM_MODEL).toBe("openai/cached-model");
    expect(freshGetEnv()).toBe(first);
  });

  it("is exported as a function", () => {
    expect(typeof getEnv).toBe("function");
  });
});
