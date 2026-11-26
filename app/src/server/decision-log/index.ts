import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { LOG_FIELDS } from "@/lib/domain";
import { getEnv } from "@/server/env";

// ADR-002 §3.5 and TAC-07: the allowlist serializer copies only LOG_FIELDS, so free text
// (description, chat, image bytes) cannot reach the log. Writes never throw.

export function serializeLogEntry(entry: Record<string, unknown>): string {
  const out: Record<string, unknown> = {};
  for (const key of LOG_FIELDS) {
    if (Object.hasOwn(entry, key) && entry[key] !== undefined) out[key] = entry[key];
  }
  return JSON.stringify(out);
}

export async function logDecision(entry: Record<string, unknown>, path?: string): Promise<void> {
  try {
    const line = serializeLogEntry(entry);
    process.stdout.write(`${line}\n`);
    const target = path ?? getEnv().DECISION_LOG_PATH;
    await mkdir(dirname(target), { recursive: true });
    await appendFile(target, `${line}\n`, "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`decision-log: append failed: ${reason}\n`);
  }
}
