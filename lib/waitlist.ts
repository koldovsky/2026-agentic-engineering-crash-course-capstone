import { z } from "zod";

export const EMAIL_REQUIRED_MESSAGE = "Введіть електронну пошту.";
export const EMAIL_INVALID_MESSAGE = "Введіть коректну адресу електронної пошти.";

export const waitlistEmailSchema = z
  .string()
  .trim()
  .min(1, EMAIL_REQUIRED_MESSAGE)
  .pipe(z.email(EMAIL_INVALID_MESSAGE));

export type EmailValidation = { ok: true; email: string } | { ok: false; error: string };

export function validateEmail(value: string): EmailValidation {
  const result = waitlistEmailSchema.safeParse(value);
  if (result.success) return { ok: true, email: result.data };
  return { ok: false, error: result.error.issues[0].message };
}

/** Error to show after an edit: re-validates only while an error is already displayed. */
export function nextErrorOnEdit(currentError: string | null, value: string): string | null {
  if (currentError === null) return null;
  const result = validateEmail(value);
  return result.ok ? null : result.error;
}
