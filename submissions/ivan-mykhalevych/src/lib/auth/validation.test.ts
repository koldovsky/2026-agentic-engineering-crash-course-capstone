import { describe, expect, it } from "vitest";
import { validateDisplayName, validateEmail, validatePassword } from "./validation";

describe("validateEmail (spec R21)", () => {
  it("trims and lower-cases a valid address", () => {
    expect(validateEmail("  Ann@Example.COM ")).toEqual({ ok: true, email: "ann@example.com" });
  });

  it("accepts the shortest plausible address", () => {
    expect(validateEmail("a@b.co")).toEqual({ ok: true, email: "a@b.co" });
  });

  it.each([
    ["no at sign", "no-at"],
    ["no dot in the domain", "a@b"],
    ["empty local part", "@x.com"],
    ["domain starting with a dot", "a@.com"],
    ["domain ending with a dot", "a@com."],
    ["whitespace inside", "a b@x.com"],
    ["two at signs", "a@@x.com"],
    ["empty text", ""],
    ["only spaces", "   "],
  ])("rejects %s", (_label, raw) => {
    expect(validateEmail(raw)).toEqual({ ok: false, error: "email-invalid" });
  });

  it("rejects an address longer than 254 characters", () => {
    expect(validateEmail(`${"a".repeat(250)}@b.co`)).toEqual({ ok: false, error: "email-invalid" });
  });
});

describe("validatePassword (spec R21)", () => {
  it("rejects 9 characters and accepts 10", () => {
    expect(validatePassword("x7!kQ2mZp")).toEqual({ ok: false, error: "password-short" });
    expect(validatePassword("x7!kQ2mZp9")).toEqual({ ok: true });
  });

  it("accepts 128 characters and rejects 129", () => {
    expect(validatePassword("k".repeat(127) + "9")).toEqual({ ok: true });
    expect(validatePassword("k".repeat(129))).toEqual({ ok: false, error: "password-long" });
  });

  it("rejects very common passwords regardless of case", () => {
    expect(validatePassword("Password123")).toEqual({ ok: false, error: "password-common" });
    expect(validatePassword("1234567890")).toEqual({ ok: false, error: "password-common" });
  });

  it("does not trim the password", () => {
    expect(validatePassword("  short  ")).toEqual({ ok: false, error: "password-short" });
    expect(validatePassword("a b c d e f g")).toEqual({ ok: true });
  });
});

describe("validateDisplayName (spec R21)", () => {
  it("trims a valid name", () => {
    expect(validateDisplayName("  Ann Lee ")).toEqual({ ok: true, name: "Ann Lee" });
  });

  it("rejects an empty name", () => {
    expect(validateDisplayName("   ")).toEqual({ ok: false, error: "name-empty" });
  });

  it("accepts 24 characters and rejects 25", () => {
    expect(validateDisplayName("x".repeat(24))).toMatchObject({ ok: true });
    expect(validateDisplayName("x".repeat(25))).toEqual({ ok: false, error: "name-too-long" });
  });
});
