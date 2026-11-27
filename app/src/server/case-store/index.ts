import "server-only";
import type { CaseInput, Channel, CaseUIMessage, DateFacts, Decision, DecisionOutcome } from "@/lib/domain";
import { getEnv } from "@/server/env";

// ADR-002 §3.4 and ADR-000 §5: in-memory case context, TTL since last access, oldest-evicted cap.
// Text data only; no image bytes.

export interface CaseRevision {
  from: Decision;
  to: Decision;
  reason: string;
  corrections?: { purchaseDate?: string; channel?: Channel };
  at: string;
}

export interface CaseRecord {
  caseId: string;
  createdAt: string;
  input: CaseInput;
  // Narrowed to the classifier and vision schemas by T07/T13.
  classifier: unknown;
  imageAnalysis?: unknown;
  outcome: DecisionOutcome;
  currentDecision: Decision;
  firstMessage: CaseUIMessage;
  facts: DateFacts;
  revisions: CaseRevision[];
}

export interface CaseStoreOptions {
  ttlMs: number;
  maxRecords?: number;
  now?: () => number;
}

export interface CaseStore {
  create(record: CaseRecord): void;
  get(caseId: string): CaseRecord | undefined;
  update(caseId: string, fn: (record: CaseRecord) => CaseRecord): CaseRecord | undefined;
  size(): number;
  clear(): void;
}

interface Entry {
  record: CaseRecord;
  lastAccess: number;
}

export function createCaseStore({ ttlMs, maxRecords = 500, now = () => Date.now() }: CaseStoreOptions): CaseStore {
  const entries = new Map<string, Entry>();

  function sweep(): void {
    const current = now();
    for (const [caseId, entry] of entries) {
      if (current - entry.lastAccess >= ttlMs) entries.delete(caseId);
    }
  }

  function evictOverflow(): void {
    while (entries.size > maxRecords) {
      let oldestId: string | undefined;
      let oldestAccess = Number.POSITIVE_INFINITY;
      for (const [caseId, entry] of entries) {
        if (entry.lastAccess < oldestAccess) {
          oldestAccess = entry.lastAccess;
          oldestId = caseId;
        }
      }
      if (oldestId === undefined) return;
      entries.delete(oldestId);
    }
  }

  return {
    create(record) {
      sweep();
      entries.set(record.caseId, { record, lastAccess: now() });
      evictOverflow();
    },
    get(caseId) {
      sweep();
      const entry = entries.get(caseId);
      if (!entry) return undefined;
      entry.lastAccess = now();
      return entry.record;
    },
    update(caseId, fn) {
      sweep();
      const entry = entries.get(caseId);
      if (!entry) return undefined;
      entry.record = fn(entry.record);
      entry.lastAccess = now();
      return entry.record;
    },
    size() {
      sweep();
      return entries.size;
    },
    clear() {
      entries.clear();
    },
  };
}

type StoreGlobal = typeof globalThis & { __hsdCaseStore?: CaseStore };

export function getCaseStore(): CaseStore {
  const host = globalThis as StoreGlobal;
  host.__hsdCaseStore ??= createCaseStore({ ttlMs: getEnv().CASE_TTL_MS });
  return host.__hsdCaseStore;
}
