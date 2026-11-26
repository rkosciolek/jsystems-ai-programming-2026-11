import "server-only";

import { consumeStream, createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import type { CaseUIMessage } from "@/lib/domain";
import { getCaseStore } from "@/server/case-store";
import { chatStream } from "@/server/llm/chat";

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

type ChatRequest = z.infer<typeof ChatRequestSchema>;

function invalidRequest(): Response {
  return Response.json({ error: "invalid_request" }, { status: 400 });
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

function validateMessages(messages: ChatRequest["messages"]): boolean {
  if (messages.at(-1)?.role !== "user") return false;
  for (const message of messages) {
    if (message.role === "user" && userMessageText(message) === undefined) return false;
  }
  const text = userMessageText(messages.at(-1)!);
  return text !== undefined && text.trim().length >= 1 && text.trim().length <= 2000;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
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
