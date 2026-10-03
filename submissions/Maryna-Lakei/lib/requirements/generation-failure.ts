export const GENERATION_FAILURE_MESSAGE =
  "Generation failed. You can try Generate again.";

export type GenerationFailureSentenceReason =
  | "empty-input"
  | "missing-key"
  | "provider-error"
  | "timeout"
  | "invalid-payload"
  | null;

export function generationFailureMessage(
  reason: GenerationFailureSentenceReason,
): string | null {
  if (
    reason === "provider-error" ||
    reason === "timeout" ||
    reason === "invalid-payload" ||
    reason === "missing-key"
  ) {
    return GENERATION_FAILURE_MESSAGE;
  }

  return null;
}
