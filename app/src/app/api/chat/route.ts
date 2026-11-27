import "server-only";

import { consumeStream, createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import type { CaseUIMessage } from "@/lib/domain";
import { getCaseStore } from "@/server/case-store";
import { chatStream } from "@/server/llm/chat";
import { readBodyLimited } from "../_lib/read-limited-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["assistant", "user"]),
  parts: z.array(z.unknown()),
}).passthrough();

const ChatRequestSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  messages: z.array(ChatMessageSchema).min(1).max(60),
});

const MAX_BODY_BYTES = 512 * 1024;
// Part types the server itself produces in assistant messages (text, revision tool call and result, badge data).
const ASSISTANT_PART_TYPES = new Set(["text", "step-start", "tool-revise_decision", "data-decision"]);

type ChatRequest = z.infer<typeof ChatRequestSchema>;

function invalidRequest(): Response {
  return Response.json({ error: "invalid_request" }, { status: 400 });
}

function payloadTooLarge(): Response {
  return Response.json({ error: "payload_too_large" }, { status: 413 });
}

function userMessageText(message: ChatRequest["messages"][number]): string | undefined {
  if (message.role !== "user" || message.parts.length === 0) return undefined;
  let content = "";
  for (const part of message.parts) {
    if (!part || typeof part !== "object" || !("type" in part) || part.type !== "text" || !("text" in part)) {
      return undefined;
    }
    if (typeof part.text !== "string") return undefined;
    content += part.text;
  }
  return content;
}

function validTrimmedLength(text: string | undefined): boolean {
  return text !== undefined && text.trim().length >= 1 && text.trim().length <= 2000;
}

function assistantPartsAllowed(message: ChatRequest["messages"][number]): boolean {
  return message.parts.every((part) =>
    !!part &&
    typeof part === "object" &&
    "type" in part &&
    typeof part.type === "string" &&
    ASSISTANT_PART_TYPES.has(part.type) &&
    (part.type !== "text" || ("text" in part && typeof part.text === "string")),
  );
}

function validateMessages(messages: ChatRequest["messages"]): boolean {
  if (messages.at(-1)?.role !== "user") return false;
  for (const [index, message] of messages.entries()) {
    if (message.role === "user") {
      if (!validTrimmedLength(userMessageText(message))) return false;
    } else if (index > 0 && !assistantPartsAllowed(message)) {
      return false;
    }
  }
  return true;
}

export async function POST(request: Request): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return payloadTooLarge();
  const bytes = await readBodyLimited(request.body, MAX_BODY_BYTES);
  if (bytes === "too_large") return payloadTooLarge();
  if (bytes === null) return invalidRequest();

  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return invalidRequest();
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success || !validateMessages(parsed.data.messages)) return invalidRequest();

  const record = getCaseStore().get(parsed.data.caseId);
  if (!record) return Response.json({ error: "case_not_found" }, { status: 404 });

  const messages = parsed.data.messages as CaseUIMessage[];
  const firstMessage = messages[0];
  if (firstMessage?.role !== "assistant" || firstMessage.id !== record.firstMessage.id) return invalidRequest();
  messages[0] = record.firstMessage;

  const stream = await chatStream(record, messages, request.signal);
  return createUIMessageStreamResponse({ stream, consumeSseStream: consumeStream });
}
