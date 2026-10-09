import { describe, expect, it } from "vitest";
import { detectLanguage, parseLanguage, resolveLanguage } from "./language";

describe("detectLanguage (spec R17)", () => {
  it("picks the first supported language in the preference list", () => {
    expect(detectLanguage(["ru", "uk-UA"])).toBe("uk");
    expect(detectLanguage(["en-US", "uk"])).toBe("en");
    expect(detectLanguage(["de-DE", "en"])).toBe("en");
    expect(detectLanguage(["uk-UA", "en"])).toBe("uk");
  });

  it("is case-insensitive and uses the primary subtag", () => {
    expect(detectLanguage(["UK"])).toBe("uk");
    expect(detectLanguage(["Uk-ua"])).toBe("uk");
  });

  it("falls back to English for an empty list or no supported entry", () => {
    expect(detectLanguage([])).toBe("en");
    expect(detectLanguage(["fr"])).toBe("en");
    expect(detectLanguage(["fr", "de-AT"])).toBe("en");
  });
});

describe("parseLanguage (spec R17)", () => {
  it("accepts exactly en and uk", () => {
    expect(parseLanguage("en")).toBe("en");
    expect(parseLanguage("uk")).toBe("uk");
  });

  it("rejects everything else", () => {
    expect(parseLanguage("xx")).toBeNull();
    expect(parseLanguage("UK")).toBeNull();
    expect(parseLanguage("")).toBeNull();
    expect(parseLanguage(null)).toBeNull();
  });
});

describe("resolveLanguage (spec R17)", () => {
  it("prefers a valid stored value over the browser language", () => {
    expect(resolveLanguage("uk", ["en"])).toBe("uk");
    expect(resolveLanguage("en", ["uk"])).toBe("en");
  });

  it("uses the browser language when the stored value is missing or invalid", () => {
    expect(resolveLanguage("xx", ["uk"])).toBe("uk");
    expect(resolveLanguage(null, ["uk-UA"])).toBe("uk");
    expect(resolveLanguage(null, ["fr"])).toBe("en");
  });
});
