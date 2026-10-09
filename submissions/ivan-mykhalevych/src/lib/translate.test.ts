import { describe, expect, it } from "vitest";
import { LANGUAGES } from "./language";
import { DICTIONARIES, plural, translate, translatePlural } from "./translate";
import type { Dictionaries, MessageKey } from "./translate";

const placeholdersOf = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("translate (spec R18)", () => {
  it("fills {name}-style placeholders", () => {
    expect(translate("en", "profile.error.too-long", { max: 24 })).toBe("Use at most 24 characters.");
    expect(translate("uk", "profile.error.too-long", { max: 24 })).toContain("24");
  });

  it("leaves a placeholder untouched when no value is given", () => {
    const dictionaries: Dictionaries = { en: { greet: "Hi {name}" }, uk: { greet: "Привіт, {name}" } };
    expect(translate("en", "greet", {}, dictionaries)).toBe("Hi {name}");
  });

  it("falls back to English when a language lacks the key", () => {
    const dictionaries: Dictionaries = { en: { greet: "Hi {name}" }, uk: {} };
    expect(translate("uk", "greet", { name: "Ann" }, dictionaries)).toBe("Hi Ann");
  });

  it("falls back to the key itself and never throws", () => {
    expect(translate("uk", "no.such.key" as MessageKey)).toBe("no.such.key");
  });
});

describe("plural (spec R18)", () => {
  const forms = { one: "спроба", few: "спроби", many: "спроб", other: "спроби" };

  it("uses one and other in English", () => {
    const en = { one: "attempt", other: "attempts" };
    expect(plural("en", 1, en)).toBe("attempt");
    expect(plural("en", 2, en)).toBe("attempts");
    expect(plural("en", 0, en)).toBe("attempts");
  });

  it("uses one, few, many and other in Ukrainian", () => {
    for (const n of [1, 21, 101]) expect(plural("uk", n, forms), String(n)).toBe("спроба");
    for (const n of [2, 3, 4, 22, 24]) expect(plural("uk", n, forms), String(n)).toBe("спроби");
    for (const n of [0, 5, 11, 12, 14, 20, 25]) expect(plural("uk", n, forms), String(n)).toBe("спроб");
  });

  it("falls back to other when a form is missing", () => {
    expect(plural("uk", 3, { one: "a", other: "b" })).toBe("b");
  });
});

describe("translatePlural (spec R18)", () => {
  it("builds the sentence from the dictionary in each language", () => {
    expect(translatePlural("en", "logs.attempts", 1, { name: "Ann" })).toBe("1 attempt for Ann");
    expect(translatePlural("en", "logs.attempts", 3, { name: "Ann" })).toBe("3 attempts for Ann");
    expect(translatePlural("uk", "logs.attempts", 2, { name: "Ann" })).toBe("2 спроби для Ann");
    expect(translatePlural("uk", "logs.attempts", 5, { name: "Ann" })).toBe("5 спроб для Ann");
    expect(translatePlural("uk", "logs.attempts", 21, { name: "Ann" })).toBe("21 спроба для Ann");
  });
});

describe("dictionaries (spec R18)", () => {
  it("define exactly the same keys in both languages", () => {
    const [english, ...others] = LANGUAGES.map((language) => Object.keys(DICTIONARIES[language]).sort());
    for (const keys of others) expect(keys).toEqual(english);
  });

  it("contain no empty text", () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(DICTIONARIES[language])) {
        expect(text.trim(), `${language}:${key}`).not.toBe("");
      }
    }
  });

  it("use the same placeholders in both languages for every key", () => {
    for (const key of Object.keys(DICTIONARIES.en)) {
      expect(placeholdersOf(DICTIONARIES.uk[key]), key).toEqual(placeholdersOf(DICTIONARIES.en[key]));
    }
  });

  it("are not empty", () => {
    expect(Object.keys(DICTIONARIES.en).length).toBeGreaterThan(40);
  });
});
