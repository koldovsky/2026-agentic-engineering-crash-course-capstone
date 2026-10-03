export type RawBusinessRequestValidation =
  | { ok: true }
  | { ok: false; message: "Enter a business request." };

const EMPTY_MESSAGE = "Enter a business request." as const;

/**
 * Trim the raw business request and reject only an empty result.
 * Synchronous. No network, no environment variables, no length minimum.
 */
export function validateRawBusinessRequest(
  input: string,
): RawBusinessRequestValidation {
  if (input.trim() === "") {
    return { ok: false, message: EMPTY_MESSAGE };
  }

  return { ok: true };
}
