import "server-only";

const OPENAI_CHAT_COMPLETIONS_URL =
  "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4.1-mini";

const SYSTEM_PROMPT = [
  "Turn one raw business request into a requirement.",
  "Reply with one JSON object only. Do not use markdown. Do not stream.",
  'userStory must be one string in the form "As a ..., I want ..., so that ..." and must contain exactly one story.',
  "acceptanceCriteria must be an array of 1 to 8 short single-line strings.",
  "clarifyingQuestions must be an array of 3 to 5 questions about gaps in the request.",
  "Each clarifying question must contain a question mark.",
  "The JSON object uses the keys userStory, acceptanceCriteria, and clarifyingQuestions.",
].join(" ");

function readMessageContent(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const first = choices[0];
  if (typeof first !== "object" || first === null) {
    return null;
  }

  const message = (first as { message?: unknown }).message;
  if (typeof message !== "object" || message === null) {
    return null;
  }

  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : null;
}

/**
 * One non-streaming Chat Completions POST. Caller supplies the key and the
 * abort signal. This module does not choose a fixture and does not retry.
 */
export async function requestOpenAiCompletion(
  rawRequest: string,
  signal: AbortSignal,
  apiKey: string,
): Promise<unknown> {
  const configuredModel = process.env.LLM_MODEL;
  const model =
    typeof configuredModel === "string" && configuredModel.trim() !== ""
      ? configuredModel.trim()
      : DEFAULT_MODEL;

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    signal,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: rawRequest },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("provider-error");
  }

  const body: unknown = await response.json();
  const content = readMessageContent(body);
  if (content === null) {
    return null;
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}
