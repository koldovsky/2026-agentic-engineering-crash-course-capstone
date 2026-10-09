import type { MessageKey } from "../translate";

const ERROR_KEYS: Record<string, MessageKey> = {
  "email-invalid": "error.email-invalid",
  "password-short": "error.password-short",
  "password-long": "error.password-long",
  "password-common": "error.password-common",
  "name-empty": "error.name-empty",
  "name-too-long": "error.name-too-long",
  "email-taken": "error.email-taken",
  "invalid-credentials": "error.invalid-credentials",
  "wrong-password": "error.wrong-password",
  "too-many-attempts": "error.too-many-attempts",
  "too-many-registrations": "error.too-many-registrations",
  "forbidden-origin": "error.forbidden-origin",
  "network-error": "error.network-error",
  "not-signed-in": "error.not-signed-in",
};

export function errorMessageKey(code: string): MessageKey {
  return ERROR_KEYS[code] ?? "error.generic";
}
