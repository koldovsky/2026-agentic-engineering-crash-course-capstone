import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword (spec R22)", () => {
  it("has the scrypt format with the documented parameters", () => {
    expect(hashPassword("correct horse battery")).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  });

  it("uses a fresh salt every time", () => {
    expect(hashPassword("correct horse battery")).not.toBe(hashPassword("correct horse battery"));
  });

  it("does not contain the password", () => {
    expect(hashPassword("correct horse battery")).not.toContain("correct horse battery");
  });
});

describe("verifyPassword (spec R22)", () => {
  const stored = hashPassword("correct horse battery");

  it("accepts the right password and rejects another one", () => {
    expect(verifyPassword("correct horse battery", stored)).toBe(true);
    expect(verifyPassword("correct horse batterY", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("rejects a tampered hash", () => {
    const parts = stored.split("$");
    const last = parts[5];
    parts[5] = (last[0] === "A" ? "B" : "A") + last.slice(1);
    expect(verifyPassword("correct horse battery", parts.join("$"))).toBe(false);
  });

  it.each([
    ["empty", ""],
    ["no separators", "plaintext"],
    ["another algorithm", "bcrypt$16384$8$1$c2FsdA$aGFzaA"],
    ["missing parts", "scrypt$16384$8$1$c2FsdA"],
    ["non-numeric cost", "scrypt$abc$8$1$c2FsdA$aGFzaA"],
    ["absurd cost", "scrypt$99999999999$8$1$c2FsdA$aGFzaA"],
    ["empty salt and hash", "scrypt$16384$8$1$$"],
  ])("returns false and does not throw for a malformed value: %s", (_label, malformed) => {
    expect(verifyPassword("anything at all", malformed)).toBe(false);
  });
});
