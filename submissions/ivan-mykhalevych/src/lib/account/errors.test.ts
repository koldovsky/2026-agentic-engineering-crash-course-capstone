import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "../translate";
import { errorMessageKey } from "./errors";

const CODES = [
  "email-invalid",
  "password-short",
  "password-long",
  "password-common",
  "name-empty",
  "name-too-long",
  "email-taken",
  "invalid-credentials",
  "too-many-attempts",
  "too-many-registrations",
  "forbidden-origin",
  "network-error",
  "not-signed-in",
];

describe("errorMessageKey (spec R27)", () => {
  it("maps every error code of the API to its own translated message", () => {
    const keys = CODES.map(errorMessageKey);
    expect(new Set(keys).size).toBe(CODES.length);
    for (const key of keys) {
      expect(DICTIONARIES.en[key]).toBeTruthy();
      expect(DICTIONARIES.uk[key]).toBeTruthy();
    }
  });

  it("falls back to the generic message for unknown codes", () => {
    expect(errorMessageKey("brand-new-code")).toBe("error.generic");
  });
});
