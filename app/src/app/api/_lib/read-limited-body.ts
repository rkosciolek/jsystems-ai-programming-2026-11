import "server-only";

/**
 * Reads a request body into memory, never holding more than `limit` bytes.
 * Returns "too_large" (and cancels the stream) as soon as the limit is exceeded, so chunked
 * requests without a Content-Length cannot make the route buffer an unbounded body.
 */
export async function readBodyLimited(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<Uint8Array | "too_large" | null> {
  if (!body) return null;
  const reader = body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        return "too_large";
      }
      parts.push(value);
    }
  } catch {
    return null;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}
