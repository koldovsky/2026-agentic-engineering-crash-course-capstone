export type EmailResult = { ok: true; email: string } | { ok: false; error: "email-invalid" };
export type PasswordError = "password-short" | "password-long" | "password-common";
export type PasswordResult = { ok: true } | { ok: false; error: PasswordError };
export type DisplayNameError = "name-empty" | "name-too-long";
export type DisplayNameResult = { ok: true; name: string } | { ok: false; error: DisplayNameError };

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_DISPLAY_NAME_LENGTH = 24;

const MIN_EMAIL_LENGTH = 3;
const MAX_EMAIL_LENGTH = 254;

const COMMON_PASSWORDS = new Set([
  "1234567890",
  "0123456789",
  "0000000000",
  "1111111111",
  "password123",
  "password1234",
  "passw0rd123",
  "password!!",
  "qwertyuiop",
  "qwerty12345",
  "1q2w3e4r5t",
  "iloveyou123",
  "admin12345",
  "letmein1234",
  "welcome1234",
  "abc1234567",
  "changeme123",
  "monkey12345",
  "dragon12345",
  "football123",
]);

const INVALID_EMAIL = { ok: false, error: "email-invalid" } as const;

export function validateEmail(raw: string): EmailResult {
  const email = raw.trim().toLowerCase();
  if (email.length < MIN_EMAIL_LENGTH || email.length > MAX_EMAIL_LENGTH || /\s/.test(email)) {
    return INVALID_EMAIL;
  }
  const parts = email.split("@");
  if (parts.length !== 2) return INVALID_EMAIL;
  const [local, domain] = parts;
  if (local === "" || !domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
    return INVALID_EMAIL;
  }
  return { ok: true, email };
}

export function validatePassword(raw: string): PasswordResult {
  if (raw.length < MIN_PASSWORD_LENGTH) return { ok: false, error: "password-short" };
  if (raw.length > MAX_PASSWORD_LENGTH) return { ok: false, error: "password-long" };
  if (COMMON_PASSWORDS.has(raw.toLowerCase())) return { ok: false, error: "password-common" };
  return { ok: true };
}

export function validateDisplayName(raw: string): DisplayNameResult {
  const name = raw.trim();
  if (name === "") return { ok: false, error: "name-empty" };
  if (name.length > MAX_DISPLAY_NAME_LENGTH) return { ok: false, error: "name-too-long" };
  return { ok: true, name };
}
