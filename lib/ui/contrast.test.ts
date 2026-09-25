import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastRatio,
  lastShadowColor,
  parseCssColor,
  relativeLuminance,
} from "./contrast";

// ---------------------------------------------------------------------------
// Colour helpers for contrast assertions (specs/button-skins, design D18)
// ---------------------------------------------------------------------------

describe("button-skins: Colour helpers for contrast assertions", () => {
  it("Parsing colours", () => {
    expect(parseCssColor("#fff")).toStrictEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseCssColor("#0a0a0a")).toStrictEqual({ r: 10, g: 10, b: 10, a: 1 });
    expect(parseCssColor("rgb(10, 20, 30)")).toStrictEqual({ r: 10, g: 20, b: 30, a: 1 });
    expect(parseCssColor("rgb(10 20 30)")).toStrictEqual({ r: 10, g: 20, b: 30, a: 1 });
    expect(parseCssColor("rgb(244 114 182 / 0.55)")).toStrictEqual({
      r: 244,
      g: 114,
      b: 182,
      a: 0.55,
    });
    expect(parseCssColor("rgba(0, 0, 0, 0.45)")).toStrictEqual({ r: 0, g: 0, b: 0, a: 0.45 });
    expect(parseCssColor("rgb(0 0 0 / 50%)")).toStrictEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(parseCssColor("transparent")).toStrictEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it.each(["none", "", "red", "linear-gradient(red, blue)", "#ff", "rgb(10, 20)"])(
    "Unparseable values: %j",
    (value) => {
      expect(parseCssColor(value)).toBeNull();
    },
  );

  it("Compositing", () => {
    expect(compositeOver({ r: 0, g: 0, b: 0, a: 0.45 }, { r: 247, g: 247, b: 248, a: 1 })).toStrictEqual(
      { r: 136, g: 136, b: 136, a: 1 },
    );
    expect(
      compositeOver({ r: 244, g: 114, b: 182, a: 0.55 }, { r: 10, g: 10, b: 10, a: 1 }),
    ).toStrictEqual({ r: 139, g: 67, b: 105, a: 1 });
    expect(
      compositeOver({ r: 1, g: 2, b: 3, a: 1 }, { r: 250, g: 250, b: 250, a: 1 }),
    ).toStrictEqual({ r: 1, g: 2, b: 3, a: 1 });
  });

  it("Luminance and contrast of the extremes", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255, a: 1 })).toBe(1);
    expect(relativeLuminance({ r: 0, g: 0, b: 0, a: 1 })).toBe(0);
    expect(contrastRatio({ r: 255, g: 255, b: 255, a: 1 }, { r: 0, g: 0, b: 0, a: 1 })).toBe(21);
    const X = { r: 100, g: 150, b: 200, a: 1 };
    expect(contrastRatio(X, X)).toBe(1);
  });

  it("Contrast is symmetric and composites transparency", () => {
    const fg = { r: 0, g: 0, b: 0, a: 0.45 };
    const bg = { r: 247, g: 247, b: 248, a: 1 };
    const forward = contrastRatio(fg, bg);
    const backward = contrastRatio(bg, fg);
    expect(forward).toBe(backward);
    expect(forward).toBeGreaterThan(2.0);
  });

  it("Reading the last shadow layer", () => {
    expect(lastShadowColor("rgba(0, 0, 0, 0.45) 0px 10px 25px -5px")).toStrictEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 0.45,
    });
    expect(
      lastShadowColor(
        "rgba(255, 255, 255, 0.12) 0px 0px 0px 1px, rgba(244, 114, 182, 0.55) 0px 10px 30px -4px",
      ),
    ).toStrictEqual({ r: 244, g: 114, b: 182, a: 0.55 });
    expect(lastShadowColor("none")).toBeNull();
    expect(lastShadowColor("")).toBeNull();
  });
});
