import { describe, expect, it } from "vitest";
import { formatPercent } from "./format-percent";

describe("formatPercent", () => {
  it("formats a decimal fraction as a percentage string with two decimal places", () => {
    expect(formatPercent(5.123)).toBe("5.12%");
  });
});
