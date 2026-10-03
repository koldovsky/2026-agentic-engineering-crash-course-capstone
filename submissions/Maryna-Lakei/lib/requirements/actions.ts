"use server";

import { generateRequirements, type GenerationResult } from "./generate";

/**
 * One Generate for an already-submitted raw request.
 * Returns the three shapes or a structured failure. Does not throw those
 * outcomes, and the return value has no API key.
 */
export async function generateFromRequest(
  rawRequest: string,
): Promise<GenerationResult> {
  try {
    return await generateRequirements(rawRequest);
  } catch {
    return { ok: false, reason: "provider-error" };
  }
}
