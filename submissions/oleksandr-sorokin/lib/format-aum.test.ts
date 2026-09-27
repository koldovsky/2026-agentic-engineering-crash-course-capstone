import { describe, expect, it } from "vitest";
import { formatAum } from "./format-aum";

describe("formatAum", () => {
  it("formats billions (e.g. 12500 → '$12.5B')", () => {
    expect(formatAum(12500)).toBe("$12.5B");
  });

  it("formats exactly 1B", () => {
    expect(formatAum(1000)).toBe("$1.0B");
  });

  it("formats millions (e.g. 250 → '$250M')", () => {
    expect(formatAum(250)).toBe("$250M");
  });

  it("formats just below the billion threshold (999 → '$999M')", () => {
    expect(formatAum(999)).toBe("$999M");
  });

  it("formats zero as '$0M'", () => {
    expect(formatAum(0)).toBe("$0M");
  });

  it("formats large billions correctly (50000 → '$50.0B')", () => {
    expect(formatAum(50000)).toBe("$50.0B");
  });
});
