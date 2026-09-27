import { transform } from "@/lib/transform";

/**
 * The transform endpoint.
 *
 * This handler holds no transform logic. It reads the body, it validates the body, it calls
 * `lib/transform`, and it answers. It writes no record of the markdown text, because
 * `specs/transform-tool/spec.md` states that the server keeps no copy.
 */

/** The first guard on a public endpoint that accepts text from anyone. */
const MAX_BODY_BYTES = 100 * 1024;

const byteLength = (text: string): number => new TextEncoder().encode(text).length;

const tooLarge = (): Response =>
  Response.json({ error: "The body holds more than 100 KB." }, { status: 413 });

export async function POST(request: Request): Promise<Response> {
  // The declared size is checked first, so a body of any size is refused before this handler
  // reads it into memory. A client controls this header, so it is a cheap guard and not a
  // trusted one.
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return tooLarge();

  const raw = await request.text();

  // The measured size is the guard that holds when the header lies or is missing. It runs
  // before the parse, so an oversized body never reaches JSON.parse and never reaches the
  // transform.
  if (byteLength(raw) > MAX_BODY_BYTES) return tooLarge();

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "The body is not valid JSON." }, { status: 400 });
  }

  const markdown = (body as { markdown?: unknown } | null)?.markdown;
  if (typeof markdown !== "string") {
    return Response.json(
      { error: "markdown: the field is required, and it must be a string." },
      { status: 400 },
    );
  }

  return Response.json(transform(markdown));
}
