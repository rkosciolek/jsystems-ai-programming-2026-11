# T21a — independent read-only review

## Findings

### 1. Major — Previous chat messages bypass the 2,000-character limit

**File:** `app/src/app/api/chat/route.ts:44–50`

**Scenario:** A request contains the stored first assistant message, a previous user message with a very large text part, and a valid final one-character user message. The request passes validation: earlier user messages are checked only for having text, while the length limit is applied only to the last message. The oversized history is then forwarded to the model.

**Evidence:** `validateMessages` checks `userMessageText(message) === undefined` for earlier messages but checks the 1–2,000 character limit only for `messages.at(-1)`. `chatStream` converts and forwards the full message history (`app/src/server/llm/chat.ts:143–146`). This violates ADR-002 §3.2, which limits each user message to 1–2,000 characters, and allows unauthenticated requests to inflate model input and cost.

### 2. Major — Client can inject fabricated assistant history into the model context

**File:** `app/src/app/api/chat/route.ts:13–17, 46–47, 67–72`

**Scenario:** A client submits the authentic stored first assistant message at index 0, followed by a fabricated assistant message claiming, for example, that the customer supplied a policy-relevant fact or that the decision has already changed, then a valid user message. The route validates only user-message parts and the index-0 assistant ID; it accepts the extra assistant message and forwards it as conversation history. The chat prompt explicitly uses earlier messages when answering about the case and deciding whether to revise.

**Evidence:** `ChatMessageSchema` permits arbitrary parts, and `validateMessages` imposes no content or provenance check on assistant messages. Only `messages[0]` is replaced with the server-stored message; the remaining client-controlled history is passed to `chatStream`. This undermines the server-held case context and the decision-integrity goal: editing the request can introduce fabricated prior assistant statements for the model to rely on.

### 3. Major — LLM decision guard allows decisions that contradict unusable or mismatched image analysis

**Files:** `app/src/server/rules/index.ts:409–450`; `app/src/server/llm/decide.ts:49–60, 120–127`

**Scenario:** For an in-period case, vision analysis reports `usable: false` or `matchesCategory: false`, while the decision model returns a schema-valid `accepted` outcome. `checkLlmOutcome` does not inspect either image field, so `outcomeViolations` returns no violation and `decide` accepts the output without retrying.

**Evidence:** The guard checks deadline constraints, online-return exclusions, and user-caused complaint damage; its input type is restricted to `Pick<ImageAnalysis, 'damage'>`, so usability and category-match results cannot be checked. PRD AC-20 requires `Wymaga uzupełnienia` for unusable or mismatched images except for the stated expiry/escalation exceptions. The decision prompts state this rule, but the server-side validation does not enforce it.

### 4. Major — `revise_decision` can change a decision without new facts and bypasses return-condition rules

**File:** `app/src/server/llm/chat.ts:185–207`; guard at `app/src/server/rules/index.ts:419–450`

**Scenario:** A return case was rejected because it was bought in-store within 30 days and the classifier or image analysis shows signs of use. The customer asks only for a different decision. If the model calls `revise_decision` with `newDecision: "accepted"` and no corrections, the guard sees no applicable violation: the case is not beyond day 30, the online-withdrawal rejection rule is irrelevant, and the complaint-only damage rule does not apply. Because the decision differs from the current one, `noChange` is false; the server updates the stored decision and emits `data-decision`.

**Evidence:** The tool does not verify that the customer stated a new fact, and `checkLlmOutcome` does not enforce the return policy’s condition-based rules. The prompt says not to revise merely because the customer insists, but the server-side authorization check permits the revision if the model nevertheless calls the tool. This violates PRD §11.3 and the return policy’s §3 conditions, and weakens the decision guard required for revisions in ADR-001 §3.7.