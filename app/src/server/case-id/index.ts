import "server-only";
import { randomInt } from "node:crypto";
import { todayInWarsaw } from "@/lib/domain";

// ADR-002 §3.1: HSD-YYYYMMDD-XXXX, date in Europe/Warsaw, suffix from [A-Z0-9] via crypto.randomInt.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SUFFIX_LENGTH = 4;
const MAX_ATTEMPTS = 100;

export function generateCaseId(now: Date, exists: (id: string) => boolean): string {
  const date = todayInWarsaw(now).replaceAll("-", "");
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let suffix = "";
    for (let i = 0; i < SUFFIX_LENGTH; i++) {
      suffix += ALPHABET[randomInt(ALPHABET.length)];
    }
    const id = `HSD-${date}-${suffix}`;
    if (!exists(id)) return id;
  }
  throw new Error("Could not generate a free case ID");
}
