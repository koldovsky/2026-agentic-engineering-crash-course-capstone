import { describe, expect, it } from "vitest";
import { readLimitedText } from "./body";

const post = (body: string) => new Request("http://localhost/api", { method: "POST", body });

describe("readLimitedText (spec R26)", () => {
  it("returns the text of a body within the limit", async () => {
    expect(await readLimitedText(post("abc"), 10)).toBe("abc");
    expect(await readLimitedText(post("1234567890"), 10)).toBe("1234567890");
  });

  it("returns an empty string when there is no body", async () => {
    expect(await readLimitedText(new Request("http://localhost/api"), 10)).toBe("");
  });

  it("returns null when the body is larger than the limit, counting bytes", async () => {
    expect(await readLimitedText(post("x".repeat(11)), 10)).toBeNull();
    expect(await readLimitedText(post("é".repeat(6)), 10)).toBeNull();
  });
});
