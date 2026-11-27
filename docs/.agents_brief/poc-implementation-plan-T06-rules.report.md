# T06 — decision rules implementation report

## Files

- `app/src/server/rules/index.ts` — date facts, row-level certainty gate, complaint and return rules, modes, and LLM hard-constraint checks.
- `app/tests/unit/rules/rules.test.ts` — 44 unit tests covering decision rows, date boundaries, gates, modes, hard constraints, and policy deadlines.
- `docs/.agents_brief/poc-implementation-plan-T06-rules.report.md` — this report.

## Red → Green

- **Red (before implementation):** `Error: Cannot find package '@/server/rules' imported from /home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11/app/tests/unit/rules/rules.test.ts` — expected because the rules module did not yet exist; 0 tests ran.
- **Green:** `npx vitest run tests/unit/rules` — 1 test file passed, 44 tests passed. ESLint and TypeScript typecheck passed, as verified by the orchestrator.

## Row and boundary coverage

| Rule / boundary | Test name(s) |
|---|---|
| C1 | `C1 asks for a usable photo`; `fires C1 with a confident image answer without gating on unrelated low-certainty damage_cause` |
| C2 | `C2 detects not_electronics`; `C2 detects a classifier category that differs from the form category` |
| C3 | `C3 escalation precedes every other complaint rule` |
| C3b | `C3b routes a photo-description mismatch to LLM` |
| C4 | `C4 expired complaint precedes an unusable photo`; `does not expire at liabilityEnd, but expires at liabilityEnd + 1 day` |
| C5 | `C5 rejects user-caused damage`; `C5 cites the exact policy subsection for each user-caused damage category` |
| C6 | `C6 accepts a manufacturing defect` |
| C7 | `C7 accepts an invisible defect for service inspection` |
| C8 | `C8 routes normal_wear to LLM` |
| R1 | `R1 requests a usable photo` |
| R2 | `R2 detects a return category mismatch` |
| R3 | `R3 escalates before date or photo rules` |
| R3b | `R3b checks a supplied description-photo mismatch` |
| R4 | `R4 accepts online withdrawal through day 14 in condition 0 or 1` |
| R5 | `R5 accepts online withdrawal with diminished-value note`; `R5 condition 4 carries a complaint hint` |
| R6 | `R6 accepts a condition 0 or 1 voluntary return on day 30` |
| R7 | `R7 rejects condition 2 or worse voluntary return and includes complaint hint for condition 4`; `uses R7 for an in-store day-10 item with condition 2` |
| R8 | `R8 expires before considering a blurry photo or uncertain condition` |
| Age day 14 / 15 / 30 / 31 | `calculates age as calendar days and includes day 14 and day 30`; `has day-14/day-15 and day-30/day-31 return boundaries` |
| Liability end and +1 day | `clamps leap-day liability anniversaries and treats the end date as open`; `marks the complaint liability boundary inclusive and expires it the next day`; `does not expire at liabilityEnd, but expires at liabilityEnd + 1 day` |
| Leap-day clamp (2024-02-29 + 24 months) | `clamps leap-day liability anniversaries and treats the end date as open` |
| Near-deadline flags | `flags only applicable open deadlines within three days` |
| `auto` and always-LLM reasons | `routes all always-LLM cases with a reason` |
| `fast-only` templates | `uses fixed fast-only templates for always-LLM cases, C3b and C8`; `throws RulesClassifierMissingError in fast-only mode when the classifier is missing` |
| `llm-only` shadow result | `always routes llm-only to LLM but returns the fast result as shadow outcome`; `does not report an LLM-routed no-match as a shadow fast decision` |
| Threshold 0.80 inclusive / 0.7999 / custom | `accepts the inclusive 0.80 certainty boundary`; `sends C5 certainty 0.7999 to LLM and records the failed row and uncertain question`; `honors a configured threshold` |
| TAC-001-05 policy values | `keeps the deadline constants aligned with the policy documents` |

## Contradictions

None found across the specified ADR sections, policy documents, domain and environment contracts, and `app/AGENTS.md`.
